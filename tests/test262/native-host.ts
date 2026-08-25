#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { jsonSyntaxLineAndColumn, validateJsonSyntax } from "../../src/json-syntax";
import {
    type ModuleRequest,
    moduleRequestFromDeclaration,
    moduleRequestKey,
    staticModuleRequestResolutionError,
} from "../../src/module-request";
import {
    complianceDir,
    hasArgument,
    readJson,
    recordedEnvironment,
    sha256Text,
} from "./model";
import {
    hostProtocolVersion,
    type HostDescription,
    type HostExecutionContract,
    type HostObservation,
    type HostPreparation,
    type HostRequest,
} from "./protocol";

interface HostProfile {
    id: string;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    executionContract: HostExecutionContract;
}

export interface ParseFailure {
    phase: "parse" | "resolution";
    origin: "test-source" | "module-graph" | "setup-script";
    diagnostics: string;
}

interface ModuleImportEntry {
    readonly moduleRequest: ModuleRequest;
    readonly importName: string | "namespace";
}

interface ModuleIndirectExportEntry {
    readonly moduleRequest: ModuleRequest;
    readonly importName: string | "namespace";
}

interface ModuleRecord {
    readonly path: string;
    readonly requestedModules: ModuleRequest[];
    readonly imports: ModuleImportEntry[];
    readonly localExports: Map<string, string>;
    readonly indirectExports: Map<string, ModuleIndirectExportEntry>;
    readonly starExports: ModuleRequest[];
}

type ExportResolution =
    | { readonly modulePath: string; readonly bindingName: string }
    | "ambiguous"
    | null;

interface ControlContext {
    readonly allowReturn: boolean;
    readonly breakableDepth: number;
    readonly iterationDepth: number;
    readonly labels: ReadonlyMap<string, boolean>;
}

function canonicalRelativePath(value: string, label: string): string {
    const segments = value.split("/");
    if (
        value === "" ||
        value.includes("\\") ||
        value.startsWith("/") ||
        segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
        throw new Error(`${label} must be a normalized relative path`);
    }
    return value;
}

function exactSha256(value: string, label: string): void {
    if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} has an invalid SHA-256`);
}

function exactSourceHash(source: string | Uint8Array, expected: string, label: string): void {
    exactSha256(expected, label);
    if (sha256Text(source) !== expected) throw new Error(`${label} bytes differ from the request identity`);
}

function safeDestination(root: string, relative: string): string {
    const destination = path.resolve(root, ...relative.split("/"));
    if (!destination.startsWith(`${path.resolve(root)}${path.sep}`)) {
        throw new Error(`source path escapes the isolated host tree: ${relative}`);
    }
    return destination;
}

async function writeExclusive(root: string, relative: string, content: string | Uint8Array): Promise<string> {
    const destination = safeDestination(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await fs.writeFile(destination, content, { flag: "wx", mode: 0o600 });
    return destination;
}

function earlyControlFlowFailure(sourceFile: ts.SourceFile): string | null {
    const location = (node: ts.Node, message: string): string => {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        return `${sourceFile.fileName}:${start.line + 1}:${start.character + 1}: ${message}\n`;
    };
    const labelsIteration = (statement: ts.Statement): boolean => {
        let target = statement;
        while (ts.isLabeledStatement(target)) target = target.statement;
        return ts.isForStatement(target) ||
            ts.isForInStatement(target) ||
            ts.isForOfStatement(target) ||
            ts.isWhileStatement(target) ||
            ts.isDoStatement(target);
    };
    const simpleAssignmentTarget = (expression: ts.Expression): boolean => {
        while (
            ts.isParenthesizedExpression(expression) ||
            ts.isAsExpression(expression) ||
            ts.isTypeAssertionExpression(expression) ||
            ts.isSatisfiesExpression(expression)
        ) {
            expression = expression.expression;
        }
        return ts.isIdentifier(expression) ||
            ts.isPropertyAccessExpression(expression) ||
            ts.isElementAccessExpression(expression);
    };
    const visitFunction = (node: ts.SignatureDeclaration): string | null => {
        const body = (node as ts.SignatureDeclaration & { body?: ts.ConciseBody }).body;
        if (!body) return null;
        const nested: ControlContext = {
            allowReturn: true,
            breakableDepth: 0,
            iterationDepth: 0,
            labels: new Map(),
        };
        return visit(body, nested);
    };
    const visit = (node: ts.Node, context: ControlContext): string | null => {
        if (ts.isFunctionLike(node)) return visitFunction(node);
        if (ts.isReturnStatement(node) && !context.allowReturn) {
            return location(node, "return statement is not contained in a function body");
        }
        if (ts.isBreakStatement(node)) {
            if (!node.label && context.breakableDepth === 0) {
                return location(node, "break statement is not contained in an iteration or switch statement");
            }
            if (node.label && !context.labels.has(node.label.text)) {
                return location(node, `break target '${node.label.text}' is not an active label`);
            }
        }
        if (ts.isContinueStatement(node)) {
            if (!node.label && context.iterationDepth === 0) {
                return location(node, "continue statement is not contained in an iteration statement");
            }
            if (node.label && context.labels.get(node.label.text) !== true) {
                return location(node, `continue target '${node.label.text}' is not an active iteration label`);
            }
        }
        if (
            (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) &&
            (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
            !simpleAssignmentTarget(node.operand)
        ) {
            return location(node.operand, "update expression operand is not a valid assignment target");
        }
        if (ts.isLabeledStatement(node)) {
            if (context.labels.has(node.label.text)) {
                return location(node.label, `duplicate active label '${node.label.text}'`);
            }
            const labels = new Map(context.labels);
            labels.set(node.label.text, labelsIteration(node.statement));
            return visit(node.statement, { ...context, labels });
        }
        const iteration = ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isWhileStatement(node) ||
            ts.isDoStatement(node);
        const breakable = iteration || ts.isSwitchStatement(node);
        const childContext = iteration || breakable
            ? {
                ...context,
                breakableDepth: context.breakableDepth + (breakable ? 1 : 0),
                iterationDepth: context.iterationDepth + (iteration ? 1 : 0),
            }
            : context;
        let failure: string | null = null;
        ts.forEachChild(node, (child) => {
            if (!failure) failure = visit(child, childContext);
        });
        return failure;
    };
    return visit(sourceFile, {
        allowReturn: false,
        breakableDepth: 0,
        iterationDepth: 0,
        labels: new Map(),
    });
}

function parseFailure(
    source: string,
    filename: string,
    phase: ParseFailure["phase"],
    origin: ParseFailure["origin"],
    goal: "script" | "module",
): ParseFailure | null {
    const sourceFile = createEcmaSourceFile(
        filename,
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
    const diagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
        .parseDiagnostics ?? [];
    const goalMismatch = goal === "script" && sourceFile.statements.find((statement) =>
        ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement) ||
        ts.isExportAssignment(statement) ||
        ts.isNamespaceExportDeclaration(statement)
    );
    const controlFailure = diagnostics.length === 0 && !goalMismatch
        ? earlyControlFlowFailure(sourceFile)
        : null;
    if (diagnostics.length === 0 && !goalMismatch && !controlFailure) return null;
    const formatted = controlFailure ?? (diagnostics.length > 0
        ? diagnostics.map((diagnostic) => {
            const start = diagnostic.start ?? 0;
            const location = sourceFile.getLineAndCharacterOfPosition(start);
            return `${filename}:${location.line + 1}:${location.character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
        }).join("\n")
        : `${filename}:1:1: import/export syntax is not valid under the Script parse goal`);
    return { phase, origin, diagnostics: formatted.endsWith("\n") ? formatted : `${formatted}\n` };
}

function resolveRequestModulePath(importer: string, specifier: string): string | null {
    if (!(specifier.startsWith("./") || specifier.startsWith("../"))) return null;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
    try {
        return canonicalRelativePath(resolved, "resolved module path");
    } catch {
        return null;
    }
}

function moduleName(name: ts.ModuleExportName): string {
    return name.text;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false);
}

function bindingNames(name: ts.BindingName): string[] {
    if (ts.isIdentifier(name)) return [name.text];
    const result: string[] = [];
    for (const element of name.elements) {
        if (ts.isOmittedExpression(element)) continue;
        result.push(...bindingNames(element.name));
    }
    return result;
}

function moduleRecord(source: string, filename: string): { record: ModuleRecord | null; error: string | null } {
    const sourceFile = createEcmaSourceFile(
        filename,
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
    const requestedModules = new Map<string, ModuleRequest>();
    const declarationRequests = new Map<ts.ImportDeclaration | ts.ExportDeclaration, ModuleRequest>();
    const imports: ModuleImportEntry[] = [];
    const importedLocals = new Map<string, ModuleImportEntry>();
    const localExports = new Map<string, string>();
    const indirectExports = new Map<string, ModuleIndirectExportEntry>();
    const starExports: ModuleRequest[] = [];
    let error: string | null = null;

    const addRequested = (declaration: ts.ImportDeclaration | ts.ExportDeclaration): ModuleRequest | null => {
        const parsed = moduleRequestFromDeclaration(declaration);
        if (!parsed) return null;
        if (parsed.request === null) {
            const location = sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile));
            error ??= `${filename}:${location.line + 1}:${location.character + 1}: ${parsed.error}`;
            return null;
        }
        const key = moduleRequestKey(parsed.request);
        const canonical = requestedModules.get(key) ?? parsed.request;
        requestedModules.set(key, canonical);
        declarationRequests.set(declaration, canonical);
        return canonical;
    };
    const addImport = (localName: string, entry: ModuleImportEntry): void => {
        imports.push(entry);
        importedLocals.set(localName, entry);
    };
    const addExplicitExport = (
        exportName: string,
        localName: string | null,
        indirect: ModuleIndirectExportEntry | null,
    ): void => {
        if (localExports.has(exportName) || indirectExports.has(exportName)) {
            error ??= `duplicate explicit export ${JSON.stringify(exportName)}`;
            return;
        }
        if (indirect) indirectExports.set(exportName, indirect);
        else localExports.set(exportName, localName!);
    };

    // Imported local bindings are collected first because a later `export { x }`
    // is normalized to the same indirect binding as `export { x } from ...`.
    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
            const moduleRequest = addRequested(statement);
            if (!moduleRequest || !statement.importClause) continue;
            if (statement.importClause.name) {
                addImport(statement.importClause.name.text, { moduleRequest, importName: "default" });
            }
            const bindings = statement.importClause.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings)) {
                addImport(bindings.name.text, { moduleRequest, importName: "namespace" });
            } else if (bindings) {
                for (const element of bindings.elements) {
                    addImport(element.name.text, {
                        moduleRequest,
                        importName: moduleName(element.propertyName ?? element.name),
                    });
                }
            }
        } else if (ts.isExportDeclaration(statement)) {
            addRequested(statement);
        }
    }

    for (const statement of sourceFile.statements) {
        if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
            addExplicitExport("default", "*default*", null);
            continue;
        }
        if (ts.isExportDeclaration(statement)) {
            const moduleRequest = declarationRequests.get(statement) ?? null;
            if (!statement.exportClause) {
                if (moduleRequest) starExports.push(moduleRequest);
                continue;
            }
            if (ts.isNamespaceExport(statement.exportClause)) {
                if (moduleRequest) {
                    addExplicitExport(moduleName(statement.exportClause.name), null, {
                        moduleRequest,
                        importName: "namespace",
                    });
                }
                continue;
            }
            for (const element of statement.exportClause.elements) {
                const exportName = moduleName(element.name);
                const importOrLocalName = moduleName(element.propertyName ?? element.name);
                if (moduleRequest) {
                    addExplicitExport(exportName, null, { moduleRequest, importName: importOrLocalName });
                } else {
                    const imported = importedLocals.get(importOrLocalName);
                    addExplicitExport(exportName, imported ? null : importOrLocalName, imported ?? null);
                }
            }
            continue;
        }
        if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
        const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
        if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
            const localName = statement.name?.text ?? "*default*";
            addExplicitExport(isDefault ? "default" : localName, localName, null);
        } else if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                for (const localName of bindingNames(declaration.name)) {
                    addExplicitExport(localName, localName, null);
                }
            }
        }
    }

    return {
        record: error ? null : {
            path: filename,
            requestedModules: [...requestedModules.values()],
            imports,
            localExports,
            indirectExports,
            starExports,
        },
        error,
    };
}

function jsonModuleRecord(source: string, filename: string): { record: ModuleRecord | null; error: string | null } {
    const syntax = validateJsonSyntax(source);
    if (syntax) {
        const location = jsonSyntaxLineAndColumn(source, syntax);
        return {
            record: null,
            error: `${filename}:${location.line + 1}:${location.column + 1}: invalid JSON module: ${syntax.message}`,
        };
    }
    return {
        record: {
            path: filename,
            requestedModules: [],
            imports: [],
            localExports: new Map([["default", "*default*"]]),
            indirectExports: new Map(),
            starExports: [],
        },
        error: null,
    };
}

function moduleResolutionFailure(filename: string, detail: string): ParseFailure {
    return {
        phase: "resolution",
        origin: "module-graph",
        diagnostics: `${filename}:1:1: ${detail}\n`,
    };
}

function resolvedModule(
    records: ReadonlyMap<string, ModuleRecord>,
    importer: ModuleRecord,
    request: ModuleRequest,
): ModuleRecord | null {
    const resolved = resolveRequestModulePath(importer.path, request.specifier);
    return resolved ? records.get(resolved) ?? null : null;
}

function sameResolution(left: Exclude<ExportResolution, "ambiguous" | null>, right: typeof left): boolean {
    return left.modulePath === right.modulePath && left.bindingName === right.bindingName;
}

function resolveExport(
    records: ReadonlyMap<string, ModuleRecord>,
    record: ModuleRecord,
    exportName: string,
    resolveSet: Set<string> = new Set(),
): ExportResolution {
    const key = `${record.path}\0${exportName}`;
    if (resolveSet.has(key)) return null;
    resolveSet.add(key);

    const localName = record.localExports.get(exportName);
    if (localName !== undefined) return { modulePath: record.path, bindingName: localName };

    const indirect = record.indirectExports.get(exportName);
    if (indirect) {
        const imported = resolvedModule(records, record, indirect.moduleRequest);
        if (!imported) return null;
        return indirect.importName === "namespace"
            ? { modulePath: imported.path, bindingName: "*namespace*" }
            : resolveExport(records, imported, indirect.importName, resolveSet);
    }

    if (exportName === "default") return null;
    let starResolution: Exclude<ExportResolution, "ambiguous" | null> | null = null;
    for (const moduleRequest of record.starExports) {
        const imported = resolvedModule(records, record, moduleRequest);
        if (!imported) return null;
        const resolution = resolveExport(records, imported, exportName, resolveSet);
        if (resolution === "ambiguous") return resolution;
        if (resolution === null) continue;
        if (starResolution === null) starResolution = resolution;
        else if (!sameResolution(starResolution, resolution)) return "ambiguous";
    }
    return starResolution;
}

/** Analyze one complete, attested Module resource graph. The source-derived
 * graph and the two graph algorithms are independent of fixture count/depth. */
export function analyzeModuleGraph(
    rootPath: string,
    sources: ReadonlyMap<string, string>,
): ParseFailure | null {
    const records = new Map<string, ModuleRecord>();
    const createRecord = (filename: string, root: boolean): ParseFailure | null => {
        const source = sources.get(filename);
        if (source === undefined) return moduleResolutionFailure(
            filename,
            "requested module source is absent from the attested resource directory",
        );
        const json = /\.json$/i.test(filename);
        if (!json) {
            const syntax = parseFailure(
                source,
                filename,
                root ? "parse" : "resolution",
                root ? "test-source" : "module-graph",
                "module",
            );
            if (syntax) return syntax;
        }
        const parsed = json ? jsonModuleRecord(source, filename) : moduleRecord(source, filename);
        if (parsed.error || !parsed.record) {
            return root
                ? {
                    phase: "parse",
                    origin: "test-source",
                    diagnostics: `${parsed.error ?? `${filename}:1:1: invalid Module record`}\n`,
                }
                : parsed.error
                    ? {
                        phase: "resolution",
                        origin: "module-graph",
                        diagnostics: `${parsed.error}\n`,
                    }
                    : moduleResolutionFailure(filename, "invalid Module record");
        }
        records.set(filename, parsed.record);
        return null;
    };

    const rootFailure = createRecord(rootPath, true);
    if (rootFailure) return rootFailure;

    // Parse and resolve the reachable graph in source/depth-first order using
    // explicit frames, so cycles and representative deep graphs share one path.
    const discovery = [{ record: records.get(rootPath)!, next: 0 }];
    while (discovery.length > 0) {
        const frame = discovery[discovery.length - 1]!;
        if (frame.next >= frame.record.requestedModules.length) {
            discovery.pop();
            continue;
        }
        const request = frame.record.requestedModules[frame.next++]!;
        const dependencyPath = resolveRequestModulePath(frame.record.path, request.specifier);
        if (!dependencyPath || !sources.has(dependencyPath)) {
            return moduleResolutionFailure(
                frame.record.path,
                `cannot resolve attested module specifier ${JSON.stringify(request.specifier)}`,
            );
        }
        const requestError = staticModuleRequestResolutionError(request, dependencyPath);
        if (requestError) {
            return moduleResolutionFailure(
                frame.record.path,
                `${requestError} for ${JSON.stringify(request.specifier)}`,
            );
        }
        if (records.has(dependencyPath)) continue;
        const failure = createRecord(dependencyPath, false);
        if (failure) return failure;
        discovery.push({ record: records.get(dependencyPath)!, next: 0 });
    }

    // ModuleDeclarationInstantiation is another explicit DFS worklist. Each
    // reachable record is validated after all of its requested modules.
    const states = new Map<string, "visiting" | "done">();
    const instantiation = [{ record: records.get(rootPath)!, next: 0 }];
    states.set(rootPath, "visiting");
    while (instantiation.length > 0) {
        const frame = instantiation[instantiation.length - 1]!;
        if (frame.next < frame.record.requestedModules.length) {
            const request = frame.record.requestedModules[frame.next++]!;
            const dependency = resolvedModule(records, frame.record, request)!;
            if (!states.has(dependency.path)) {
                states.set(dependency.path, "visiting");
                instantiation.push({ record: dependency, next: 0 });
            }
            continue;
        }
        for (const [exportName] of frame.record.indirectExports) {
            const resolution = resolveExport(records, frame.record, exportName);
            if (resolution === null || resolution === "ambiguous") {
                return moduleResolutionFailure(
                    frame.record.path,
                    `cannot resolve indirect export ${JSON.stringify(exportName)}`,
                );
            }
        }
        for (const entry of frame.record.imports) {
            if (entry.importName === "namespace") continue;
            const imported = resolvedModule(records, frame.record, entry.moduleRequest)!;
            const resolution = resolveExport(records, imported, entry.importName);
            if (resolution === null || resolution === "ambiguous") {
                return moduleResolutionFailure(
                    frame.record.path,
                    `cannot resolve imported binding ${JSON.stringify(entry.importName)}`,
                );
            }
        }
        states.set(frame.record.path, "done");
        instantiation.pop();
    }
    return null;
}

function moduleGraphFailure(request: HostRequest): ParseFailure | null {
    if (request.goal !== "module") return null;
    const sources = new Map<string, string>([[request.testPath, request.testSource]]);
    for (const file of request.moduleFiles) {
        if (!/\.(?:[cm]?js|json)$/i.test(file.path)) continue;
        sources.set(file.path, Buffer.from(file.data, "base64").toString("utf8"));
    }
    return analyzeModuleGraph(request.testPath, sources);
}

function validateRequest(request: HostRequest): void {
    if (
        request.protocolVersion !== hostProtocolVersion ||
        typeof request.scenarioId !== "string" || request.scenarioId === "" ||
        !(request.mode === "sloppy" || request.mode === "strict" || request.mode === "module" || request.mode === "raw") ||
        !(request.goal === "script" || request.goal === "module") ||
        request.goal !== (request.mode === "module" ? "module" : "script") ||
        typeof request.raw !== "boolean" ||
        typeof request.async !== "boolean" ||
        !(request.canBlock === null || typeof request.canBlock === "boolean") ||
        !Number.isSafeInteger(request.timeoutMs) || request.timeoutMs <= 0 ||
        !path.isAbsolute(request.artifactDirectory)
    ) {
        throw new Error("invalid Test262 native-host request identity");
    }
    canonicalRelativePath(request.testPath, "testPath");
    if (request.moduleBasePath !== path.posix.dirname(request.testPath)) {
        throw new Error("moduleBasePath differs from the canonical test directory");
    }
    exactSourceHash(request.testSource, request.testSourceSha256, "test source");
    if (request.raw && request.setupScripts.length !== 0) {
        throw new Error("raw requests must not contain setup scripts");
    }
    const occupied = new Set<string>([request.testPath]);
    for (const script of request.setupScripts) {
        canonicalRelativePath(script.path, "setup script path");
        if (occupied.has(script.path)) throw new Error(`duplicate request source path ${script.path}`);
        occupied.add(script.path);
        exactSourceHash(script.source, script.sha256, `setup script ${script.path}`);
    }
    let previousModulePath = "";
    for (const moduleFile of request.moduleFiles) {
        canonicalRelativePath(moduleFile.path, "module file path");
        if (moduleFile.encoding !== "base64" || occupied.has(moduleFile.path)) {
            throw new Error(`invalid or duplicate module resource ${moduleFile.path}`);
        }
        if (previousModulePath !== "" && previousModulePath.localeCompare(moduleFile.path) >= 0) {
            throw new Error("module resource paths must be unique and sorted");
        }
        previousModulePath = moduleFile.path;
        occupied.add(moduleFile.path);
        const bytes = Buffer.from(moduleFile.data, "base64");
        if (bytes.toString("base64") !== moduleFile.data) {
            throw new Error(`module resource ${moduleFile.path} has non-canonical base64`);
        }
        exactSourceHash(bytes, moduleFile.sha256, `module resource ${moduleFile.path}`);
    }
}

async function requireEmptyArtifactDirectory(directory: string): Promise<void> {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error("runner-owned artifact root is not a regular directory");
    }
    if ((await fs.readdir(directory)).length !== 0) {
        throw new Error("runner-owned artifact root is not empty");
    }
}

async function artifactPaths(root: string): Promise<string[]> {
    const result: string[] = [];
    const worklist = [root];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const absolute = path.join(current, entry.name);
            const stat = await fs.lstat(absolute);
            if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
                throw new Error("native host produced a symbolic-link artifact");
            }
            if (entry.isDirectory() && stat.isDirectory()) {
                worklist.push(absolute);
            } else if (entry.isFile() && stat.isFile()) {
                result.push(path.relative(root, absolute).split(path.sep).join("/"));
            } else {
                throw new Error("native host produced a non-regular artifact");
            }
        }
    }
    return result.sort((left, right) => left.localeCompare(right));
}

async function compilerErrorPreparation(
    request: HostRequest,
    failure: ParseFailure,
): Promise<HostPreparation> {
    const diagnosticsPath = "diagnostics.txt";
    await fs.writeFile(path.join(request.artifactDirectory, diagnosticsPath), failure.diagnostics, { flag: "wx", mode: 0o400 });
    const observation: HostObservation = {
        protocolVersion: hostProtocolVersion,
        scenarioId: request.scenarioId,
        kind: "throw",
        phase: failure.phase,
        origin: failure.origin,
        errorConstructor: "SyntaxError",
    };
    return {
        protocolVersion: hostProtocolVersion,
        scenarioId: request.scenarioId,
        kind: "compiler-error",
        compileExitCode: 2,
        diagnosticsPath,
        artifactPaths: [diagnosticsPath],
        observation,
    };
}

export async function prepareNativeRequest(request: HostRequest): Promise<HostPreparation> {
    validateRequest(request);
    await requireEmptyArtifactDirectory(request.artifactDirectory);

    for (const script of request.setupScripts) {
        const failure = parseFailure(script.source, script.path, "parse", "setup-script", "script");
        if (failure) return compilerErrorPreparation(request, failure);
    }
    const rootFailure = parseFailure(request.testSource, request.testPath, "parse", "test-source", request.goal);
    if (rootFailure) return compilerErrorPreparation(request, rootFailure);
    const dependencyFailure = moduleGraphFailure(request);
    if (dependencyFailure) return compilerErrorPreparation(request, dependencyFailure);

    const sourceRoot = await fs.mkdtemp(path.join(path.dirname(request.artifactDirectory), "sources-"));
    try {
        const setupEntries: string[] = [];
        for (const script of request.setupScripts) {
            setupEntries.push(await writeExclusive(sourceRoot, script.path, script.source));
        }
        const testEntry = await writeExclusive(sourceRoot, request.testPath, request.testSource);
        const moduleRoots: string[] = request.goal === "module" ? [testEntry] : [];
        for (const moduleFile of request.moduleFiles) {
            const bytes = Buffer.from(moduleFile.data, "base64");
            const filename = await writeExclusive(sourceRoot, moduleFile.path, bytes);
            if (/\.[cm]?js$/i.test(moduleFile.path)) moduleRoots.push(filename);
        }

        const buildDirectory = path.join(request.artifactDirectory, "build");
        const executable = path.join(request.artifactDirectory, "program");
        let diagnostics = "";
        const result = await compile({
            entry: testEntry,
            output: executable,
            buildDir: buildDirectory,
            additionalRoots: setupEntries,
            initializationEntries: [...setupEntries, testEntry],
            moduleRoots,
            ignoreCheckJsDirectiveRoots: [...new Set([...setupEntries, testEntry, ...moduleRoots])],
            test262Observation: {
                kind: "test262-native-observation",
                scenarioId: request.scenarioId,
                setupEntries,
                testEntry,
                async: request.async,
            },
            diagnosticWriter: (message) => {
                diagnostics += message;
            },
        });
        if (result.exitCode !== 0) {
            const detail = diagnostics.trim() || `tsc2c compilation exited ${result.exitCode}`;
            return {
                protocolVersion: hostProtocolVersion,
                scenarioId: request.scenarioId,
                kind: "diagnostic-observation",
                observation: {
                    protocolVersion: hostProtocolVersion,
                    scenarioId: request.scenarioId,
                    kind: "unsupported",
                    detail: detail.slice(0, 16_384),
                },
            };
        }
        const artifacts = await artifactPaths(request.artifactDirectory);
        const generatedCPath = path.relative(request.artifactDirectory, path.join(buildDirectory, "main.c"))
            .split(path.sep).join("/");
        const executablePath = path.relative(request.artifactDirectory, executable).split(path.sep).join("/");
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "prepared-native",
            compileExitCode: 0,
            generatedCPath,
            executablePath,
            artifactPaths: artifacts,
        };
    } finally {
        await fs.rm(sourceRoot, { recursive: true, force: true });
    }
}

async function profileDescription(): Promise<HostDescription> {
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    return {
        protocolVersion: hostProtocolVersion,
        profileId: profile.id,
        semanticDelegation: profile.semanticDelegation,
        capabilities: profile.capabilities,
        executionContract: profile.executionContract,
        effectiveEnvironmentSha256: sha256Text(JSON.stringify(recordedEnvironment(process.env))),
    };
}

async function main(): Promise<void> {
    if (hasArgument("--describe")) {
        console.log(JSON.stringify(await profileDescription()));
        return;
    }
    const requestIndex = process.argv.indexOf("--request");
    const requestPath = requestIndex < 0 ? undefined : process.argv[requestIndex + 1];
    const input = requestPath ? await fs.readFile(requestPath, "utf8") : await Bun.stdin.text();
    const request = JSON.parse(input) as HostRequest;
    console.log(JSON.stringify(await prepareNativeRequest(request)));
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
