import ts from "typescript";

export type AsyncShortCircuitExit = "falsy" | "truthy" | "non-nullish";

export interface AsyncExpressionSuspensionState {
    readonly kind: "await";
    readonly id: number;
    readonly awaitExpr: ts.AwaitExpression;
    readonly nextState: number | null;
    readonly shortCircuitExit?: AsyncShortCircuitExit;
}

/**
 * Typed lowering plan for an expression whose evaluation crosses suspension
 * points. The emitter consumes states in order today; explicit state IDs and
 * edges allow later statement/control-flow lowering to target the same IR.
 */
export interface AsyncExpressionSequencePlan {
    readonly kind: "expression-sequence";
    readonly entryState: number;
    readonly states: readonly AsyncExpressionSuspensionState[];
    readonly awaitExprs: readonly ts.AwaitExpression[];
    readonly prefixExprs: readonly ts.Expression[];
    readonly returnExpr: ts.Expression;
    readonly shortCircuitOperator?: ts.SyntaxKind;
}

export interface AsyncExpressionSequencePlannerOptions {
    readonly unwrap: (expression: ts.Expression) => ts.Expression;
    readonly isStableSynchronousTail: (expression: ts.Expression) => boolean;
    readonly isStableBeforeSuspension?: (expression: ts.Expression) => boolean;
    readonly minimumAwaitCount?: number;
    readonly allowNestedFunctionsInAwaitSource?: boolean;
}

export type AsyncConditionTarget =
    | { readonly kind: "state"; readonly id: number }
    | { readonly kind: "body" }
    | { readonly kind: "fallthrough" };

export type AsyncLogicalConditionState =
    | {
        readonly kind: "await-condition";
        readonly id: number;
        readonly awaitExpr: ts.AwaitExpression;
        readonly truthy: AsyncConditionTarget;
        readonly falsy: AsyncConditionTarget;
        readonly nullish: AsyncConditionTarget;
    }
    | {
        readonly kind: "condition";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly truthy: AsyncConditionTarget;
        readonly falsy: AsyncConditionTarget;
        readonly nullish: AsyncConditionTarget;
    };

/** A source-cardinality-independent control-flow graph for an awaited condition. */
export interface AsyncLogicalConditionPlan {
    readonly kind: "logical-condition";
    readonly entry: AsyncConditionTarget;
    readonly states: readonly AsyncLogicalConditionState[];
    readonly awaitExprs: readonly ts.AwaitExpression[];
}

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

function sourceCanRunBeforeSuspension(node: ts.Node, allowNestedFunctions = false): boolean {
    let supported = true;
    const visit = (current: ts.Node): void => {
        if (!supported) return;
        if (ts.isFunctionLike(current) || ts.isClassLike(current)) {
            if (allowNestedFunctions) return;
            supported = false;
            return;
        }
        if (ts.isAwaitExpression(current)) {
            supported = false;
            return;
        }
        ts.forEachChild(current, visit);
    };
    visit(node);
    return supported;
}

const CONDITION_BODY: AsyncConditionTarget = { kind: "body" };
const CONDITION_FALLTHROUGH: AsyncConditionTarget = { kind: "fallthrough" };

export function planAsyncLogicalCondition(
    condition: ts.Expression,
    options: Pick<AsyncExpressionSequencePlannerOptions, "unwrap" | "allowNestedFunctionsInAwaitSource">,
): AsyncLogicalConditionPlan | null {
    const awaitExprs: ts.AwaitExpression[] = [];
    let supported = true;
    const collect = (node: ts.Expression): void => {
        if (!supported) return;
        const current = options.unwrap(node);
        if (ts.isAwaitExpression(current)) {
            if (!sourceCanRunBeforeSuspension(current.expression, options.allowNestedFunctionsInAwaitSource)) {
                supported = false;
                return;
            }
            awaitExprs.push(current);
            return;
        }
        if (ts.isConditionalExpression(current)) {
            collect(current.condition);
            collect(current.whenTrue);
            collect(current.whenFalse);
            return;
        }
        if (ts.isBinaryExpression(current) && shortCircuitExit(current.operatorToken.kind) !== undefined) {
            collect(current.left);
            collect(current.right);
            return;
        }
        if (!sourceCanRunBeforeSuspension(current, options.allowNestedFunctionsInAwaitSource)) {
            supported = false;
        }
    };
    collect(condition);
    if (!supported || awaitExprs.length < 1 || new Set(awaitExprs).size !== awaitExprs.length) return null;

    const ids = new Map(awaitExprs.map((awaitExpr, id) => [awaitExpr, id] as const));
    const synchronousIds = new Map<ts.Expression, number>();
    const states = new Map<number, AsyncLogicalConditionState>();
    const stateTarget = (id: number): AsyncConditionTarget => ({ kind: "state", id });
    const compile = (
        node: ts.Expression,
        truthy: AsyncConditionTarget,
        falsy: AsyncConditionTarget,
        nullish: AsyncConditionTarget,
    ): AsyncConditionTarget | null => {
        const current = options.unwrap(node);
        if (ts.isAwaitExpression(current)) {
            const id = ids.get(current);
            if (id === undefined) return null;
            states.set(id, { kind: "await-condition", id, awaitExpr: current, truthy, falsy, nullish });
            return stateTarget(id);
        }
        if (ts.isConditionalExpression(current)) {
            const whenTrue = compile(current.whenTrue, truthy, falsy, nullish);
            const whenFalse = compile(current.whenFalse, truthy, falsy, nullish);
            if (!whenTrue || !whenFalse) return null;
            return compile(current.condition, whenTrue, whenFalse, whenFalse);
        }
        if (!ts.isBinaryExpression(current) ||
            shortCircuitExit(current.operatorToken.kind) === undefined) {
            if (!sourceCanRunBeforeSuspension(current, options.allowNestedFunctionsInAwaitSource)) return null;
            let id = synchronousIds.get(current);
            if (id === undefined) {
                id = awaitExprs.length + synchronousIds.size;
                synchronousIds.set(current, id);
            }
            states.set(id, { kind: "condition", id, expression: current, truthy, falsy, nullish });
            return stateTarget(id);
        }
        const operator = current.operatorToken.kind;
        const right = compile(current.right, truthy, falsy, nullish);
        if (!right) return null;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
            return compile(current.left, right, falsy, nullish);
        }
        if (operator === ts.SyntaxKind.BarBarToken) {
            return compile(current.left, truthy, right, right);
        }
        return compile(current.left, truthy, falsy, right);
    };
    const entry = compile(condition, CONDITION_BODY, CONDITION_FALLTHROUGH, CONDITION_FALLTHROUGH);
    if (!entry) return null;
    return {
        kind: "logical-condition",
        entry,
        states: [...states.values()].sort((left, right) => left.id - right.id),
        awaitExprs,
    };
}

function shortCircuitExit(operator: ts.SyntaxKind): AsyncShortCircuitExit | undefined {
    switch (operator) {
        case ts.SyntaxKind.AmpersandAmpersandToken:
            return "falsy";
        case ts.SyntaxKind.BarBarToken:
            return "truthy";
        case ts.SyntaxKind.QuestionQuestionToken:
            return "non-nullish";
        default:
            return undefined;
    }
}

function createPlan(
    expression: ts.Expression,
    awaitExprs: readonly ts.AwaitExpression[],
    shortCircuitOperator?: ts.SyntaxKind,
    prefixExprs: readonly ts.Expression[] = [],
): AsyncExpressionSequencePlan {
    const exit = shortCircuitOperator === undefined
        ? undefined
        : shortCircuitExit(shortCircuitOperator);
    const states = awaitExprs.map((awaitExpr, id): AsyncExpressionSuspensionState => ({
        kind: "await",
        id,
        awaitExpr,
        nextState: id + 1 < awaitExprs.length ? id + 1 : null,
        ...(exit !== undefined && id + 1 < awaitExprs.length ? { shortCircuitExit: exit } : {}),
    }));
    return {
        kind: "expression-sequence",
        entryState: 0,
        states,
        awaitExprs: [...awaitExprs],
        prefixExprs: [...prefixExprs],
        returnExpr: expression,
        ...(shortCircuitOperator === undefined ? {} : { shortCircuitOperator }),
    };
}

function planShortCircuitSequence(
    expression: ts.Expression,
    options: AsyncExpressionSequencePlannerOptions,
): AsyncExpressionSequencePlan | null {
    if (!ts.isBinaryExpression(expression)) return null;
    const operator = expression.operatorToken.kind;
    if (shortCircuitExit(operator) === undefined) return null;
    const awaitExprs: ts.AwaitExpression[] = [];
    let supported = true;
    let synchronousSuffix = false;
    const flatten = (node: ts.Expression): void => {
        if (!supported) return;
        const current = options.unwrap(node);
        if (ts.isBinaryExpression(current) && current.operatorToken.kind === operator) {
            flatten(current.left);
            flatten(current.right);
            return;
        }
        if (!ts.isAwaitExpression(current)) {
            if (awaitExprs.length === 0 || synchronousSuffix ||
                !sourceCanRunBeforeSuspension(current, options.allowNestedFunctionsInAwaitSource)) {
                supported = false;
                return;
            }
            synchronousSuffix = true;
            return;
        }
        if (synchronousSuffix ||
            !sourceCanRunBeforeSuspension(current.expression, options.allowNestedFunctionsInAwaitSource)) {
            supported = false;
            return;
        }
        awaitExprs.push(current);
    };
    flatten(expression);
    return supported && awaitExprs.length >= (options.minimumAwaitCount ?? 2)
        ? createPlan(expression, awaitExprs, operator)
        : null;
}

export function planAsyncExpressionSequence(
    returnExpr: ts.Expression,
    options: AsyncExpressionSequencePlannerOptions,
): AsyncExpressionSequencePlan | null {
    const expression = options.unwrap(returnExpr);
    const shortCircuit = planShortCircuitSequence(expression, options);
    if (shortCircuit) return shortCircuit;

    const awaitExprs: ts.AwaitExpression[] = [];
    const prefixExprs: ts.Expression[] = [];
    let synchronousTail = false;
    let supported = true;
    const isLiteral = (node: ts.Expression): boolean =>
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isNumericLiteral(node) ||
        ts.isBigIntLiteral(node) ||
        ts.isRegularExpressionLiteral(node) ||
        node.kind === ts.SyntaxKind.TrueKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword ||
        node.kind === ts.SyntaxKind.NullKeyword;
    const isSideEffectFreeVoid = (node: ts.Expression): boolean => {
        if (!ts.isVoidExpression(node)) return false;
        const operand = options.unwrap(node.expression);
        return isLiteral(operand) || (ts.isIdentifier(operand) && operand.text === "undefined");
    };
    const isNestedStructuralExpression = (node: ts.Expression): boolean =>
        ts.isBinaryExpression(node) ||
        ts.isTypeOfExpression(node) ||
        ts.isPrefixUnaryExpression(node) ||
        ts.isTemplateExpression(node) ||
        ts.isTaggedTemplateExpression(node) ||
        ts.isArrayLiteralExpression(node) ||
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node) ||
        ts.isCallExpression(node) ||
        ts.isNewExpression(node) ||
        ts.isObjectLiteralExpression(node);
    const addAwait = (awaitExpr: ts.AwaitExpression): void => {
        if (!sourceCanRunBeforeSuspension(awaitExpr.expression, options.allowNestedFunctionsInAwaitSource)) {
            supported = false;
            return;
        }
        awaitExprs.push(awaitExpr);
    };
    const containsAwait = (node: ts.Node): boolean => {
        let found = false;
        const visit = (current: ts.Node): void => {
            if (found || ts.isFunctionLike(current) || ts.isClassLike(current)) return;
            if (ts.isAwaitExpression(current)) {
                found = true;
                return;
            }
            ts.forEachChild(current, visit);
        };
        visit(node);
        return found;
    };
    const flatten = (node: ts.Expression): void => {
        if (!supported) return;
        const current = options.unwrap(node);
        if (ts.isAwaitExpression(current) && synchronousTail) {
            supported = false;
            return;
        }
        if (ts.isBinaryExpression(current)) {
            if (shortCircuitExit(current.operatorToken.kind) !== undefined) {
                supported = false;
                return;
            }
            if (awaitExprs.length === 0 && !containsAwait(current.left) && containsAwait(current.right)) {
                prefixExprs.push(current.left);
            } else {
                flatten(current.left);
            }
            flatten(current.right);
            return;
        }
        if (isLiteral(current) || isSideEffectFreeVoid(current)) return;
        if (ts.isVoidExpression(current)) {
            const operand = options.unwrap(current.expression);
            if (isNestedStructuralExpression(operand) || ts.isAwaitExpression(operand)) {
                flatten(operand);
            } else {
                supported = false;
            }
            return;
        }
        if (options.isStableSynchronousTail(current)) {
            // A stable suffix can be reconstructed after the last await.  A
            // prefix may only be deferred when the emitter proves that reading
            // it after suspension is observably identical (for example, an
            // immutable primitive const binding).  Otherwise retain the
            // conservative no-await-after-sync-tail rule until prefix values
            // gain explicit expression slots.
            if (awaitExprs.length > 0 || !options.isStableBeforeSuspension?.(current)) {
                synchronousTail = true;
            }
            return;
        }
        if (ts.isTypeOfExpression(current)) {
            const operand = options.unwrap(current.expression);
            if (ts.isAwaitExpression(operand)) {
                addAwait(operand);
                return;
            }
            const voidOperand = ts.isVoidExpression(operand)
                ? options.unwrap(operand.expression)
                : null;
            if (isLiteral(operand) ||
                (ts.isIdentifier(operand) && operand.text === "undefined") ||
                (voidOperand !== null && (isLiteral(voidOperand) ||
                    (ts.isIdentifier(voidOperand) && voidOperand.text === "undefined")))) return;
            if (isNestedStructuralExpression(operand)) {
                flatten(operand);
                return;
            }
            supported = false;
            return;
        }
        if (ts.isPrefixUnaryExpression(current)) {
            const operator = current.operator as ts.SyntaxKind;
            if (operator !== ts.SyntaxKind.PlusToken &&
                operator !== ts.SyntaxKind.MinusToken &&
                operator !== ts.SyntaxKind.ExclamationToken &&
                operator !== ts.SyntaxKind.TildeToken &&
                operator !== ts.SyntaxKind.TypeOfKeyword) {
                supported = false;
                return;
            }
            const operand = options.unwrap(current.operand);
            if (ts.isAwaitExpression(operand)) addAwait(operand);
            else if (isNestedStructuralExpression(operand)) flatten(operand);
            else supported = false;
            return;
        }
        if (ts.isTemplateExpression(current)) {
            for (let index = 0; index < current.templateSpans.length; index++) {
                const span = current.templateSpans[index]!;
                const value = options.unwrap(span.expression);
                if (isLiteral(value)) continue;
                if (ts.isAwaitExpression(value)) {
                    addAwait(value);
                } else if (awaitExprs.length === 0 &&
                    current.templateSpans.slice(index + 1).some((later) => containsAwait(later.expression))) {
                    prefixExprs.push(value);
                } else {
                    supported = false;
                    return;
                }
            }
            return;
        }
        if (ts.isTaggedTemplateExpression(current)) {
            if (!sourceCanRunBeforeSuspension(current.tag, options.allowNestedFunctionsInAwaitSource) ||
                !ts.isTemplateExpression(current.template)) {
                supported = false;
                return;
            }
            for (const span of current.template.templateSpans) {
                const value = options.unwrap(span.expression);
                if (isLiteral(value)) continue;
                if (!ts.isAwaitExpression(value)) {
                    supported = false;
                    return;
                }
                addAwait(value);
            }
            return;
        }
        if (ts.isArrayLiteralExpression(current)) {
            for (const element of current.elements) {
                if (ts.isSpreadElement(element)) {
                    flatten(options.unwrap(element.expression));
                    if (!supported) return;
                    continue;
                }
                const value = options.unwrap(element);
                if (isLiteral(value)) continue;
                if (ts.isAwaitExpression(value)) addAwait(value);
                else if (isNestedStructuralExpression(value)) flatten(value);
                else supported = false;
                if (!supported) return;
            }
            return;
        }
        if (ts.isPropertyAccessExpression(current)) {
            const receiver = options.unwrap(current.expression);
            if (ts.isAwaitExpression(receiver)) addAwait(receiver);
            else flatten(receiver);
            return;
        }
        if (ts.isElementAccessExpression(current)) {
            const components = [current.expression, current.argumentExpression];
            for (let index = 0; index < components.length; index++) {
                const value = options.unwrap(components[index]!);
                if (ts.isAwaitExpression(value)) {
                    addAwait(value);
                } else if (index === 0 &&
                    (ts.isArrayLiteralExpression(value) || ts.isObjectLiteralExpression(value) ||
                        ts.isNewExpression(value) || ts.isCallExpression(value) ||
                        ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value))) {
                    flatten(value);
                } else if (!sourceCanRunBeforeSuspension(value, options.allowNestedFunctionsInAwaitSource)) {
                    supported = false;
                }
                if (!supported) return;
            }
            return;
        }
        if (ts.isCallExpression(current) || ts.isNewExpression(current)) {
            const callee = options.unwrap(current.expression);
            if (ts.isAwaitExpression(callee)) addAwait(callee);
            else if (options.isStableSynchronousTail(callee)) {
                // Stable callee lookup may be deferred until the call resumes;
                // it does not mean later arguments have crossed a sync tail.
            } else if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) flatten(callee);
            else if (!sourceCanRunBeforeSuspension(
                current.expression,
                options.allowNestedFunctionsInAwaitSource,
            )) supported = false;
            if (!supported) return;
            for (const argument of current.arguments ?? []) {
                if (ts.isSpreadElement(argument)) {
                    flatten(options.unwrap(argument.expression));
                } else {
                    flatten(options.unwrap(argument));
                }
                if (!supported) return;
            }
            return;
        }
        if (ts.isObjectLiteralExpression(current)) {
            for (const property of current.properties) {
                if (ts.isSpreadAssignment(property)) {
                    flatten(options.unwrap(property.expression));
                    if (!supported) return;
                    continue;
                }
                if (!ts.isPropertyAssignment(property)) {
                    supported = false;
                    return;
                }
                const value = options.unwrap(property.initializer);
                if (isLiteral(value)) continue;
                if (ts.isAwaitExpression(value)) addAwait(value);
                else if (isNestedStructuralExpression(value)) flatten(value);
                else supported = false;
                if (!supported) return;
            }
            return;
        }
        if (ts.isAwaitExpression(current)) {
            addAwait(current);
            return;
        }
        supported = false;
    };

    flatten(expression);
    return supported && awaitExprs.length >= (options.minimumAwaitCount ?? 2)
        ? createPlan(expression, awaitExprs, undefined, prefixExprs)
        : null;
}
