import { earlyPrivateStaticSemanticsFailure } from "./emit/private-names";
import ts from "typescript";
import { createEcmaSourceFile } from "./ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "./control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "./function-static-semantics";
import { sourceConstructorFacts, type SourceValueGraphEntries } from "./source-value-flow";
import {sourceChoiceTuples} from "./source-choice-tuples";

/** CreateDynamicFunction's joined FormalParameters and FunctionBody. Argument
 * boundaries do not survive the specified comma join, so this is also the
 * canonical dispatch key, independent of argument or statement cardinality. */
export interface FunctionConstructorSource {
    readonly domain?: string;
    readonly kind?: DynamicFunctionKind;
    readonly parameters: string;
    readonly body: string;
}

export type DynamicFunctionKind = "ordinary" | "generator" | "async" | "async-generator";
const functionPrefixes: Record<DynamicFunctionKind, string> = {
    ordinary: "function", generator: "function*", async: "async function", "async-generator": "async function*",
};
export function functionConstructorRuntimeKind(kind: DynamicFunctionKind = "ordinary"): string {
    return `TSC_DYNAMIC_FUNCTION_${kind.toUpperCase().replaceAll("-", "_")}`;
}
export function functionKindForDeclaration(node: ts.Node): DynamicFunctionKind {
    const asynchronous = (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [])
        .some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
    const generator = "asteriskToken" in node && !!node.asteriskToken;
    return generator ? asynchronous ? "async-generator" : "generator" : asynchronous ? "async" : "ordinary";
}

export interface FunctionConstructorEntry extends FunctionConstructorSource {
    /** Invalid source is retained for an actual runtime SyntaxError. */
    readonly entry: string | null;
}

export function functionConstructorSourceKey(source: FunctionConstructorSource): string {
    return JSON.stringify([source.kind ?? "ordinary", source.parameters, source.body,...(source.domain?[source.domain]:[])]);
}

export function functionConstructorDisplaySource(source: FunctionConstructorSource): string {
    return `${functionPrefixes[source.kind ?? "ordinary"]} anonymous(${source.parameters}\n) {\n${source.body}\n}`;
}

export function functionConstructorExpressionSource(source: FunctionConstructorSource): string {
    // An anonymous expression deliberately has no named-function binding.
    // SetFunctionName("anonymous") happens after its ordinary creation.
    return `(${functionPrefixes[source.kind ?? "ordinary"]}(${source.parameters}\n) {\n${source.body}\n});`;
}

function parseFunctionExpression(source: FunctionConstructorSource): ts.SourceFile | null {
    const text = functionConstructorExpressionSource(source);
    const file = createEcmaSourceFile("function-source.js", text, ts.ScriptTarget.ESNext,
        true, ts.ScriptKind.JS, "script");
    if ((file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics?.length) return null;
    const statement = file.statements[0];
    if (file.statements.length !== 1 || !statement || !ts.isExpressionStatement(statement) ||
        !ts.isParenthesizedExpression(statement.expression) ||
        !ts.isFunctionExpression(statement.expression.expression)) return null;
    const expression = statement.expression.expression;
    const bodyStart = `(${functionPrefixes[source.kind ?? "ordinary"]}(${source.parameters}\n) `.length;
    if (expression.body.getStart(file) !== bodyStart || expression.end !== text.length - 2) return null;
    return file;
}

export function functionConstructorSourceIsValid(source: FunctionConstructorSource): boolean {
    // Parse parameters and body independently before the combined expression;
    // comments or delimiters in one input cannot consume the other input.
    if (!parseFunctionExpression({ kind: source.kind, parameters: source.parameters, body: "" }) ||
        !parseFunctionExpression({ kind: source.kind, parameters: "", body: source.body })) return false;
    const file = parseFunctionExpression(source);
    return !!file && !earlyControlFlowStaticSemanticsFailure(file) &&
        !earlyFunctionStaticSemanticsFailure(file) && !earlyPrivateStaticSemanticsFailure(file);
}

export function finiteFunctionConstructorSources(
    program: ts.Program, manifest: readonly FunctionConstructorSource[], entries: SourceValueGraphEntries = {},
): FunctionConstructorSource[] {
    const sources = new Map(manifest.map(source => [functionConstructorSourceKey(source), source]));
    for (const invocation of sourceConstructorFacts(program, entries)) {
        const { kind, arguments:choices } = invocation;
        if (!choices) continue;
        for (const tuple of sourceChoiceTuples(choices)) {
            const source = { kind, parameters: tuple.slice(0, -1).join(","), body: tuple.at(-1) ?? "",...(invocation.domain?{domain:invocation.domain}:{}) };
            sources.set(functionConstructorSourceKey(source), source);
        }
        if (choices.length && choices.at(-1)!.length === 0) {
            for (const parameterTuple of sourceChoiceTuples(choices.slice(0,-1))) for (const body of manifest) {
                if (body.parameters !== "" || body.kind && body.kind !== kind) continue;
                const source = { kind, parameters: parameterTuple.join(","), body: body.body,...(invocation.domain?{domain:invocation.domain}:{}) };
                sources.set(functionConstructorSourceKey(source), source);
            }
        }
    }
    return [...sources.values()];
}
