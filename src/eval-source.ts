import ts from "typescript";
import { earlyControlFlowStaticSemanticsFailure } from "./control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "./function-static-semantics";
import { earlyPrivateStaticSemanticsFailure } from "./emit/private-names";
import { createEcmaSourceFile, ecmaDirectivePrologueHasUseStrict, ecmaParseGoal } from "./ecmascript-source";
import { sourceEvaluationInvocations } from "./source-value-flow";
import type { SourceValueGraphEntries } from "./source-value-flow";

export interface EvalSourceEntry { readonly source: string; readonly entry: string | null; }
export interface DirectEvalSourceEntry extends EvalSourceEntry { readonly strictCaller: boolean; readonly strict: boolean; }
export interface IndirectEvalSourceEntry extends EvalSourceEntry { readonly strict: boolean; }
export interface SourceEvalPlan {
    readonly unresolvedCalls?: readonly ts.Node[];
    readonly evalScriptEntries?: readonly EvalSourceEntry[];
    readonly directEvalEntries?: readonly DirectEvalSourceEntry[];
    readonly indirectEvalEntries?: readonly IndirectEvalSourceEntry[];
}
export interface EvalSourceRequest {
    readonly kind: "script" | "direct" | "indirect";
    readonly source: string;
    readonly strictCaller: boolean;
    readonly strict: boolean;
}
export function evalSourceKey(request: EvalSourceRequest): string { return JSON.stringify(request); }
export function evalSourceRequest(kind: EvalSourceRequest["kind"], source: string, strictCaller = false): EvalSourceRequest {
    const parsed = createEcmaSourceFile("eval-source.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
    return {kind, source, strictCaller, strict: strictCaller || ecmaDirectivePrologueHasUseStrict(parsed.statements)};
}

export function sourceFileIsStrict(source: ts.SourceFile): boolean {
    return ecmaParseGoal(source) === "module" || ecmaDirectivePrologueHasUseStrict(source.statements);
}
export function directEvalIsStrict(node: ts.Node, inherited: boolean): boolean {
    for (let current: ts.Node | undefined = node; current; current = current.parent) {
        if (ts.isClassLike(current) || ts.isClassStaticBlockDeclaration(current)) return true;
        if (ts.isFunctionLike(current) && "body" in current && current.body && ts.isBlock(current.body) &&
            ecmaDirectivePrologueHasUseStrict(current.body.statements)) return true;
    }
    return inherited;
}

/** Both physical and virtual source programs project this same value graph. */
export function evaluationSourceRequests(program: ts.Program, entries: SourceValueGraphEntries = {},
    strictContexts: ReadonlyMap<string, boolean> = new Map()): {
        hasEvaluations: boolean;
        requests: readonly EvalSourceRequest[];
        unresolved: readonly { node: ts.Node; direct: boolean; operation: "eval" | "eval-script" }[];
    } {
    const requests = new Map<string, EvalSourceRequest>(), unresolved = [];
    const invocations = sourceEvaluationInvocations(program, entries);
    for (const invocation of invocations) {
        if (invocation.choices === null) {
            unresolved.push({ node: invocation.node, direct: invocation.direct, operation: invocation.operation });
            continue;
        }
        for (const source of invocation.choices) {
            const file = invocation.node.getSourceFile();
            const strictCaller = invocation.direct && directEvalIsStrict(invocation.node, strictContexts.get(file.fileName) ?? sourceFileIsStrict(file));
            const request = evalSourceRequest(invocation.operation === "eval-script" ? "script" : invocation.direct ? "direct" : "indirect",
                source, strictCaller);
            requests.set(evalSourceKey(request), request);
        }
    }
    return { hasEvaluations: invocations.length > 0, requests: [...requests.values()], unresolved };
}

export function evalSourceIsValid(request: EvalSourceRequest): boolean {
    const text = request.strict ? '"use strict";\n' + request.source : request.source;
    const file = createEcmaSourceFile("eval-source.js", text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
    return !(file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length &&
        !earlyControlFlowStaticSemanticsFailure(file) && !earlyFunctionStaticSemanticsFailure(file) &&
        !earlyPrivateStaticSemanticsFailure(file, request.kind === "direct");
}
