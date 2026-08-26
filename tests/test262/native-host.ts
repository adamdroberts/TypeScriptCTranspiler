#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { earlyControlFlowFailure } from "../../src/control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "../../src/function-static-semantics";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { jsonSyntaxLineAndColumn, validateJsonSyntax } from "../../src/json-syntax";
import {
    type ModuleRequest,
    moduleRequestFromDeclaration,
    moduleRequestKey,
    staticModuleRequestResolutionError,
} from "../../src/module-request";
import { staticStringExpressionTexts } from "../../src/module-specifiers";
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
    readonly sources: readonly string[];
    readonly indirectEvalSources: readonly {
        readonly source: string;
        readonly strict: boolean;
    }[];
    readonly directEvalSources: readonly {
        readonly source: string;
        readonly strictCaller: boolean;
        readonly strict: boolean;
    }[];
    readonly error: string | null;
}

function sourceFileIsStrict(sourceFile: ts.SourceFile): boolean {
    for (const statement of sourceFile.statements) {
        if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
        if (statement.expression.text === "use strict") return true;
    }
    return false;
}

function bindingNameContains(name: ts.BindingName, expected: string): boolean {
    const worklist: ts.BindingName[] = [name];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        if (ts.isIdentifier(current)) {
            if (current.text === expected) return true;
            continue;
        }
        for (const element of current.elements) {
            if (element && ts.isBindingElement(element)) worklist.push(element.name);
        }
    }
    return false;
}

/** Conservative lexical proof for the finite host. A source record with any
 * potentially active source binding named `eval` is left to the compiler's
 * fail-closed ordinary-call path. */
function sourceRecordMayShadowEval(sourceFile: ts.SourceFile): boolean {
    const worklist: ts.Node[] = [...sourceFile.statements];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
            node.name?.text === "eval") return true;
        if (ts.isVariableDeclaration(node) && bindingNameContains(node.name, "eval")) return true;
        if (ts.isCatchClause(node) && node.variableDeclaration &&
            bindingNameContains(node.variableDeclaration.name, "eval")) return true;
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) continue;
        ts.forEachChild(node, (child) => { worklist.push(child); });
    }
    return false;
}

function switchHasDirectLexicalDeclarations(statement: ts.SwitchStatement): boolean {
    return statement.caseBlock.clauses.some((clause) => clause.statements.some((item) =>
        ts.isFunctionDeclaration(item) ||
        ts.isClassDeclaration(item) ||
        ts.isVariableStatement(item) &&
            (item.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0));
}

function finiteEvalInitializerIsEnvironmentIndependent(expression: ts.Expression): boolean {
    expression = transparentExpression(expression);
    if (
        ts.isNumericLiteral(expression) ||
        ts.isStringLiteralLike(expression) ||
        expression.kind === ts.SyntaxKind.TrueKeyword ||
        expression.kind === ts.SyntaxKind.FalseKeyword ||
        expression.kind === ts.SyntaxKind.NullKeyword
    ) return true;
    return ts.isPrefixUnaryExpression(expression) &&
        (expression.operator === ts.SyntaxKind.PlusToken ||
            expression.operator === ts.SyntaxKind.MinusToken) &&
        ts.isNumericLiteral(transparentExpression(expression.operand));
}

/** A switch-contained direct eval is admitted only when its complete static
 * source worklist can affect the caller's VariableEnvironment without reading
 * or declaring anything in the switch LexicalEnvironment. */
function finiteEvalSourceUsesOnlyGlobalVarEnvironment(source: string): boolean {
    const sourceFile = createEcmaSourceFile(
        "__tsc2c_switch_direct_eval_probe__.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
    if ((sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics?.length) return false;
    const worklist: readonly ts.Statement[] = sourceFile.statements;
    for (let index = 0; index < worklist.length; index++) {
        const statement = worklist[index]!;
        if (ts.isEmptyStatement(statement)) continue;
        if (!ts.isVariableStatement(statement) ||
            (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) return false;
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text === "eval") return false;
            if (declaration.initializer &&
                !finiteEvalInitializerIsEnvironmentIndependent(declaration.initializer)) return false;
        }
    }
    return true;
}

function callIsInSourceEvaluation(
    call: ts.CallExpression,
    sourceFile: ts.SourceFile,
    strictCaller: boolean,
    alternatives: readonly string[],
): boolean {
    let containingSwitch: ts.SwitchStatement | null = null;
    let containingSwitchBranch: ts.Node | null = null;
    let child: ts.Node = call;
    for (let current: ts.Node | undefined = call.parent; current && current !== sourceFile; current = current.parent) {
        if (
            ts.isFunctionLike(current) ||
            ts.isClassLike(current) ||
            ts.isBlock(current) ||
            ts.isCatchClause(current) ||
            ts.isWithStatement(current) ||
            ts.isForStatement(current) ||
            ts.isForInStatement(current) ||
            ts.isForOfStatement(current)
        ) return false;
        if (ts.isSwitchStatement(current)) {
            if (containingSwitch) return false;
            containingSwitch = current;
            containingSwitchBranch = child;
        }
        child = current;
    }
    /* Switch Evaluation evaluates the discriminator before creating the
     * CaseBlock Environment Record, so it has the ordinary top-level direct
     * eval context regardless of declarations in the later CaseBlock. */
    if (!containingSwitch || containingSwitch.expression === containingSwitchBranch) return true;
    return !strictCaller &&
        alternatives.length > 0 &&
        !switchHasDirectLexicalDeclarations(containingSwitch) &&
        alternatives.every(finiteEvalSourceUsesOnlyGlobalVarEnvironment);
}

function transparentExpression(expression: ts.Expression): ts.Expression {
    while (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isNonNullExpression(expression)
    ) {
        expression = expression.expression;
    }
    return expression;
}

function staticMemberNames(expression: ts.PropertyAccessExpression | ts.ElementAccessExpression): string[] {
    if (ts.isPropertyAccessExpression(expression)) return [expression.name.text];
    return expression.argumentExpression
        ? staticStringExpressionTexts(expression.argumentExpression)
        : [];
}

/** Build one conservative value-flow graph for expressions which can carry a
 * Realm's %eval% identity. Runtime identity checking makes over-approximation
 * safe; the graph is only used to prove the finite source records that must be
 * compiled ahead of time. */
function evalIdentityAliases(sourceFile: ts.SourceFile): ReadonlyMap<string, readonly ts.Expression[]> {
    const aliases = new Map<string, ts.Expression[]>();
    const add = (name: string, expression: ts.Expression): void => {
        const values = aliases.get(name) ?? [];
        values.push(expression);
        aliases.set(name, values);
    };
    const worklist: ts.Node[] = [sourceFile];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            add(node.name.text, node.initializer);
        } else if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(transparentExpression(node.left))
        ) {
            add((transparentExpression(node.left) as ts.Identifier).text, node.right);
        }
        ts.forEachChild(node, (child) => { worklist.push(child); });
    }
    return aliases;
}

function expressionMayCarryEvalIdentity(
    expression: ts.Expression,
    evalMayBeShadowed: boolean,
    aliases: ReadonlyMap<string, readonly ts.Expression[]>,
    seenAliases: Set<string> = new Set(),
): boolean {
    expression = transparentExpression(expression);
    if (ts.isIdentifier(expression)) {
        if (expression.text === "eval" && !evalMayBeShadowed) return true;
        if (seenAliases.has(expression.text)) return false;
        const values = aliases.get(expression.text);
        if (!values) return false;
        seenAliases.add(expression.text);
        const result = values.some((value) =>
            expressionMayCarryEvalIdentity(value, evalMayBeShadowed, aliases, seenAliases));
        seenAliases.delete(expression.text);
        return result;
    }
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        const names = staticMemberNames(expression);
        if (names.includes("eval")) return true;
        if (names.some((name) => name === "bind" || name === "valueOf")) {
            return expressionMayCarryEvalIdentity(
                expression.expression,
                evalMayBeShadowed,
                aliases,
                seenAliases,
            );
        }
        return false;
    }
    if (ts.isConditionalExpression(expression)) {
        return expressionMayCarryEvalIdentity(
            expression.whenTrue,
            evalMayBeShadowed,
            aliases,
            seenAliases,
        ) || expressionMayCarryEvalIdentity(
            expression.whenFalse,
            evalMayBeShadowed,
            aliases,
            seenAliases,
        );
    }
    if (ts.isBinaryExpression(expression)) {
        if (
            expression.operatorToken.kind === ts.SyntaxKind.CommaToken ||
            expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
            return expressionMayCarryEvalIdentity(
                expression.right,
                evalMayBeShadowed,
                aliases,
                seenAliases,
            );
        }
        if (
            expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
            return expressionMayCarryEvalIdentity(
                expression.left,
                evalMayBeShadowed,
                aliases,
                seenAliases,
            ) || expressionMayCarryEvalIdentity(
                expression.right,
                evalMayBeShadowed,
                aliases,
                seenAliases,
            );
        }
    }
    if (ts.isCallExpression(expression)) {
        const callee = transparentExpression(expression.expression);
        if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
            if (staticMemberNames(callee).includes("bind")) {
                return expressionMayCarryEvalIdentity(
                    callee.expression,
                    evalMayBeShadowed,
                    aliases,
                    seenAliases,
                );
            }
        }
    }
    return false;
}

function finiteApplyArgumentExpressions(expression: ts.Expression | undefined): readonly ts.Expression[] {
    if (!expression) return [];
    expression = transparentExpression(expression);
    if (!ts.isArrayLiteralExpression(expression) || expression.elements.length === 0) return [];
    const first = expression.elements[0];
    return first && ts.isExpression(first) && !ts.isSpreadElement(first) ? [first] : [];
}

/** Return the possible String argument expressions for an indirect call of a
 * %eval% identity. All ordinary calls still use the runtime identity guard. */
function indirectEvalSourceExpressions(
    call: ts.CallExpression,
    evalMayBeShadowed: boolean,
    aliases: ReadonlyMap<string, readonly ts.Expression[]>,
): readonly ts.Expression[] {
    const callee = transparentExpression(call.expression);
    if (
        ts.isIdentifier(callee) &&
        callee.text === "eval" &&
        !evalMayBeShadowed &&
        !aliases.has("eval")
    ) {
        return [];
    }
    if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
        const names = staticMemberNames(callee);
        if (names.includes("call") && expressionMayCarryEvalIdentity(
            callee.expression,
            evalMayBeShadowed,
            aliases,
        )) {
            return call.arguments[1] && ts.isExpression(call.arguments[1])
                ? [call.arguments[1]]
                : [];
        }
        if (names.includes("apply") && expressionMayCarryEvalIdentity(
            callee.expression,
            evalMayBeShadowed,
            aliases,
        )) {
            return finiteApplyArgumentExpressions(call.arguments[1]);
        }
    }
    if (expressionMayCarryEvalIdentity(callee, evalMayBeShadowed, aliases)) {
        return call.arguments[0] && ts.isExpression(call.arguments[0])
            ? [call.arguments[0]]
            : [];
    }
    return [];
}

/** Derive the transitive ParseScript source graph from one canonical AST
 * worklist. Runtime strings outside this finite graph fail closed. */
export function finiteEvalScriptSourceGraph(
    roots: readonly { readonly path: string; readonly source: string }[],
): FiniteEvalScriptSourceGraph {
    const sources = new Set<string>();
    const directSources = new Map<string, {
        source: string;
        strictCaller: boolean;
        strict: boolean;
    }>();
    const indirectSources = new Map<string, {
        source: string;
        strict: boolean;
    }>();
    const records: Array<{
        path: string;
        source: string;
        strictContext?: boolean;
    }> = roots.map((root) => ({ ...root }));
    for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
        const record = records[recordIndex]!;
        const sourceFile = createEcmaSourceFile(
            record.path,
            record.source,
            ts.ScriptTarget.ESNext,
            true,
            ts.ScriptKind.JS,
        );
        const recordStrict = record.strictContext ?? sourceFileIsStrict(sourceFile);
        const evalMayBeShadowed = sourceRecordMayShadowEval(sourceFile);
        const evalAliases = evalIdentityAliases(sourceFile);
        const worklist: ts.Node[] = [sourceFile];
        while (worklist.length > 0) {
            const node = worklist.pop()!;
            if (
                ts.isPropertyAccessExpression(node) &&
                node.name.text === "evalScript"
            ) {
                const parent = node.parent;
                if (!ts.isCallExpression(parent) || parent.expression !== node) {
                    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    return {
                        sources: [],
                        indirectEvalSources: [],
                        directEvalSources: [],
                        error: `${record.path}:${location.line + 1}:${location.character + 1}: evalScript must be called directly so its finite source graph can be proven`,
                    };
                }
                const alternatives = parent.arguments[0]
                    ? staticStringExpressionTexts(parent.arguments[0]!)
                    : ["undefined"];
                if (alternatives.length === 0) {
                    const location = sourceFile.getLineAndCharacterOfPosition(parent.getStart(sourceFile));
                    return {
                        sources: [],
                        indirectEvalSources: [],
                        directEvalSources: [],
                        error: `${record.path}:${location.line + 1}:${location.character + 1}: evalScript source is not a finite static string expression`,
                    };
                }
                for (const source of alternatives) {
                    if (sources.has(source)) continue;
                    sources.add(source);
                    records.push({
                        path: `__tsc2c_eval_script__/${sha256Text(source)}.js`,
                        source,
                    });
                }
            }
            if (!evalMayBeShadowed && ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) && node.expression.text === "eval") {
                const alternatives = node.arguments[0]
                    ? staticStringExpressionTexts(node.arguments[0]!)
                    : [];
                if (callIsInSourceEvaluation(node, sourceFile, recordStrict, alternatives)) {
                    if (node.arguments.length > 0 && alternatives.length === 0) {
                        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                        return {
                            sources: [],
                            indirectEvalSources: [],
                            directEvalSources: [],
                            error: `${record.path}:${location.line + 1}:${location.character + 1}: direct eval source is not a finite static string expression`,
                        };
                    }
                    for (const source of alternatives) {
                        const evalSourceFile = createEcmaSourceFile(
                            "__tsc2c_direct_eval_probe__.js",
                            source,
                            ts.ScriptTarget.ESNext,
                            true,
                            ts.ScriptKind.JS,
                        );
                        const strict = recordStrict || sourceFileIsStrict(evalSourceFile);
                        const key = `${recordStrict ? "strict" : "sloppy"}\0${source}`;
                        if (directSources.has(key)) continue;
                        directSources.set(key, { source, strictCaller: recordStrict, strict });
                        records.push({
                            path: `__tsc2c_direct_eval__/${recordStrict ? "strict" : "sloppy"}/${sha256Text(source)}.js`,
                            source,
                            strictContext: strict,
                        });
                    }
                }
            }
            if (ts.isCallExpression(node)) {
                for (const expression of indirectEvalSourceExpressions(
                    node,
                    evalMayBeShadowed,
                    evalAliases,
                )) {
                    for (const source of staticStringExpressionTexts(expression)) {
                        if (indirectSources.has(source)) continue;
                        const evalSourceFile = createEcmaSourceFile(
                            "__tsc2c_indirect_eval_probe__.js",
                            source,
                            ts.ScriptTarget.ESNext,
                            true,
                            ts.ScriptKind.JS,
                        );
                        const strict = sourceFileIsStrict(evalSourceFile);
                        indirectSources.set(source, { source, strict });
                        records.push({
                            path: `__tsc2c_indirect_eval__/${strict ? "strict" : "sloppy"}/${sha256Text(source)}.js`,
                            source,
                            strictContext: strict,
                        });
                    }
                }
            }
            const children: ts.Node[] = [];
            node.forEachChild((child) => {
                children.push(child);
            });
            for (let index = children.length - 1; index >= 0; index--) {
                worklist.push(children[index]!);
            }
        }
    }
    return {
        sources: [...sources].sort(),
        indirectEvalSources: [...indirectSources.values()].sort((left, right) =>
            Number(left.strict) - Number(right.strict) || left.source.localeCompare(right.source),
        ),
        directEvalSources: [...directSources.values()].sort((left, right) =>
            Number(left.strictCaller) - Number(right.strictCaller) ||
            left.source.localeCompare(right.source),
        ),
        error: null,
    };
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
    const functionFailure = diagnostics.length === 0 && !goalMismatch && !controlFailure
        ? earlyFunctionStaticSemanticsFailure(sourceFile)
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
    const evalScriptGraph = finiteEvalScriptSourceGraph([
        ...request.setupScripts.map((script) => ({ path: script.path, source: script.source })),
        { path: request.testPath, source: request.testSource },
        ...(request.goal === "module" ? request.moduleFiles : [])
            .filter((file) => /\.[cm]?js$/i.test(file.path))
            .map((file) => ({ path: file.path, source: Buffer.from(file.data, "base64").toString("utf8") })),
    ]);
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
        const evalScriptEntries: Array<{ source: string; entry: string | null }> = [];
        const evalScriptRoots: string[] = [];
        for (const source of evalScriptGraph.sources) {
            const relative = `__tsc2c_eval_script__/${sha256Text(source)}.js`;
            const failure = parseFailure(source, relative, "parse", "test-source", "script");
            if (failure) {
                evalScriptEntries.push({ source, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, source);
            evalScriptRoots.push(entry);
            evalScriptEntries.push({ source, entry });
        }
        const directEvalEntries: Array<{
            source: string;
            entry: string | null;
            strictCaller: boolean;
            strict: boolean;
        }> = [];
        const directEvalRoots: string[] = [];
        for (const direct of evalScriptGraph.directEvalSources) {
            const relative =
                `__tsc2c_direct_eval__/${direct.strictCaller ? "strict" : "sloppy"}/` +
                `${sha256Text(direct.source)}.js`;
            const failure = parseFailure(direct.source, relative, "parse", "test-source", "script");
            if (failure) {
                directEvalEntries.push({ ...direct, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, direct.source);
            directEvalRoots.push(entry);
            directEvalEntries.push({ ...direct, entry });
        }
        const indirectEvalEntries: Array<{
            source: string;
            entry: string | null;
            strict: boolean;
        }> = [];
        const indirectEvalRoots: string[] = [];
        for (const indirect of evalScriptGraph.indirectEvalSources) {
            const relative =
                `__tsc2c_indirect_eval__/${indirect.strict ? "strict" : "sloppy"}/` +
                `${sha256Text(indirect.source)}.js`;
            const failure = parseFailure(indirect.source, relative, "parse", "test-source", "script");
            if (failure) {
                indirectEvalEntries.push({ ...indirect, entry: null });
                continue;
            }
            const entry = await writeExclusive(sourceRoot, relative, indirect.source);
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
                scriptEntries,
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
