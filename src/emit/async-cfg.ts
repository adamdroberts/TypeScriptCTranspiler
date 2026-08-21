import ts from "typescript";
import {
    planAsyncExpressionSequence,
    planAsyncFunctionCompletionEdge,
    planAsyncLogicalCondition,
    type AsyncFunctionCompletionEdge,
    type AsyncShortCircuitExit,
} from "./async-ir";

export type AsyncControlFlowTarget = { readonly kind: "state"; readonly id: number };

export interface AsyncControlFlowExceptionTarget {
    readonly target: AsyncControlFlowTarget;
}

type AsyncControlFlowStateCore =
    | {
        readonly kind: "sync";
        readonly id: number;
        readonly statement: ts.Statement;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "branch";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly truthy: AsyncControlFlowTarget;
        readonly falsy: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "iterator-init";
        readonly id: number;
        readonly statement: ts.ForInStatement | ts.ForOfStatement;
        readonly slot: number;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "iterator-next";
        readonly id: number;
        readonly statement: ts.ForInStatement | ts.ForOfStatement;
        readonly slot: number;
        readonly body: AsyncControlFlowTarget;
        readonly done: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "await-condition";
        readonly id: number;
        readonly awaitExpr: ts.AwaitExpression;
        readonly truthy: AsyncControlFlowTarget;
        readonly falsy: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "await-logical-condition";
        readonly id: number;
        readonly awaitExpr: ts.AwaitExpression;
        readonly truthy: AsyncControlFlowTarget;
        readonly falsy: AsyncControlFlowTarget;
        readonly nullish: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "logical-condition";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly truthy: AsyncControlFlowTarget;
        readonly falsy: AsyncControlFlowTarget;
        readonly nullish: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "completion";
        readonly id: number;
        readonly completion: AsyncFunctionCompletionEdge;
    }
    | {
        readonly kind: "await-return-value";
        readonly id: number;
        readonly target: AsyncControlFlowTarget | null;
    }
    | {
        readonly kind: "await-completion";
        readonly id: number;
        readonly completion: AsyncFunctionCompletionEdge & { readonly awaitExpr: ts.AwaitExpression };
    }
    | {
        readonly kind: "await-next";
        readonly id: number;
        readonly awaitExpr: ts.AwaitExpression;
        readonly assignment: ts.Identifier | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "await-dispose";
        readonly id: number;
        readonly declarations: readonly ts.VariableDeclaration[];
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "switch";
        readonly id: number;
        readonly statement: ts.SwitchStatement;
        readonly awaitExpr: ts.AwaitExpression | null;
        readonly clauses: readonly {
            readonly expression: ts.Expression | null;
            readonly target: AsyncControlFlowTarget;
        }[];
        readonly defaultTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "catch-bind";
        readonly id: number;
        readonly binding: ts.Identifier | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "throw-route";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly target: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "finally-enter";
        readonly id: number;
        readonly region: number;
        readonly completion: "normal" | "throw";
        readonly finallyTarget: AsyncControlFlowTarget;
        readonly normalTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "finally-exit";
        readonly id: number;
        readonly region: number;
        readonly returnTarget: AsyncControlFlowTarget | null;
    }
    | {
        readonly kind: "finally-return-enter";
        readonly id: number;
        readonly region: number;
        readonly finallyTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "return-route";
        readonly id: number;
        readonly completion: Extract<AsyncFunctionCompletionEdge, { readonly kind: "return" }>;
        readonly target: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "expression-sync";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly slot: number;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "expression-await";
        readonly id: number;
        readonly awaitExpr: ts.AwaitExpression;
        readonly slot: number;
        readonly next: AsyncControlFlowTarget;
        readonly completeTarget: AsyncControlFlowTarget;
        readonly shortCircuitExit: AsyncShortCircuitExit | null;
    }
    | {
        readonly kind: "expression-complete";
        readonly id: number;
        readonly expression: ts.Expression;
        readonly assignment: ts.Identifier | null;
        readonly completion: {
            readonly kind: "return" | "throw";
            readonly target: AsyncControlFlowTarget | null;
        } | null;
        readonly branch: {
            readonly mode: "truthy" | "nullish" | "tri";
            readonly truthy: AsyncControlFlowTarget;
            readonly falsy: AsyncControlFlowTarget;
            readonly nullish?: AsyncControlFlowTarget;
        } | null;
        readonly switchDispatch: {
            readonly statement: ts.SwitchStatement;
            readonly clauses: readonly {
                readonly expression: ts.Expression | null;
                readonly target: AsyncControlFlowTarget;
            }[];
            readonly defaultTarget: AsyncControlFlowTarget;
        } | null;
        readonly awaitExprs: readonly ts.AwaitExpression[];
        readonly next: AsyncControlFlowTarget;
    };

export type AsyncControlFlowState = AsyncControlFlowStateCore & {
    readonly exceptionTarget: AsyncControlFlowExceptionTarget | null;
};

export interface AsyncControlFlowGraph {
    readonly kind: "async-control-flow";
    readonly entry: AsyncControlFlowTarget;
    readonly states: readonly AsyncControlFlowState[];
    readonly declarations: readonly ts.VariableDeclaration[];
    readonly awaitCount: number;
    readonly loopAwaitDepth: number;
    readonly finallyCount: number;
    readonly iteratorCount: number;
    readonly expressionAwaits: readonly ts.AwaitExpression[];
    readonly expressionSyncs: readonly ts.Expression[];
}

export interface AsyncControlFlowPlannerOptions {
    readonly isStableSynchronousTail: (expression: ts.Expression) => boolean;
    readonly isStableBeforeSuspension?: (expression: ts.Expression) => boolean;
}

interface LoopTargets {
    readonly breakTarget: AsyncControlFlowTarget;
    readonly continueTarget: AsyncControlFlowTarget;
}

interface BuildContext {
    readonly loop: LoopTargets | null;
    readonly breakTarget: AsyncControlFlowTarget | null;
    readonly labels: ReadonlyMap<string, LoopTargets>;
    readonly exceptionTarget: AsyncControlFlowExceptionTarget | null;
    readonly returnTarget: AsyncControlFlowTarget | null;
}

export function planAsyncControlFlowGraph(
    body: ts.Block,
    options: AsyncControlFlowPlannerOptions,
): AsyncControlFlowGraph | null {
    const states: AsyncControlFlowState[] = [];
    const declarations: ts.VariableDeclaration[] = [];
    let supported = true;
    let awaitCount = 0;
    let loopAwaitDepth = 0;
    let currentLoopDepth = 0;
    let finallyCount = 0;
    let iteratorCount = 0;
    const expressionAwaits: ts.AwaitExpression[] = [];
    const expressionAwaitSlots = new Map<ts.AwaitExpression, number>();
    const expressionSyncs: ts.Expression[] = [];
    const expressionSyncSlots = new Map<ts.Expression, number>();

    const reserve = (): number => {
        const id = states.length;
        states.push(undefined as unknown as AsyncControlFlowState);
        return id;
    };
    const target = (id: number): AsyncControlFlowTarget => ({ kind: "state", id });
    const setState = (
        state: AsyncControlFlowStateCore,
        exceptionTarget: AsyncControlFlowExceptionTarget | null = null,
    ): AsyncControlFlowTarget => {
        states[state.id] = { ...state, exceptionTarget } as AsyncControlFlowState;
        return target(state.id);
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
    const containsNestedFunctionOrClass = (node: ts.Node): boolean => {
        let found = false;
        const visit = (current: ts.Node): void => {
            if (found) return;
            if (current !== node && (ts.isFunctionLike(current) || ts.isClassLike(current))) {
                found = true;
                return;
            }
            ts.forEachChild(current, visit);
        };
        visit(node);
        return found;
    };
    const opaqueSynchronousLoopSupported = (
        node: ts.ForInStatement | ts.ForOfStatement,
        localLabel: string | null = null,
    ): boolean => {
        let ok = true;
        const visit = (current: ts.Node): void => {
            if (!ok || ts.isFunctionLike(current) || ts.isClassLike(current)) return;
            const labelledCompletion = (ts.isBreakStatement(current) || ts.isContinueStatement(current)) &&
                current.label
                ? current.label.text
                : null;
            if (ts.isAwaitExpression(current) || ts.isReturnStatement(current) ||
                (labelledCompletion !== null && labelledCompletion !== localLabel)) {
                ok = false;
                return;
            }
            if (ts.isVariableDeclarationList(current) &&
                (current.flags & ts.NodeFlags.BlockScoped) === 0) {
                // A `var` binding escapes the atomic loop state and must be
                // represented as CFG storage before this path may accept it.
                ok = false;
                return;
            }
            ts.forEachChild(current, visit);
        };
        visit(node);
        return ok;
    };
    const unwrapExpression = (expression: ts.Expression): ts.Expression => {
        let current = expression;
        while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
            ts.isTypeAssertionExpression(current) || ts.isNonNullExpression(current) ||
            ts.isSatisfiesExpression(current)) {
            current = current.expression;
        }
        return current;
    };
    const commaSequence = (expression: ts.Expression): readonly ts.Expression[] | null => {
        const values: ts.Expression[] = [];
        const flatten = (node: ts.Expression): void => {
            const current = unwrapExpression(node);
            if (ts.isBinaryExpression(current) &&
                current.operatorToken.kind === ts.SyntaxKind.CommaToken) {
                flatten(current.left);
                flatten(current.right);
                return;
            }
            values.push(node);
        };
        flatten(expression);
        return values.length > 1 ? values : null;
    };
    const collectDeclarations = (statement: ts.VariableStatement): void => {
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) {
                supported = false;
                return;
            }
            declarations.push(declaration);
        }
    };
    const buildExpressionSequence = (
        expression: ts.Expression,
        assignment: ts.Identifier | null,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        completion: { readonly kind: "return" | "throw"; readonly target: AsyncControlFlowTarget | null } | null = null,
        branch: {
            readonly mode: "truthy" | "nullish" | "tri";
            readonly truthy: AsyncControlFlowTarget;
            readonly falsy: AsyncControlFlowTarget;
            readonly nullish?: AsyncControlFlowTarget;
        } | null = null,
        switchDispatch: {
            readonly statement: ts.SwitchStatement;
            readonly clauses: readonly { readonly expression: ts.Expression | null; readonly target: AsyncControlFlowTarget }[];
            readonly defaultTarget: AsyncControlFlowTarget;
        } | null = null,
    ): AsyncControlFlowTarget | null => {
        const plan = planAsyncExpressionSequence(expression, {
            unwrap: unwrapExpression,
            isStableSynchronousTail: options.isStableSynchronousTail,
            isStableBeforeSuspension: options.isStableBeforeSuspension,
            minimumAwaitCount: 1,
            allowNestedFunctionsInAwaitSource: true,
        });
        if (!plan) return null;
        const completeId = reserve();
        const completeTarget = setState({
            kind: "expression-complete",
            id: completeId,
            expression,
            assignment,
            completion,
            branch,
            switchDispatch,
            awaitExprs: plan.awaitExprs,
            next,
        }, context.exceptionTarget);
        let successor = completeTarget;
        for (let index = plan.states.length - 1; index >= 0; index--) {
            const plannedState = plan.states[index]!;
            let slot = expressionAwaitSlots.get(plannedState.awaitExpr);
            if (slot === undefined) {
                slot = expressionAwaits.length;
                expressionAwaits.push(plannedState.awaitExpr);
                expressionAwaitSlots.set(plannedState.awaitExpr, slot);
            }
            const id = reserve();
            successor = setState({
                kind: "expression-await",
                id,
                awaitExpr: plannedState.awaitExpr,
                slot,
                next: successor,
                completeTarget,
                shortCircuitExit: plannedState.shortCircuitExit ?? null,
            }, context.exceptionTarget);
        }
        for (let index = plan.prefixExprs.length - 1; index >= 0; index--) {
            const expression = plan.prefixExprs[index]!;
            let slot = expressionSyncSlots.get(expression);
            if (slot === undefined) {
                slot = expressionSyncs.length;
                expressionSyncs.push(expression);
                expressionSyncSlots.set(expression, slot);
            }
            const id = reserve();
            successor = setState({
                kind: "expression-sync",
                id,
                expression,
                slot,
                next: successor,
            }, context.exceptionTarget);
        }
        awaitCount += plan.awaitExprs.length;
        return successor;
    };
    const buildLogicalCondition = (
        expression: ts.Expression,
        truthy: AsyncControlFlowTarget,
        falsy: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const plan = planAsyncLogicalCondition(expression, {
            unwrap: unwrapExpression,
            allowNestedFunctionsInAwaitSource: true,
        });
        if (!plan) return null;
        const ids = plan.states.map(() => reserve());
        const resolveTarget = (conditionTarget: typeof plan.entry): AsyncControlFlowTarget => {
            if (conditionTarget.kind === "body") return truthy;
            if (conditionTarget.kind === "fallthrough") return falsy;
            return target(ids[conditionTarget.id]!);
        };
        for (const state of plan.states) {
            if (state.kind === "await-condition") {
                setState({
                    kind: "await-logical-condition",
                    id: ids[state.id]!,
                    awaitExpr: state.awaitExpr,
                    truthy: resolveTarget(state.truthy),
                    falsy: resolveTarget(state.falsy),
                    nullish: resolveTarget(state.nullish),
                }, context.exceptionTarget);
            } else {
                setState({
                    kind: "logical-condition",
                    id: ids[state.id]!,
                    expression: state.expression,
                    truthy: resolveTarget(state.truthy),
                    falsy: resolveTarget(state.falsy),
                    nullish: resolveTarget(state.nullish),
                }, context.exceptionTarget);
            }
        }
        awaitCount += plan.awaitExprs.length;
        return resolveTarget(plan.entry);
    };
    type ExpressionCompletion = {
        readonly kind: "return" | "throw";
        readonly target: AsyncControlFlowTarget | null;
    } | null;
    type ExpressionBranch = {
        readonly mode: "truthy" | "nullish" | "tri";
        readonly truthy: AsyncControlFlowTarget;
        readonly falsy: AsyncControlFlowTarget;
        readonly nullish?: AsyncControlFlowTarget;
    } | null;
    type ExpressionSwitchDispatch = {
        readonly statement: ts.SwitchStatement;
        readonly clauses: readonly { readonly expression: ts.Expression | null; readonly target: AsyncControlFlowTarget }[];
        readonly defaultTarget: AsyncControlFlowTarget;
    } | null;
    const buildConditionRoute3 = (
        expression: ts.Expression,
        truthy: AsyncControlFlowTarget,
        falsy: AsyncControlFlowTarget,
        nullish: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const condition = unwrapExpression(expression);
        if (ts.isAwaitExpression(condition)) {
            const id = reserve();
            awaitCount++;
            return setState({
                kind: "await-logical-condition",
                id,
                awaitExpr: condition,
                truthy,
                falsy,
                nullish,
            }, context.exceptionTarget);
        }
        if (ts.isConditionalExpression(condition)) {
            const whenTrue = buildConditionRoute3(
                condition.whenTrue, truthy, falsy, nullish, context,
            );
            const whenFalse = buildConditionRoute3(
                condition.whenFalse, truthy, falsy, nullish, context,
            );
            if (!whenTrue || !whenFalse) return null;
            return buildConditionRoute3(
                condition.condition, whenTrue, whenFalse, whenFalse, context,
            );
        }
        if (ts.isBinaryExpression(condition)) {
            const operator = condition.operatorToken.kind;
            if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
                const right = buildConditionRoute3(
                    condition.right, truthy, falsy, nullish, context,
                );
                return right
                    ? buildConditionRoute3(condition.left, right, falsy, nullish, context)
                    : null;
            }
            if (operator === ts.SyntaxKind.BarBarToken) {
                const right = buildConditionRoute3(
                    condition.right, truthy, falsy, nullish, context,
                );
                return right
                    ? buildConditionRoute3(condition.left, truthy, right, right, context)
                    : null;
            }
            if (operator === ts.SyntaxKind.QuestionQuestionToken) {
                const right = buildConditionRoute3(
                    condition.right, truthy, falsy, nullish, context,
                );
                return right
                    ? buildConditionRoute3(condition.left, truthy, falsy, right, context)
                    : null;
            }
        }
        if (containsAwait(condition)) {
            return buildExpressionSequence(
                condition,
                null,
                falsy,
                context,
                null,
                { mode: "tri", truthy, falsy, nullish },
            );
        }
        const id = reserve();
        return setState({
            kind: "logical-condition",
            id,
            expression: condition,
            truthy,
            falsy,
            nullish,
        }, context.exceptionTarget);
    };
    const buildConditionRoute = (
        expression: ts.Expression,
        truthy: AsyncControlFlowTarget,
        falsy: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        return buildConditionRoute3(expression, truthy, falsy, falsy, context);
    };
    const buildConditionalValueExpression = (
        expression: ts.Expression,
        assignment: ts.Identifier | null,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        completion: ExpressionCompletion = null,
        switchDispatch: ExpressionSwitchDispatch = null,
    ): AsyncControlFlowTarget | null => {
        const current = unwrapExpression(expression);
        if (!ts.isConditionalExpression(current)) return null;
        const buildArm = (arm: ts.Expression): AsyncControlFlowTarget | null => {
            const nested = buildConditionalValueExpression(
                arm,
                assignment,
                next,
                context,
                completion,
                switchDispatch,
            ) ?? buildLogicalValueExpression(
                arm,
                assignment,
                next,
                context,
                completion,
                switchDispatch,
            );
            if (nested) return nested;
            if (containsAwait(arm)) {
                return buildExpressionSequence(
                    arm,
                    assignment,
                    next,
                    context,
                    completion,
                    null,
                    switchDispatch,
                );
            }
            const id = reserve();
            return setState({
                kind: "expression-complete",
                id,
                expression: arm,
                assignment,
                completion,
                branch: null,
                switchDispatch,
                awaitExprs: [],
                next,
            }, context.exceptionTarget);
        };
        const truthy = buildArm(current.whenTrue);
        const falsy = buildArm(current.whenFalse);
        if (!truthy || !falsy) return null;
        return buildConditionRoute(current.condition, truthy, falsy, context);
    };
    const buildLogicalValueExpression = (
        expression: ts.Expression,
        assignment: ts.Identifier | null,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        completion: ExpressionCompletion = null,
        switchDispatch: ExpressionSwitchDispatch = null,
    ): AsyncControlFlowTarget | null => {
        const current = unwrapExpression(expression);
        if (!ts.isBinaryExpression(current)) return null;
        const operator = current.operatorToken.kind;
        if (operator !== ts.SyntaxKind.AmpersandAmpersandToken &&
            operator !== ts.SyntaxKind.BarBarToken &&
            operator !== ts.SyntaxKind.QuestionQuestionToken) return null;
        const left = unwrapExpression(current.left);
        if (containsAwait(left) || !options.isStableSynchronousTail(left) ||
            (!ts.isIdentifier(left) && !options.isStableBeforeSuspension?.(left))) return null;
        const complete = (value: ts.Expression): AsyncControlFlowTarget | null => {
            const nested = buildConditionalValueExpression(
                value, assignment, next, context, completion, switchDispatch,
            ) ?? buildLogicalValueExpression(
                value, assignment, next, context, completion, switchDispatch,
            );
            if (nested) return nested;
            if (containsAwait(value)) {
                return buildExpressionSequence(
                    value, assignment, next, context, completion, null, switchDispatch,
                );
            }
            const id = reserve();
            return setState({
                kind: "expression-complete",
                id,
                expression: value,
                assignment,
                completion,
                branch: null,
                switchDispatch,
                awaitExprs: [],
                next,
            }, context.exceptionTarget);
        };
        const leftComplete = complete(current.left);
        const rightComplete = complete(current.right);
        if (!leftComplete || !rightComplete) return null;
        const id = reserve();
        const takeRight = operator === ts.SyntaxKind.AmpersandAmpersandToken
            ? { mode: "truthy" as const, truthy: rightComplete, falsy: leftComplete }
            : operator === ts.SyntaxKind.BarBarToken
                ? { mode: "truthy" as const, truthy: leftComplete, falsy: rightComplete }
                : { mode: "nullish" as const, truthy: rightComplete, falsy: leftComplete };
        return setState({
            kind: "expression-complete",
            id,
            expression: current.left,
            assignment: null,
            completion: null,
            branch: takeRight,
            switchDispatch: null,
            awaitExprs: [],
            next,
        }, context.exceptionTarget);
    };

    const buildSequence = (
        sequence: readonly ts.Statement[],
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const firstAwaitUsing = sequence.findIndex((statement) =>
            ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing);
        if (firstAwaitUsing >= 0) {
            return buildAwaitUsingScope(sequence, firstAwaitUsing, next, context);
        }
        let entry = next;
        for (let index = sequence.length - 1; index >= 0 && supported; index--) {
            entry = buildStatement(sequence[index]!, entry, context);
        }
        return entry;
    };

    const buildFinalizationRegion = (
        next: AsyncControlFlowTarget,
        context: BuildContext,
        buildFinalizer: (exit: AsyncControlFlowTarget) => AsyncControlFlowTarget,
        buildProtected: (
            normalEnter: AsyncControlFlowTarget,
            throwEnter: AsyncControlFlowTarget,
            protectedContext: BuildContext,
        ) => AsyncControlFlowTarget,
    ): AsyncControlFlowTarget => {
        const region = finallyCount++;
        const finallyExitId = reserve();
        const finallyExitTarget = target(finallyExitId);
        const finallyEntry = buildFinalizer(finallyExitTarget);

        const normalEnterId = reserve();
        const normalEnter = setState({
            kind: "finally-enter",
            id: normalEnterId,
            region,
            completion: "normal",
            finallyTarget: finallyEntry,
            normalTarget: next,
        }, context.exceptionTarget);
        const throwEnterId = reserve();
        const throwEnter = setState({
            kind: "finally-enter",
            id: throwEnterId,
            region,
            completion: "throw",
            finallyTarget: finallyEntry,
            normalTarget: next,
        }, context.exceptionTarget);
        const returnEnterId = reserve();
        const returnEnter = setState({
            kind: "finally-return-enter",
            id: returnEnterId,
            region,
            finallyTarget: finallyEntry,
        }, context.exceptionTarget);
        setState({
            kind: "finally-exit",
            id: finallyExitId,
            region,
            returnTarget: context.returnTarget,
        }, context.exceptionTarget);

        const wrappedTargets = new Map<number, AsyncControlFlowTarget>([[next.id, normalEnter]]);
        const wrapTarget = (original: AsyncControlFlowTarget): AsyncControlFlowTarget => {
            const existing = wrappedTargets.get(original.id);
            if (existing) return existing;
            const id = reserve();
            const wrapped = setState({
                kind: "finally-enter",
                id,
                region,
                completion: "normal",
                finallyTarget: finallyEntry,
                normalTarget: original,
            }, context.exceptionTarget);
            wrappedTargets.set(original.id, wrapped);
            return wrapped;
        };
        const protectedContext: BuildContext = {
            ...context,
            loop: context.loop
                ? {
                    breakTarget: wrapTarget(context.loop.breakTarget),
                    continueTarget: wrapTarget(context.loop.continueTarget),
                }
                : null,
            breakTarget: context.breakTarget ? wrapTarget(context.breakTarget) : null,
            labels: new Map([...context.labels].map(([label, targets]) => [
                label,
                {
                    breakTarget: wrapTarget(targets.breakTarget),
                    continueTarget: wrapTarget(targets.continueTarget),
                },
            ])),
            returnTarget: returnEnter,
        };
        return buildProtected(normalEnter, throwEnter, protectedContext);
    };

    const buildAwaitUsingScope = (
        sequence: readonly ts.Statement[],
        firstAwaitUsing: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const prefix = sequence.slice(0, firstAwaitUsing);
        const protectedStatements = sequence.slice(firstAwaitUsing);
        const resources: ts.VariableDeclaration[] = [];
        const normalized = protectedStatements.map((statement) => {
            if (!ts.isVariableStatement(statement) ||
                (statement.declarationList.flags & ts.NodeFlags.AwaitUsing) !== ts.NodeFlags.AwaitUsing) {
                return statement;
            }
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
                    supported = false;
                    return statement;
                }
                resources.push(declaration);
            }
            return ts.factory.createVariableStatement(
                statement.modifiers,
                ts.factory.createVariableDeclarationList(
                    statement.declarationList.declarations,
                    ts.NodeFlags.Const,
                ),
            );
        });
        if (!supported || resources.length === 0) return next;
        const protectedEntry = buildFinalizationRegion(
            next,
            context,
            (finallyExit) => {
                const id = reserve();
                awaitCount++;
                return setState({
                    kind: "await-dispose",
                    id,
                    declarations: resources,
                    next: finallyExit,
                }, context.exceptionTarget);
            },
            (normalEnter, throwEnter, protectedContext) => buildSequence(
                normalized,
                normalEnter,
                { ...protectedContext, exceptionTarget: { target: throwEnter } },
            ),
        );
        return buildSequence(prefix, protectedEntry, context);
    };

    const buildLoop = (
        statement: ts.WhileStatement | ts.DoStatement | ts.ForStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        const conditionId = reserve();
        const conditionTarget = target(conditionId);
        let continueTarget = conditionTarget;
        if (ts.isForStatement(statement) && statement.incrementor) {
            continueTarget = buildStatement(
                ts.factory.createExpressionStatement(statement.incrementor),
                conditionTarget,
                context,
            );
            if (!supported) return next;
        }
        const loopTargets = { breakTarget: next, continueTarget };
        const labels = new Map(context.labels);
        if (label) labels.set(label, loopTargets);
        currentLoopDepth++;
        const loopBody = ts.isBlock(statement.statement)
            ? statement.statement.statements
            : [statement.statement];
        const bodyEntry = buildSequence(loopBody, continueTarget, {
            loop: loopTargets,
            breakTarget: loopTargets.breakTarget,
            labels,
            exceptionTarget: context.exceptionTarget,
            returnTarget: context.returnTarget,
        });
        currentLoopDepth--;
        const rawCondition = unwrapExpression(ts.isForStatement(statement)
            ? statement.condition ?? ts.factory.createTrue()
            : statement.expression);
        if (ts.isAwaitExpression(rawCondition)) {
            awaitCount++;
            loopAwaitDepth = Math.max(loopAwaitDepth, currentLoopDepth + 1);
            setState({
                kind: "await-condition",
                id: conditionId,
                awaitExpr: rawCondition,
                truthy: bodyEntry,
                falsy: next,
            }, context.exceptionTarget);
        } else if (!containsAwait(rawCondition)) {
            setState({
                kind: "branch",
                id: conditionId,
                expression: rawCondition,
                truthy: bodyEntry,
                falsy: next,
            }, context.exceptionTarget);
        } else {
            const conditionEntry = buildLogicalCondition(
                rawCondition,
                bodyEntry,
                next,
                context,
            ) ?? buildExpressionSequence(
                rawCondition,
                null,
                next,
                context,
                null,
                { mode: "truthy", truthy: bodyEntry, falsy: next },
            );
            if (!conditionEntry) {
                supported = false;
                return next;
            }
            // The reserved direct-condition state is unused when the general
            // expression plan owns condition evaluation.
            states[conditionId] = {
                kind: "sync",
                id: conditionId,
                statement: ts.factory.createEmptyStatement(),
                next: conditionEntry,
                exceptionTarget: context.exceptionTarget,
            };
        }
        let entry = ts.isDoStatement(statement) ? bodyEntry : conditionTarget;
        if (ts.isForStatement(statement) && statement.initializer) {
            const initializer = ts.isVariableDeclarationList(statement.initializer)
                ? ts.factory.createVariableStatement(undefined, statement.initializer)
                : ts.factory.createExpressionStatement(statement.initializer);
            entry = buildStatement(initializer, entry, context);
        }
        return entry;
    };

    const buildIteratorLoop = (
        statement: ts.ForInStatement | ts.ForOfStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        if ((ts.isForOfStatement(statement) && statement.awaitModifier) ||
            containsAwait(statement.expression)) {
            supported = false;
            return next;
        }
        if (ts.isVariableDeclarationList(statement.initializer)) {
            if (statement.initializer.declarations.length !== 1) {
                supported = false;
                return next;
            }
            const declaration = statement.initializer.declarations[0]!;
            if (!ts.isIdentifier(declaration.name) || declaration.initializer) {
                supported = false;
                return next;
            }
            declarations.push(declaration);
        } else if (!ts.isIdentifier(statement.initializer)) {
            supported = false;
            return next;
        }
        const slot = iteratorCount++;
        const initId = reserve();
        const nextId = reserve();
        const nextTarget = target(nextId);
        const loopTargets = { breakTarget: next, continueTarget: nextTarget };
        const labels = new Map(context.labels);
        if (label) labels.set(label, loopTargets);
        currentLoopDepth++;
        const loopBody = ts.isBlock(statement.statement)
            ? statement.statement.statements
            : [statement.statement];
        const bodyEntry = buildSequence(loopBody, nextTarget, {
            loop: loopTargets,
            breakTarget: loopTargets.breakTarget,
            labels,
            exceptionTarget: context.exceptionTarget,
            returnTarget: context.returnTarget,
        });
        currentLoopDepth--;
        setState({
            kind: "iterator-next",
            id: nextId,
            statement,
            slot,
            body: bodyEntry,
            done: next,
        }, context.exceptionTarget);
        return setState({
            kind: "iterator-init",
            id: initId,
            statement,
            slot,
            next: nextTarget,
        }, context.exceptionTarget);
    };

    const buildStatement = (
        statement: ts.Statement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        if (ts.isBlock(statement)) return buildSequence(statement.statements, next, context);
        if (ts.isLabeledStatement(statement)) {
            if (ts.isWhileStatement(statement.statement) || ts.isDoStatement(statement.statement) ||
                ts.isForStatement(statement.statement)) {
                return buildLoop(statement.statement, next, context, statement.label.text);
            }
            if ((ts.isForInStatement(statement.statement) || ts.isForOfStatement(statement.statement)) &&
                !containsNestedFunctionOrClass(statement)) {
                if (opaqueSynchronousLoopSupported(statement.statement, statement.label.text)) {
                    const id = reserve();
                    return setState({ kind: "sync", id, statement, next }, context.exceptionTarget);
                }
                return buildIteratorLoop(statement.statement, next, context, statement.label.text);
            }
            supported = false;
            return next;
        }
        if (ts.isWhileStatement(statement) || ts.isDoStatement(statement) || ts.isForStatement(statement)) {
            return buildLoop(statement, next, context, null);
        }
        if ((ts.isForInStatement(statement) || ts.isForOfStatement(statement)) &&
            !containsNestedFunctionOrClass(statement)) {
            if (opaqueSynchronousLoopSupported(statement)) {
                const id = reserve();
                return setState({ kind: "sync", id, statement, next }, context.exceptionTarget);
            }
            return buildIteratorLoop(statement, next, context, null);
        }
        if (ts.isIfStatement(statement)) {
            const truthy = buildStatement(statement.thenStatement, next, context);
            const falsy = statement.elseStatement
                ? buildStatement(statement.elseStatement, next, context)
                : next;
            const condition = unwrapExpression(statement.expression);
            if (ts.isAwaitExpression(condition)) {
                const id = reserve();
                awaitCount++;
                return setState(
                    { kind: "await-condition", id, awaitExpr: condition, truthy, falsy },
                    context.exceptionTarget,
                );
            }
            if (containsAwait(condition)) {
                const entry = buildLogicalCondition(
                    condition,
                    truthy,
                    falsy,
                    context,
                ) ?? buildExpressionSequence(
                    condition,
                    null,
                    next,
                    context,
                    null,
                    { mode: "truthy", truthy, falsy },
                );
                if (entry) return entry;
                supported = false;
                return next;
            }
            const id = reserve();
            return setState(
                { kind: "branch", id, expression: condition, truthy, falsy },
                context.exceptionTarget,
            );
        }
        if (ts.isSwitchStatement(statement)) {
            const discriminator = unwrapExpression(statement.expression);
            const switchAwaitExpr = ts.isAwaitExpression(discriminator) ? discriminator : null;
            if (switchAwaitExpr) awaitCount++;
            const clauses: { expression: ts.Expression | null; target: AsyncControlFlowTarget }[] =
                new Array(statement.caseBlock.clauses.length);
            let fallthrough = next;
            for (let index = statement.caseBlock.clauses.length - 1; index >= 0 && supported; index--) {
                const clause = statement.caseBlock.clauses[index]!;
                if (ts.isCaseClause(clause) && containsAwait(clause.expression)) {
                    supported = false;
                    return next;
                }
                const entry = buildSequence(clause.statements, fallthrough, {
                    ...context,
                    breakTarget: next,
                });
                clauses[index] = {
                    expression: ts.isCaseClause(clause) ? clause.expression : null,
                    target: entry,
                };
                fallthrough = entry;
            }
            const defaultClause = clauses.find((clause) => clause.expression === null);
            const defaultTarget = defaultClause?.target ?? next;
            if (!switchAwaitExpr && containsAwait(discriminator)) {
                const switchDispatch = { statement, clauses, defaultTarget };
                const entry = buildConditionalValueExpression(
                    discriminator,
                    null,
                    next,
                    context,
                    null,
                    switchDispatch,
                ) ?? buildLogicalValueExpression(
                    discriminator,
                    null,
                    next,
                    context,
                    null,
                    switchDispatch,
                ) ?? buildExpressionSequence(
                    discriminator,
                    null,
                    next,
                    context,
                    null,
                    null,
                    switchDispatch,
                );
                if (entry) return entry;
                supported = false;
                return next;
            }
            const id = reserve();
            return setState({
                kind: "switch",
                id,
                statement,
                awaitExpr: switchAwaitExpr,
                clauses,
                defaultTarget,
            }, context.exceptionTarget);
        }
        if (ts.isTryStatement(statement)) {
            const buildCatchEntry = (
                catchClause: ts.CatchClause,
                catchNext: AsyncControlFlowTarget,
                catchContext: BuildContext,
            ): AsyncControlFlowTarget => {
                let catchEntry = buildSequence(catchClause.block.statements, catchNext, catchContext);
                const binding = catchClause.variableDeclaration?.name ?? null;
                if (binding && !ts.isIdentifier(binding)) {
                    supported = false;
                    return catchNext;
                }
                if (catchClause.variableDeclaration) declarations.push(catchClause.variableDeclaration);
                const catchBindId = reserve();
                catchEntry = setState({
                    kind: "catch-bind",
                    id: catchBindId,
                    binding,
                    next: catchEntry,
                }, catchContext.exceptionTarget);
                return catchEntry;
            };
            if (!statement.finallyBlock) {
                if (!statement.catchClause) {
                    supported = false;
                    return next;
                }
                const catchEntry = buildCatchEntry(statement.catchClause, next, context);
                return buildSequence(statement.tryBlock.statements, next, {
                    ...context,
                    exceptionTarget: { target: catchEntry },
                });
            }
            return buildFinalizationRegion(
                next,
                context,
                (finallyExit) => buildSequence(statement.finallyBlock!.statements, finallyExit, context),
                (normalEnter, throwEnter, protectedContext) => {
                    let tryExceptionTarget = throwEnter;
                    if (statement.catchClause) {
                        const catchEntry = buildCatchEntry(statement.catchClause, normalEnter, {
                            ...protectedContext,
                            exceptionTarget: { target: throwEnter },
                        });
                        tryExceptionTarget = catchEntry;
                    }
                    return buildSequence(statement.tryBlock.statements, normalEnter, {
                        ...protectedContext,
                        exceptionTarget: { target: tryExceptionTarget },
                    });
                },
            );
        }
        if (ts.isBreakStatement(statement) || ts.isContinueStatement(statement)) {
            if (statement.label) {
                const targets = context.labels.get(statement.label.text) ?? null;
                if (!targets) {
                    supported = false;
                    return next;
                }
                return ts.isBreakStatement(statement) ? targets.breakTarget : targets.continueTarget;
            }
            const targetForCompletion = ts.isBreakStatement(statement)
                ? context.breakTarget
                : context.loop?.continueTarget ?? null;
            if (!targetForCompletion) {
                supported = false;
                return next;
            }
            return targetForCompletion;
        }
        if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) {
            const completion = planAsyncFunctionCompletionEdge(statement, (expression) => expression);
            if (!completion) return next;
            const awaitExpr = completion.awaitExpr;
            const nestedCompletionValue = awaitExpr && containsAwait(awaitExpr.expression)
                ? awaitExpr.expression
                : !awaitExpr && completion.value && containsAwait(completion.value)
                    ? completion.value
                    : null;
            if (nestedCompletionValue) {
                let nestedReturnTarget = context.returnTarget;
                if (awaitExpr && completion.kind === "return") {
                    const outerAwaitId = reserve();
                    nestedReturnTarget = setState({
                        kind: "await-return-value",
                        id: outerAwaitId,
                        target: context.returnTarget,
                    }, context.exceptionTarget);
                    awaitCount++;
                }
                const expressionCompletion = {
                    kind: completion.kind,
                    target: completion.kind === "return" ? nestedReturnTarget : null,
                } as const;
                const sequence = buildConditionalValueExpression(
                    nestedCompletionValue,
                    null,
                    next,
                    context,
                    expressionCompletion,
                ) ?? buildLogicalValueExpression(
                    nestedCompletionValue,
                    null,
                    next,
                    context,
                    expressionCompletion,
                ) ?? buildExpressionSequence(
                    nestedCompletionValue,
                    null,
                    next,
                    context,
                    expressionCompletion,
                );
                if (sequence) return sequence;
                supported = false;
                return next;
            }
            const id = reserve();
            if (completion.kind === "return" && context.returnTarget) {
                if (awaitExpr) awaitCount++;
                return setState({
                    kind: "return-route",
                    id,
                    completion,
                    target: context.returnTarget,
                }, context.exceptionTarget);
            }
            if (completion.kind === "throw" && !awaitExpr && context.exceptionTarget) {
                return setState({
                    kind: "throw-route",
                    id,
                    expression: completion.value,
                    target: context.exceptionTarget.target,
                }, context.exceptionTarget);
            }
            if (awaitExpr) {
                awaitCount++;
                return setState({
                    kind: "await-completion",
                    id,
                    completion: { ...completion, awaitExpr },
                }, context.exceptionTarget);
            }
            return setState({ kind: "completion", id, completion }, context.exceptionTarget);
        }
        if (ts.isVariableStatement(statement)) {
            if (statement.declarationList.declarations.length > 1 && containsAwait(statement)) {
                // Declaration-list initializers execute from left to right. Split
                // an await-bearing list into the same ordered declarations so
                // each suspension is represented by the ordinary declaration
                // state instead of making the whole `for` initializer opaque.
                const declarations = statement.declarationList.declarations.map((declaration) =>
                    ts.factory.createVariableStatement(
                        statement.modifiers,
                        ts.factory.createVariableDeclarationList(
                            [declaration],
                            statement.declarationList.flags,
                        ),
                    ));
                return buildSequence(declarations, next, context);
            }
            collectDeclarations(statement);
            if (!supported) return next;
            if (statement.declarationList.declarations.length === 1) {
                const declaration = statement.declarationList.declarations[0]!;
                const initializer = declaration.initializer
                    ? unwrapExpression(declaration.initializer)
                    : null;
                if (initializer && ts.isAwaitExpression(initializer)) {
                    if (!ts.isIdentifier(declaration.name)) {
                        supported = false;
                        return next;
                    }
                    awaitCount++;
                    const id = reserve();
                    return setState({
                        kind: "await-next",
                        id,
                        awaitExpr: initializer,
                        assignment: declaration.name,
                        next,
                    }, context.exceptionTarget);
                }
                if (initializer && containsAwait(initializer)) {
                    if (!ts.isIdentifier(declaration.name)) {
                        supported = false;
                        return next;
                    }
                    const sequence = buildConditionalValueExpression(
                        initializer,
                        declaration.name,
                        next,
                        context,
                    ) ?? buildLogicalValueExpression(
                        initializer,
                        declaration.name,
                        next,
                        context,
                    ) ?? buildExpressionSequence(
                        initializer,
                        declaration.name,
                        next,
                        context,
                    );
                    if (sequence) return sequence;
                }
            }
        }
        if (ts.isExpressionStatement(statement)) {
            const expression = unwrapExpression(statement.expression);
            const commaExpressions = containsAwait(expression)
                ? commaSequence(expression)
                : null;
            if (commaExpressions) {
                return buildSequence(
                    commaExpressions.map((value) => ts.factory.createExpressionStatement(value)),
                    next,
                    context,
                );
            }
            if (ts.isAwaitExpression(expression)) {
                awaitCount++;
                const id = reserve();
                return setState({
                    kind: "await-next",
                    id,
                    awaitExpr: expression,
                    assignment: null,
                    next,
                }, context.exceptionTarget);
            }
            if (ts.isBinaryExpression(expression) &&
                expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                ts.isIdentifier(expression.left)) {
                const right = unwrapExpression(expression.right);
                if (ts.isAwaitExpression(right)) {
                    awaitCount++;
                    const id = reserve();
                    return setState({
                        kind: "await-next",
                        id,
                        awaitExpr: right,
                        assignment: expression.left,
                        next,
                    }, context.exceptionTarget);
                }
                if (containsAwait(right)) {
                    const sequence = buildConditionalValueExpression(
                        right,
                        expression.left,
                        next,
                        context,
                    ) ?? buildLogicalValueExpression(
                        right,
                        expression.left,
                        next,
                        context,
                    ) ?? buildExpressionSequence(right, expression.left, next, context);
                    if (sequence) return sequence;
                }
            }
            if (containsAwait(expression)) {
                const sequence = buildConditionalValueExpression(
                    expression,
                    null,
                    next,
                    context,
                ) ?? buildLogicalValueExpression(
                    expression,
                    null,
                    next,
                    context,
                ) ?? buildExpressionSequence(expression, null, next, context);
                if (sequence) return sequence;
            }
        }
        if (containsAwait(statement) ||
            containsNestedFunctionOrClass(statement) ||
            ((ts.isForInStatement(statement) || ts.isForOfStatement(statement)) &&
                !opaqueSynchronousLoopSupported(statement)) ||
            ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
            supported = false;
            return next;
        }
        const id = reserve();
        return setState({ kind: "sync", id, statement, next }, context.exceptionTarget);
    };

    const unreachableCompletion = ts.factory.createReturnStatement();
    const terminalId = reserve();
    const terminal = planAsyncFunctionCompletionEdge(unreachableCompletion, (expression) => expression)!;
    states[terminalId] = { kind: "completion", id: terminalId, completion: terminal, exceptionTarget: null };
    const entry = buildSequence(body.statements, target(terminalId), {
        loop: null,
        breakTarget: null,
        labels: new Map(),
        exceptionTarget: null,
        returnTarget: null,
    });
    if (!supported || states.some((state) => !state)) return null;
    let reachableIds = new Set<number>();
    const successors = (state: AsyncControlFlowState): AsyncControlFlowTarget[] => {
        const targets: AsyncControlFlowTarget[] = [];
        if (state.exceptionTarget) targets.push(state.exceptionTarget.target);
        switch (state.kind) {
            case "sync":
            case "expression-sync":
            case "await-next":
            case "await-dispose":
            case "catch-bind":
                targets.push(state.next);
                break;
            case "expression-complete":
                if (state.switchDispatch) {
                    targets.push(...state.switchDispatch.clauses.map((clause) => clause.target), state.switchDispatch.defaultTarget);
                } else if (state.branch) {
                    targets.push(state.branch.truthy, state.branch.falsy);
                    if (state.branch.nullish) targets.push(state.branch.nullish);
                } else if (state.completion?.kind === "return" && state.completion.target) {
                    targets.push(state.completion.target);
                } else if (!state.completion) {
                    targets.push(state.next);
                }
                break;
            case "branch":
            case "await-condition":
                targets.push(state.truthy, state.falsy);
                break;
            case "iterator-init":
                targets.push(state.next);
                break;
            case "iterator-next":
                targets.push(state.body, state.done);
                break;
            case "await-logical-condition":
            case "logical-condition":
                targets.push(state.truthy, state.falsy, state.nullish);
                break;
            case "switch":
                targets.push(...state.clauses.map((clause) => clause.target), state.defaultTarget);
                break;
            case "throw-route":
            case "return-route":
                targets.push(state.target);
                break;
            case "await-return-value":
                if (state.target) targets.push(state.target);
                break;
            case "finally-enter":
                targets.push(state.finallyTarget);
                break;
            case "finally-return-enter":
                targets.push(state.finallyTarget);
                break;
            case "finally-exit":
                for (const candidate of states) {
                    if (candidate?.kind === "finally-enter" &&
                        candidate.region === state.region && candidate.completion === "normal" &&
                        reachableIds.has(candidate.id)) {
                        targets.push(candidate.normalTarget);
                    }
                }
                if (state.returnTarget) targets.push(state.returnTarget);
                break;
            case "expression-await":
                targets.push(state.next, state.completeTarget);
                break;
            case "completion":
            case "await-completion":
                break;
        }
        return targets;
    };
    for (;;) {
        const discovered = new Set<number>();
        const worklist = [entry.id];
        while (worklist.length > 0) {
            const id = worklist.pop()!;
            if (discovered.has(id)) continue;
            const state = states[id];
            if (!state) return null;
            discovered.add(id);
            for (const successor of successors(state)) worklist.push(successor.id);
        }
        if (discovered.size === reachableIds.size &&
            [...discovered].every((id) => reachableIds.has(id))) {
            reachableIds = discovered;
            break;
        }
        reachableIds = discovered;
    }
    const reachableStates = states.filter((state) => reachableIds.has(state.id));
    const reachableAwaitCount = reachableStates.reduce((count, state) => count + (
        state.kind === "await-condition" || state.kind === "await-logical-condition" || state.kind === "await-completion" ||
        state.kind === "await-next" || state.kind === "await-dispose" || state.kind === "expression-await" ||
        (state.kind === "switch" && state.awaitExpr !== null) ||
        (state.kind === "return-route" && state.completion.awaitExpr !== null)
            ? 1
            : 0
    ), 0);
    if (reachableAwaitCount < 1) return null;
    return {
        kind: "async-control-flow",
        entry,
        states: reachableStates,
        declarations,
        awaitCount: reachableAwaitCount,
        loopAwaitDepth,
        finallyCount,
        iteratorCount,
        expressionAwaits,
        expressionSyncs,
    };
}
