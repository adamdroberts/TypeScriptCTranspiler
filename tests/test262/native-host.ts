#!/usr/bin/env bun
import { earlyPrivateStaticSemanticsFailure } from "../../src/emit/private-names";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { earlyControlFlowFailure } from "../../src/control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "../../src/function-static-semantics";
import { createEcmaSourceFile, ecmaParseGoal, ecmaDirectivePrologueHasUseStrict, type EcmaParseGoal } from "../../src/ecmascript-source";
import { jsonSyntaxLineAndColumn, validateJsonSyntax } from "../../src/json-syntax";
import {
    type ModuleRequest,
    moduleRequestFromDeclaration,
    moduleRequestKey,
    staticModuleRequestResolutionError,
} from "../../src/module-request";
import { evaluationSourceRequests, sourceFileIsStrict, evalSourceIsValid, evalSourceKey, type EvalSourceRequest } from "../../src/eval-source";
import {
    bindingNames,
    earlyModuleStaticSemanticsFailure,
} from "../../src/module-static-semantics";
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

export interface FiniteEvalScriptSourceGraph {
    readonly agentSources: readonly string[];
    readonly sources: readonly string[];
    readonly scriptSources: readonly { readonly source: string; readonly domain?: string }[];
    readonly indirectEvalSources: readonly {
        readonly source: string;
        readonly strict: boolean;
        readonly domain?: string;
    }[];
    readonly directEvalSources: readonly {
        readonly source: string;
        readonly strictCaller: boolean;
        readonly strict: boolean;
        readonly domain?: string;
    }[];
    readonly error: string | null;
}

/** Eval and dynamic Function construction consume the same source-owned
 * value/location/List graph. Extend its exact-source records to a fixed point;
 * source bindings remain isolated exactly as in native Script compilation. */
export function finiteEvalScriptSourceGraph(
    roots: readonly { readonly path: string; readonly source: string; readonly goal?: EcmaParseGoal }[],
    moduleSources: readonly { readonly path: string; readonly source: string; readonly goal?: EcmaParseGoal }[] = [],
): FiniteEvalScriptSourceGraph {
    const requests = new Map<string, EvalSourceRequest>();
    const records: Array<{path:string;source:string;goal?:EcmaParseGoal;root?:boolean;strictContext?:boolean;evaluation?:boolean;kind?:string;domain?:string}> = [
        ...moduleSources.map(record => ({...record,goal:record.goal ?? "module" as const})),
        ...roots.map(root => ({...root,root:true})),
    ];
    for (;;) {
        const byPath = new Map(records.map(record => [path.resolve(record.path),record]));
        const options: ts.CompilerOptions = {noLib:true,allowJs:true,noEmit:true,target:ts.ScriptTarget.ESNext};
        const host = ts.createCompilerHost(options);
        const directories = new Set<string>();
        for (const filename of byPath.keys()) {
            let directory = path.dirname(filename);
            while (!directories.has(directory)) {
                directories.add(directory);
                const parent = path.dirname(directory);
                if (parent === directory) break;
                directory = parent;
            }
        }
        host.directoryExists = directory => directories.has(path.resolve(directory));
        host.getSourceFile = filename => {
            const record = byPath.get(path.resolve(filename));
            if (!record) return undefined;
            const file = createEcmaSourceFile(filename,record.source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,record.goal);
            (file as ts.SourceFile & {externalModuleIndicator?:ts.Node}).externalModuleIndicator ??= file;
            return file;
        };
        host.fileExists = filename => byPath.has(path.resolve(filename));
        host.readFile = filename => byPath.get(path.resolve(filename))?.source;
        const program = ts.createProgram([...byPath].filter(([,record])=>record.root).map(([filename])=>filename),options,host);
        const before = records.length;
        let unresolved: string | null = null;
        const projected = evaluationSourceRequests(program, {roots:roots.map(root=>path.resolve(root.path)), evaluations: records.filter(record => record.evaluation)
            .map(record => ({source:record.source,entry:path.resolve(record.path),kind:record.kind,domain:record.domain})) },
            new Map(records.filter(record => record.strictContext !== undefined).map(record => [path.resolve(record.path), record.strictContext!])));
        for (const invocation of projected.unresolved) {
            if (invocation.operation === "eval" && !invocation.direct) continue;
            const file = invocation.node.getSourceFile(), record = byPath.get(path.resolve(file.fileName))!;
            const location = file.getLineAndCharacterOfPosition(invocation.node.getStart(file));
            const label = invocation.operation === "agent-start" ? "agent.start" : invocation.operation === "eval-script" ? "evalScript" : "direct eval";
            unresolved ??= `${record.path}:${location.line+1}:${location.character+1}: ${label} source is not a finite static string expression`;
        }
        for (const request of projected.requests) {
            const {source, strict, strictCaller,domain} = request;
            const key = evalSourceKey(request);
            if (requests.has(key)) continue;
            requests.set(key, request);
            if (request.kind === "agent") {
                records.push({path:`__tsc2c_agent__/${sha256Text(JSON.stringify(source))}.js`,source,goal:"script",root:true,evaluation:true,kind:"agent"});
            } else if (request.kind === "script") {
                records.push({path:`__tsc2c_eval_script__/${sha256Text(JSON.stringify([source,domain]))}.js`,source,goal:"script",root:true,evaluation:true,kind:"script",domain});
            } else if (request.kind === "direct") {
                records.push({path:`__tsc2c_direct_eval__/${strictCaller ? "strict" : "sloppy"}/${sha256Text(JSON.stringify([source,domain]))}.js`,source,goal:"script",
                    strictContext:strict,root:true,evaluation:true,kind:"direct",domain});
            } else {
                records.push({path:`__tsc2c_indirect_eval__/${strict ? "strict" : "sloppy"}/${sha256Text(JSON.stringify([source,domain]))}.js`,source,goal:"script",
                    strictContext:strict,root:true,evaluation:true,kind:"indirect",domain});
            }
        }
        if (records.length === before) {
            if (unresolved) return {agentSources:[],sources:[],scriptSources:[],directEvalSources:[],indirectEvalSources:[],error:unresolved};
            break;
        }
    }
    const values = [...requests.values()].sort((left,right)=>evalSourceKey(left).localeCompare(evalSourceKey(right)));
    return {agentSources:values.filter(value=>value.kind==="agent").map(value=>value.source),
        sources:[...new Set(values.filter(value=>value.kind==="script").map(value=>value.source))].sort(),
        scriptSources:values.filter(value=>value.kind==="script").map(({source,domain})=>({source,...(domain?{domain}:{})})),
        indirectEvalSources:values.filter(value=>value.kind==="indirect").map(({source,strict,domain})=>({source,strict,...(domain?{domain}:{})})),
        directEvalSources:values.filter(value=>value.kind==="direct").map(({source,strictCaller,strict,domain})=>({source,strictCaller,strict,...(domain?{domain}:{})})),error:null};
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

function parseFailure(
    source: string,
    filename: string,
    phase: ParseFailure["phase"],
    origin: ParseFailure["origin"],
    goal: "script" | "module",
    allowExternalPrivateNames = false,
): ParseFailure | null {
    const sourceFile = createEcmaSourceFile(
        filename,
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
        goal,
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
    const functionFailure = diagnostics.length === 0 && !goalMismatch && !controlFailure
        ? earlyFunctionStaticSemanticsFailure(sourceFile) ?? earlyPrivateStaticSemanticsFailure(sourceFile, allowExternalPrivateNames)
        : null;
    const moduleFailure = diagnostics.length === 0 && !goalMismatch && !controlFailure && !functionFailure && goal === "module"
        ? earlyModuleStaticSemanticsFailure(sourceFile)
        : null;
    if (diagnostics.length === 0 && !goalMismatch && !controlFailure && !functionFailure && !moduleFailure) return null;
    const formatted = controlFailure ?? (functionFailure
        ? (() => {
            const start = sourceFile.getLineAndCharacterOfPosition(
                Math.max(0, functionFailure.node.getStart(sourceFile)),
            );
            return `${filename}:${start.line + 1}:${start.character + 1}: ${functionFailure.message}`;
        })()
        : moduleFailure
        ? (() => {
            const start = sourceFile.getLineAndCharacterOfPosition(
                Math.max(0, moduleFailure.node.getStart(sourceFile)),
            );
            return `${filename}:${start.line + 1}:${start.character + 1}: ${moduleFailure.message}`;
        })()
        : diagnostics.length > 0
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
    // The preparation protocol orders paths by UTF-16 code units. Locale
    // collation can reorder punctuation (for example .c versus _api.c).
    return result.sort();
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
    const evalScriptGraph = finiteEvalScriptSourceGraph([
        ...request.setupScripts.map((script) => ({ path: script.path, source: script.source, goal: "script" as const })),
        { path: request.testPath, source: request.testSource, goal: request.goal },
    ], request.moduleFiles
            .filter((file) => /\.[cm]?js$/i.test(file.path))
            .map((file) => ({ path: file.path, source: Buffer.from(file.data, "base64").toString("utf8"), goal: "module" as const })),
    );
    if (evalScriptGraph.error) {
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "diagnostic-observation",
            observation: {
                protocolVersion: hostProtocolVersion,
                scenarioId: request.scenarioId,
                kind: "unsupported",
                detail: evalScriptGraph.error,
            },
        };
    }

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
        const evalScriptRoots: string[] = [];
        const evalScriptEntries: Array<{ source: string; entry: string | null; domain?: string }> = [];
        const agentEntries: Array<{source:string;entry:string|null}>=[];
        for(const source of evalScriptGraph.agentSources){
            const entry=path.join(sourceRoot,`agent-${sha256Text(source)}.js`);
            const valid=!parseFailure(source,entry,"parse","test-source","script");
            if(valid){await fs.writeFile(entry,Buffer.from("\ufeff"+source,"utf16le"));evalScriptRoots.push(entry);}
            agentEntries.push({source,entry:valid?entry:null});
        }
        for (const record of evalScriptGraph.scriptSources) {
            const {source,domain} = record;
            const relative = `__tsc2c_eval_script__/${sha256Text(JSON.stringify([source,domain]))}.js`;
            const failure = parseFailure(source, relative, "parse", "test-source", "script");
            if (failure) {
                evalScriptEntries.push({ ...record, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, Buffer.from("\ufeff" + source, "utf16le"));
            evalScriptRoots.push(entry);
            evalScriptEntries.push({ ...record, entry });
        }
        const directEvalEntries: Array<{
            source: string;
            entry: string | null;
            strictCaller: boolean;
            strict: boolean;
            domain?: string;
        }> = [];
        const directEvalRoots: string[] = [];
        for (const direct of evalScriptGraph.directEvalSources) {
            const relative =
                `__tsc2c_direct_eval__/${direct.strictCaller ? "strict" : "sloppy"}/` +
                `${sha256Text(JSON.stringify([direct.source,direct.domain]))}.js`;
            const failure = parseFailure(direct.source, relative, "parse", "test-source", "script", true);
            if (failure || !evalSourceIsValid({kind:"direct",...direct})) {
                directEvalEntries.push({ ...direct, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, Buffer.from("\ufeff" + direct.source, "utf16le"));
            directEvalRoots.push(entry);
            directEvalEntries.push({ ...direct, entry });
        }
        const indirectEvalEntries: Array<{
            source: string;
            entry: string | null;
            strict: boolean;
            domain?: string;
        }> = [];
        const indirectEvalRoots: string[] = [];
        for (const indirect of evalScriptGraph.indirectEvalSources) {
            const relative =
                `__tsc2c_indirect_eval__/${indirect.strict ? "strict" : "sloppy"}/` +
                `${sha256Text(JSON.stringify([indirect.source,indirect.domain]))}.js`;
            const failure = parseFailure(indirect.source, relative, "parse", "test-source", "script");
            if (failure || !evalSourceIsValid({kind:"indirect",strictCaller:false,...indirect})) {
                indirectEvalEntries.push({ ...indirect, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, Buffer.from("\ufeff" + indirect.source, "utf16le"));
            indirectEvalRoots.push(entry);
            indirectEvalEntries.push({ ...indirect, entry });
        }

        const buildDirectory = path.join(request.artifactDirectory, "build");
        const executable = path.join(request.artifactDirectory, "program");
        const scriptEntries = [
            ...setupEntries,
            ...(request.goal === "script" ? [testEntry] : []),
            ...evalScriptRoots,
        ];
        let diagnostics = "";
        const result = await compile({
            entry: testEntry,
            output: executable,
            buildDir: buildDirectory,
            additionalRoots: [
                ...setupEntries,
                ...evalScriptRoots,
                ...directEvalRoots,
                ...indirectEvalRoots,
            ],
            initializationEntries: [...setupEntries, testEntry],
            moduleRoots,
            isolatedScriptRoots: [...scriptEntries, ...directEvalRoots, ...indirectEvalRoots],
            ignoreCheckJsDirectiveRoots: [...new Set([
                ...setupEntries,
                testEntry,
                ...moduleRoots,
                ...evalScriptRoots,
                ...directEvalRoots,
                ...indirectEvalRoots,
            ])],
            test262Observation: {
                kind: "test262-native-observation",
                scenarioId: request.scenarioId,
                setupEntries,
                testEntry,
                async: request.async,
                canBlock: request.canBlock,
                scriptEntries,
                agentEntries,
                evalScriptEntries,
                directEvalEntries,
                indirectEvalEntries,
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
