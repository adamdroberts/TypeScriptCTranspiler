import ts from "typescript";

/** Explicit completion edge taken after an awaited loop-body segment. */
export type AsyncLoopCompletionEdge =
    | { readonly kind: "continue"; readonly target: "loop-condition"; readonly label: string | null }
    | { readonly kind: "break"; readonly target: "loop-fallthrough"; readonly label: string | null }
    | { readonly kind: "return"; readonly target: "function-result" }
    | { readonly kind: "throw"; readonly target: "function-result" };

export type AsyncFunctionCompletionEdge =
    | {
        readonly kind: "return";
        readonly target: "function-result";
        readonly value: ts.Expression | null;
        readonly awaitExpr: ts.AwaitExpression | null;
        readonly statement: ts.ReturnStatement;
    }
    | {
        readonly kind: "throw";
        readonly target: "function-result";
        readonly value: ts.Expression;
        readonly awaitExpr: ts.AwaitExpression | null;
        readonly statement: ts.ThrowStatement;
    };

export interface AsyncStatementSuspensionState<TStep> {
    readonly kind: "await-statement";
    readonly id: number;
    readonly step: TStep;
    readonly interstitialStatements: readonly ts.Statement[];
    readonly next: { readonly kind: "state"; readonly id: number } |
        { readonly kind: "completion" };
}

export interface AsyncStatementSuspensionGraph<TStep> {
    readonly kind: "statement-suspension-graph";
    readonly entryState: number;
    readonly states: readonly AsyncStatementSuspensionState<TStep>[];
    readonly completion: AsyncFunctionCompletionEdge;
}

export function planAsyncStatementSuspensionGraph<TStep>(
    steps: readonly TStep[],
    interstitialStatements: readonly (readonly ts.Statement[])[],
    completion: AsyncFunctionCompletionEdge,
): AsyncStatementSuspensionGraph<TStep> | null {
    if (steps.length === 0 ||
        (interstitialStatements.length !== steps.length - 1 && interstitialStatements.length !== steps.length)) return null;
    return {
        kind: "statement-suspension-graph",
        entryState: 0,
        states: steps.map((step, id) => ({
            kind: "await-statement",
            id,
            step,
            interstitialStatements: interstitialStatements[id] ?? [],
            next: id + 1 < steps.length
                ? { kind: "state", id: id + 1 }
                : { kind: "completion" },
        })),
        completion,
    };
}

export function planAsyncFunctionCompletionEdge(
    statement: ts.Statement,
    unwrap: (expression: ts.Expression) => ts.Expression,
): AsyncFunctionCompletionEdge | null {
    if (ts.isReturnStatement(statement)) {
        const value = statement.expression ?? null;
        const unwrapped = value ? unwrap(value) : null;
        const awaitExpr = unwrapped && ts.isAwaitExpression(unwrapped) ? unwrapped : null;
        return {
            kind: "return",
            target: "function-result",
            value: awaitExpr ? awaitExpr.expression : value,
            awaitExpr,
            statement,
        };
    }
    if (ts.isThrowStatement(statement)) {
        const unwrapped = unwrap(statement.expression);
        return {
            kind: "throw",
            target: "function-result",
            value: statement.expression,
            awaitExpr: ts.isAwaitExpression(unwrapped) ? unwrapped : null,
            statement,
        };
    }
    return null;
}

export function planAsyncLoopCompletionEdge(
    statement: ts.Statement,
    currentLoopLabel: string | null = null,
): AsyncLoopCompletionEdge | null {
    if (ts.isContinueStatement(statement) &&
        (!statement.label || statement.label.text === currentLoopLabel)) {
        return { kind: "continue", target: "loop-condition", label: statement.label?.text ?? null };
    }
    if (ts.isBreakStatement(statement) &&
        (!statement.label || statement.label.text === currentLoopLabel)) {
        return { kind: "break", target: "loop-fallthrough", label: statement.label?.text ?? null };
    }
    if (ts.isReturnStatement(statement)) {
        return { kind: "return", target: "function-result" };
    }
    if (ts.isThrowStatement(statement)) {
        return { kind: "throw", target: "function-result" };
    }
    return null;
}

/** Collect labelled completion edges that may escape nested loop-body control flow. */
export function planAsyncLoopNestedCompletionEdges(
    statements: readonly ts.Statement[],
    currentLoopLabel: string | null,
): readonly AsyncLoopCompletionEdge[] {
    if (!currentLoopLabel) return [];
    const edges = new Map<string, AsyncLoopCompletionEdge>();
    const visit = (node: ts.Node): void => {
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
        if ((ts.isBreakStatement(node) || ts.isContinueStatement(node)) &&
            node.label?.text === currentLoopLabel) {
            const edge = planAsyncLoopCompletionEdge(node, currentLoopLabel);
            if (edge && (edge.kind === "break" || edge.kind === "continue")) {
                edges.set(`${edge.kind}:${edge.label ?? ""}`, edge);
            }
            return;
        }
        ts.forEachChild(node, visit);
    };
    for (const statement of statements) visit(statement);
    return [...edges.values()];
}
