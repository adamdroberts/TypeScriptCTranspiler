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

type AsyncBindingOperation =
    | {
        readonly kind: "source";
        readonly resultSlot: number;
        readonly valueSlot: number;
    }
    | {
        readonly kind: "check";
        readonly valueSlot: number;
    }
    | {
        readonly kind: "property";
        readonly sourceSlot: number;
        readonly valueSlot: number;
        readonly name: ts.PropertyName;
    }
    | {
        readonly kind: "element";
        readonly sourceSlot: number;
        readonly valueSlot: number;
        readonly index: number;
    }
    | {
        readonly kind: "default-test";
        readonly valueSlot: number;
        readonly defaultTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "default-apply";
        readonly resultSlot: number;
        readonly valueSlot: number;
    }
    | {
        readonly kind: "assign";
        readonly identifier: ts.Identifier;
        readonly valueSlot: number;
    }
    | {
        readonly kind: "release";
        readonly valueSlot: number;
    };

type AsyncControlFlowStateCore =
    | {
        readonly kind: "sync";
        readonly id: number;
        readonly statement: ts.Statement;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "scope-enter";
        readonly id: number;
        readonly bindings: readonly ts.BindingName[];
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "scope-clone";
        readonly id: number;
        readonly bindings: readonly ts.BindingName[];
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
        readonly binding: ts.BindingName;
        readonly assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>;
        readonly slot: number;
        readonly sourceResultSlot: number | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "iterator-next";
        readonly id: number;
        readonly statement: ts.ForInStatement | ts.ForOfStatement;
        readonly binding: ts.BindingName;
        readonly assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>;
        readonly slot: number;
        readonly body: AsyncControlFlowTarget;
        readonly done: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "async-iterator-init";
        readonly id: number;
        readonly statement: ts.ForOfStatement;
        readonly binding: ts.BindingName;
        readonly assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>;
        readonly slot: number;
        readonly sourceResultSlot: number | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "async-iterator-next";
        readonly id: number;
        readonly statement: ts.ForOfStatement;
        readonly binding: ts.BindingName;
        readonly assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>;
        readonly slot: number;
        readonly body: AsyncControlFlowTarget;
        readonly done: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "async-iterator-close";
        readonly id: number;
        readonly slot: number;
        readonly completion: "normal" | "return" | "throw";
        readonly next: AsyncControlFlowTarget | null;
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
        readonly resultSlot: number | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "await-dispose";
        readonly id: number;
        readonly declarations: readonly ts.VariableDeclaration[];
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "switch-dispatch";
        readonly id: number;
        readonly statement: ts.SwitchStatement;
        readonly discriminatorResultSlot: number;
        readonly clauses: readonly {
            readonly expression: ts.Expression | null;
            readonly target: AsyncControlFlowTarget;
        }[];
        readonly defaultTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "switch-compare";
        readonly id: number;
        readonly statement: ts.SwitchStatement;
        readonly expression: ts.Expression;
        readonly discriminatorResultSlot: number;
        readonly caseResultSlot: number | null;
        readonly match: AsyncControlFlowTarget;
        readonly miss: AsyncControlFlowTarget;
        readonly releaseDiscriminatorOnMiss: boolean;
    }
    | {
        readonly kind: "catch-bind";
        readonly id: number;
        readonly binding: ts.BindingName | null;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "binding-init";
        readonly id: number;
        readonly binding: ts.BindingName;
        readonly resultSlot: number;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "binding-op";
        readonly id: number;
        readonly operation: AsyncBindingOperation;
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
        readonly resultSlot: number | null;
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
    readonly bindingIdentifiers: readonly ts.Identifier[];
    readonly awaitCount: number;
    readonly loopAwaitDepth: number;
    readonly finallyCount: number;
    readonly iteratorCount: number;
    readonly asyncIteratorCount: number;
    readonly bindingValueCount: number;
    readonly expressionAwaits: readonly ts.AwaitExpression[];
    readonly expressionSyncs: readonly ts.Expression[];
    readonly expressionResults: readonly ts.Expression[];
}

export interface AsyncControlFlowPlannerOptions {
    readonly isStableSynchronousTail: (expression: ts.Expression) => boolean;
    readonly isStableBeforeSuspension?: (expression: ts.Expression) => boolean;
    readonly isSupportedNestedFunction?: (node: ts.SignatureDeclaration) => boolean;
}

interface LoopTargets {
    readonly breakTarget: AsyncControlFlowTarget;
    readonly continueTarget: AsyncControlFlowTarget;
}

interface LabelTargets {
    readonly breakTarget: AsyncControlFlowTarget;
    readonly continueTarget: AsyncControlFlowTarget | null;
}

interface BuildContext {
    readonly loop: LoopTargets | null;
    readonly breakTarget: AsyncControlFlowTarget | null;
    readonly labels: ReadonlyMap<string, LabelTargets>;
    readonly exceptionTarget: AsyncControlFlowExceptionTarget | null;
    readonly returnTarget: AsyncControlFlowTarget | null;
}

export function planAsyncControlFlowGraph(
    body: ts.Block,
    options: AsyncControlFlowPlannerOptions,
): AsyncControlFlowGraph | null {
    const states: AsyncControlFlowState[] = [];
    const declarations: ts.VariableDeclaration[] = [];
    const bindingIdentifiers: ts.Identifier[] = [];
    let supported = true;
    let awaitCount = 0;
    let loopAwaitDepth = 0;
    let currentLoopDepth = 0;
    let finallyCount = 0;
    let iteratorCount = 0;
    let asyncIteratorCount = 0;
    let bindingValueCount = 0;
    const expressionAwaits: ts.AwaitExpression[] = [];
    const expressionAwaitSlots = new Map<ts.AwaitExpression, number>();
    const expressionSyncs: ts.Expression[] = [];
    const expressionSyncSlots = new Map<ts.Expression, number>();
    const expressionResults: ts.Expression[] = [];

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
    const containsSuspendingBindingExpression = (node: ts.Node): boolean => {
        let found = false;
        const visit = (current: ts.Node): void => {
            if (found || ts.isFunctionLike(current) || ts.isClassLike(current)) return;
            if (ts.isAwaitExpression(current) || ts.isYieldExpression(current)) {
                found = true;
                return;
            }
            ts.forEachChild(current, visit);
        };
        visit(node);
        return found;
    };
    const containsUnsupportedNestedFunctionOrClass = (node: ts.Node): boolean => {
        let found = false;
        const visit = (current: ts.Node): void => {
            if (found) return;
            if (current !== node && ts.isFunctionLike(current)) {
                if (options.isSupportedNestedFunction?.(current)) return;
                found = true;
                return;
            }
            if (current !== node && ts.isClassLike(current)) {
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
    const collectBindingIdentifiers = (name: ts.BindingName): readonly ts.Identifier[] => {
        if (ts.isIdentifier(name)) return [name];
        const identifiers: ts.Identifier[] = [];
        for (const element of name.elements) {
            if (!element || element.kind === ts.SyntaxKind.OmittedExpression) continue;
            identifiers.push(...collectBindingIdentifiers(element.name));
        }
        return identifiers;
    };
    let iteratorAssignmentTargetCount = 0;
    const normalizeIteratorAssignmentTarget = (
        expression: ts.Expression,
        assignmentTargets: Map<ts.Identifier, ts.Expression>,
    ): ts.BindingName | null => {
        const targetExpression = unwrapExpression(expression);
        if (ts.isIdentifier(targetExpression)) return targetExpression;
        if (ts.isPropertyAccessExpression(targetExpression) || ts.isElementAccessExpression(targetExpression)) {
            const placeholder = ts.factory.createIdentifier(
                `__tsc_cfg_assignment_target_${iteratorAssignmentTargetCount++}`,
            );
            assignmentTargets.set(placeholder, targetExpression);
            return placeholder;
        }
        if (ts.isArrayLiteralExpression(targetExpression)) {
            const elements: (ts.BindingElement | ts.OmittedExpression)[] = [];
            for (let index = 0; index < targetExpression.elements.length; index++) {
                const element = targetExpression.elements[index]!;
                if (ts.isOmittedExpression(element)) {
                    elements.push(element);
                    continue;
                }
                if (ts.isSpreadElement(element)) {
                    if (index !== targetExpression.elements.length - 1) return null;
                    const name = normalizeIteratorAssignmentTarget(element.expression, assignmentTargets);
                    if (!name) return null;
                    elements.push(ts.factory.createBindingElement(
                        ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
                        undefined,
                        name,
                        undefined,
                    ));
                    continue;
                }
                const value = unwrapExpression(element);
                const assignment = ts.isBinaryExpression(value) &&
                    value.operatorToken.kind === ts.SyntaxKind.EqualsToken
                    ? value
                    : null;
                const defaultValue = assignment?.right;
                const name = normalizeIteratorAssignmentTarget(
                    assignment?.left ?? value,
                    assignmentTargets,
                );
                if (!name) return null;
                elements.push(ts.factory.createBindingElement(
                    undefined,
                    undefined,
                    name,
                    defaultValue,
                ));
            }
            return ts.factory.createArrayBindingPattern(elements);
        }
        if (ts.isObjectLiteralExpression(targetExpression)) {
            const elements: ts.BindingElement[] = [];
            for (const property of targetExpression.properties) {
                if (ts.isSpreadAssignment(property)) {
                    const name = normalizeIteratorAssignmentTarget(property.expression, assignmentTargets);
                    if (!name) return null;
                    elements.push(ts.factory.createBindingElement(
                        ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
                        undefined,
                        name,
                        undefined,
                    ));
                    continue;
                }
                if (ts.isShorthandPropertyAssignment(property)) {
                    elements.push(ts.factory.createBindingElement(
                        undefined,
                        undefined,
                        property.name,
                        property.objectAssignmentInitializer,
                    ));
                    continue;
                }
                if (!ts.isPropertyAssignment(property)) return null;
                const value = unwrapExpression(property.initializer);
                const assignment = ts.isBinaryExpression(value) &&
                    value.operatorToken.kind === ts.SyntaxKind.EqualsToken
                    ? value
                    : null;
                const defaultValue = assignment?.right;
                const name = normalizeIteratorAssignmentTarget(
                    assignment?.left ?? value,
                    assignmentTargets,
                );
                if (!name) return null;
                elements.push(ts.factory.createBindingElement(
                    undefined,
                    property.name,
                    name,
                    defaultValue,
                ));
            }
            return ts.factory.createObjectBindingPattern(elements);
        }
        return null;
    };
    const collectDeclarations = (statement: ts.VariableStatement): void => {
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
                declarations.push(declaration);
            } else {
                bindingIdentifiers.push(...collectBindingIdentifiers(declaration.name));
            }
        }
    };
    const collectDirectLexicalBindings = (
        statements: readonly ts.Statement[],
    ): ts.BindingName[] => statements.flatMap((statement) =>
        ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0
            ? statement.declarationList.declarations.map((declaration) => declaration.name)
            : []);
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
        resultSlot: number | null = null,
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
            resultSlot,
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
        resultSlot: number | null = null,
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
                resultSlot,
            ) ?? buildLogicalValueExpression(
                arm,
                assignment,
                next,
                context,
                completion,
                resultSlot,
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
                    resultSlot,
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
                resultSlot,
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
        resultSlot: number | null = null,
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
                value, assignment, next, context, completion, resultSlot,
            ) ?? buildLogicalValueExpression(
                value, assignment, next, context, completion, resultSlot,
            );
            if (nested) return nested;
            if (containsAwait(value)) {
                return buildExpressionSequence(
                    value, assignment, next, context, completion, null, resultSlot,
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
                resultSlot,
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
            resultSlot: null,
            awaitExprs: [],
            next,
        }, context.exceptionTarget);
    };
    const buildExpressionResult = (
        expression: ts.Expression,
        resultSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const current = unwrapExpression(expression);
        if (ts.isAwaitExpression(current)) {
            const id = reserve();
            awaitCount++;
            return setState({
                kind: "await-next",
                id,
                awaitExpr: current,
                assignment: null,
                resultSlot,
                next,
            }, context.exceptionTarget);
        }
        if (!containsAwait(expression)) {
            const id = reserve();
            return setState({
                kind: "expression-complete",
                id,
                expression,
                assignment: null,
                completion: null,
                branch: null,
                resultSlot,
                awaitExprs: [],
                next,
            }, context.exceptionTarget);
        }
        return buildConditionalValueExpression(
            expression,
            null,
            next,
            context,
            null,
            resultSlot,
        ) ?? buildLogicalValueExpression(
            expression,
            null,
            next,
            context,
            null,
            resultSlot,
        ) ?? buildExpressionSequence(
            expression,
            null,
            next,
            context,
            null,
            null,
            resultSlot,
        );
    };

    const buildBindingOperation = (
        operation: AsyncBindingOperation,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const id = reserve();
        return setState({ kind: "binding-op", id, operation, next }, context.exceptionTarget);
    };

    const buildBindingElement = (
        element: ts.BindingElement,
        valueSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const bound = buildBindingName(element.name, valueSlot, next, context);
        if (!bound || !element.initializer) return bound;
        const resultSlot = expressionResults.push(element.initializer) - 1;
        const apply = buildBindingOperation({
            kind: "default-apply",
            resultSlot,
            valueSlot,
        }, bound, context);
        const defaultTarget = buildExpressionResult(
            element.initializer,
            resultSlot,
            apply,
            context,
        );
        if (!defaultTarget) return null;
        return buildBindingOperation({
            kind: "default-test",
            valueSlot,
            defaultTarget,
        }, bound, context);
    };

    const buildBindingName = (
        binding: ts.BindingName,
        valueSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const release = buildBindingOperation({ kind: "release", valueSlot }, next, context);
        if (ts.isIdentifier(binding)) {
            return buildBindingOperation({
                kind: "assign",
                identifier: binding,
                valueSlot,
            }, release, context);
        }
        let entry = release;
        for (let index = binding.elements.length - 1; index >= 0; index--) {
            const element = binding.elements[index];
            if (!element || element.kind === ts.SyntaxKind.OmittedExpression) continue;
            if (element.dotDotDotToken) return null;
            const childSlot = bindingValueCount++;
            const child = buildBindingElement(element, childSlot, entry, context);
            if (!child) return null;
            if (ts.isArrayBindingPattern(binding)) {
                entry = buildBindingOperation({
                    kind: "element",
                    sourceSlot: valueSlot,
                    valueSlot: childSlot,
                    index,
                }, child, context);
                continue;
            }
            const propertyName = element.propertyName ??
                (ts.isIdentifier(element.name) ? element.name : null);
            if (!propertyName ||
                (ts.isComputedPropertyName(propertyName) && containsAwait(propertyName.expression))) {
                return null;
            }
            entry = buildBindingOperation({
                kind: "property",
                sourceSlot: valueSlot,
                valueSlot: childSlot,
                name: propertyName,
            }, child, context);
        }
        return buildBindingOperation({ kind: "check", valueSlot }, entry, context);
    };

    const buildSuspendingBinding = (
        binding: ts.BindingName,
        resultSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const valueSlot = bindingValueCount++;
        const bound = buildBindingName(binding, valueSlot, next, context);
        if (!bound) return null;
        return buildBindingOperation({
            kind: "source",
            resultSlot,
            valueSlot,
        }, bound, context);
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

    const buildLexicalBlock = (
        block: ts.Block,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const entry = buildSequence(block.statements, next, context);
        const bindings = collectDirectLexicalBindings(block.statements);
        if (bindings.length === 0) return entry;
        const id = reserve();
        return setState({ kind: "scope-enter", id, bindings, next: entry }, context.exceptionTarget);
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
            labels: new Map<string, LabelTargets>([...context.labels].map(([label, targets]) => [
                label,
                {
                    breakTarget: wrapTarget(targets.breakTarget),
                    continueTarget: targets.continueTarget
                        ? wrapTarget(targets.continueTarget)
                        : null,
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
        let initialIterationTarget: AsyncControlFlowTarget | null = null;
        if (ts.isForStatement(statement) &&
            statement.initializer &&
            ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.BlockScoped) !== 0) {
            const bindings = statement.initializer.declarations.map((declaration) => declaration.name);
            // ECMAScript creates one copied environment before the first
            // condition and another before each update.  They share the same
            // binding operation but have different successors: routing the
            // initial edge through the update would skip iteration zero.
            const backEdgeId = reserve();
            continueTarget = setState({
                kind: "scope-clone",
                id: backEdgeId,
                bindings,
                next: continueTarget,
            }, context.exceptionTarget);
            const initialId = reserve();
            initialIterationTarget = setState({
                kind: "scope-clone",
                id: initialId,
                bindings,
                next: conditionTarget,
            }, context.exceptionTarget);
        }
        const loopTargets = { breakTarget: next, continueTarget };
        const labels = new Map(context.labels);
        if (label) labels.set(label, loopTargets);
        currentLoopDepth++;
        const bodyContext: BuildContext = {
            loop: loopTargets,
            breakTarget: loopTargets.breakTarget,
            labels,
            exceptionTarget: context.exceptionTarget,
            returnTarget: context.returnTarget,
        };
        const bodyEntry = ts.isBlock(statement.statement)
            ? buildLexicalBlock(statement.statement, continueTarget, bodyContext)
            : buildSequence([statement.statement], continueTarget, bodyContext);
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
        let entry = ts.isDoStatement(statement)
            ? bodyEntry
            : initialIterationTarget ?? conditionTarget;
        if (ts.isForStatement(statement) && statement.initializer) {
            const initializer = ts.isVariableDeclarationList(statement.initializer)
                ? ts.factory.createVariableStatement(undefined, statement.initializer)
                : ts.factory.createExpressionStatement(statement.initializer);
            entry = buildStatement(initializer, entry, context);
        }
        return entry;
    };

    const buildAsyncIteratorLoop = (
        statement: ts.ForOfStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        let binding: ts.BindingName;
        const assignmentTargets = new Map<ts.Identifier, ts.Expression>();
        if (ts.isVariableDeclarationList(statement.initializer)) {
            if (statement.initializer.declarations.length !== 1) {
                supported = false;
                return next;
            }
            const declaration = statement.initializer.declarations[0]!;
            if (declaration.initializer) {
                supported = false;
                return next;
            }
            // Defaults and computed keys are emitted while assigning each
            // yielded value. They need their own CFG states before they may
            // suspend; never let a shared synchronous binding helper consume
            // an await/yield expression directly.
            if (containsSuspendingBindingExpression(declaration.name)) {
                supported = false;
                return next;
            }
            binding = declaration.name;
            if (ts.isIdentifier(declaration.name)) {
                declarations.push(declaration);
            } else {
                bindingIdentifiers.push(...collectBindingIdentifiers(declaration.name));
            }
        } else {
            const assignmentBinding = normalizeIteratorAssignmentTarget(
                statement.initializer,
                assignmentTargets,
            );
            if (!assignmentBinding || containsSuspendingBindingExpression(assignmentBinding)) {
                supported = false;
                return next;
            }
            binding = assignmentBinding;
        }

        // Cardinality is independent of the iterable: one init/next state pair
        // is allocated per syntactic loop and every body completion returns to
        // the same next-state back edge. Runtime iteration count never enters
        // graph construction.
        const slot = asyncIteratorCount++;
        const initId = reserve();
        const nextId = reserve();
        const nextTarget = target(nextId);
        const sourceResultSlot = containsAwait(statement.expression)
            ? expressionResults.push(statement.expression) - 1
            : null;
        const closeStates = new Map<number, AsyncControlFlowTarget>();
        const closeNormal = (closeNext: AsyncControlFlowTarget): AsyncControlFlowTarget => {
            const existing = closeStates.get(closeNext.id);
            if (existing) return existing;
            const id = reserve();
            const close = setState({
                kind: "async-iterator-close",
                id,
                slot,
                completion: "normal",
                next: closeNext,
            }, context.exceptionTarget);
            closeStates.set(closeNext.id, close);
            return close;
        };
        const closeReturnId = reserve();
        const closeReturn = setState({
            kind: "async-iterator-close",
            id: closeReturnId,
            slot,
            completion: "return",
            next: context.returnTarget,
        }, context.exceptionTarget);
        const closeThrowId = reserve();
        const closeThrow = setState({
            kind: "async-iterator-close",
            id: closeThrowId,
            slot,
            completion: "throw",
            next: context.exceptionTarget?.target ?? null,
        }, context.exceptionTarget);
        const loopTargets = { breakTarget: closeNormal(next), continueTarget: nextTarget };
        const labels = new Map<string, LabelTargets>([...context.labels].map(([outerLabel, targets]) => [
            outerLabel,
            {
                breakTarget: closeNormal(targets.breakTarget),
                continueTarget: targets.continueTarget
                    ? closeNormal(targets.continueTarget)
                    : null,
            },
        ]));
        if (label) labels.set(label, loopTargets);
        currentLoopDepth++;
        const bodyContext: BuildContext = {
            loop: loopTargets,
            breakTarget: loopTargets.breakTarget,
            labels,
            exceptionTarget: { target: closeThrow },
            returnTarget: closeReturn,
        };
        const bodyEntry = ts.isBlock(statement.statement)
            ? buildLexicalBlock(statement.statement, nextTarget, bodyContext)
            : buildSequence([statement.statement], nextTarget, bodyContext);
        currentLoopDepth--;
        setState({
            kind: "async-iterator-next",
            id: nextId,
            statement,
            binding,
            assignmentTargets,
            slot,
            body: bodyEntry,
            done: next,
        }, context.exceptionTarget);
        const init = setState({
            kind: "async-iterator-init",
            id: initId,
            statement,
            binding,
            assignmentTargets,
            slot,
            sourceResultSlot,
            next: nextTarget,
        }, context.exceptionTarget);
        if (sourceResultSlot === null) return init;
        const sourceEntry = buildExpressionResult(
            statement.expression,
            sourceResultSlot,
            init,
            context,
        );
        if (!sourceEntry) {
            supported = false;
            return next;
        }
        return sourceEntry;
    };

    const buildIteratorLoop = (
        statement: ts.ForInStatement | ts.ForOfStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        if (ts.isForOfStatement(statement) && statement.awaitModifier) {
            return buildAsyncIteratorLoop(statement, next, context, label);
        }
        let binding: ts.BindingName;
        const assignmentTargets = new Map<ts.Identifier, ts.Expression>();
        if (ts.isVariableDeclarationList(statement.initializer)) {
            if (statement.initializer.declarations.length !== 1) {
                supported = false;
                return next;
            }
            const declaration = statement.initializer.declarations[0]!;
            if (declaration.initializer || containsSuspendingBindingExpression(declaration.name)) {
                supported = false;
                return next;
            }
            if (ts.isIdentifier(declaration.name)) {
                declarations.push(declaration);
            } else {
                bindingIdentifiers.push(...collectBindingIdentifiers(declaration.name));
            }
            binding = declaration.name;
        } else {
            const assignmentBinding = normalizeIteratorAssignmentTarget(
                statement.initializer,
                assignmentTargets,
            );
            if (!assignmentBinding || containsSuspendingBindingExpression(assignmentBinding)) {
                supported = false;
                return next;
            }
            binding = assignmentBinding;
        }
        const slot = iteratorCount++;
        const initId = reserve();
        const nextId = reserve();
        const nextTarget = target(nextId);
        const sourceResultSlot = containsAwait(statement.expression)
            ? expressionResults.push(statement.expression) - 1
            : null;
        const loopTargets = { breakTarget: next, continueTarget: nextTarget };
        const labels = new Map(context.labels);
        if (label) labels.set(label, loopTargets);
        currentLoopDepth++;
        const bodyContext: BuildContext = {
            loop: loopTargets,
            breakTarget: loopTargets.breakTarget,
            labels,
            exceptionTarget: context.exceptionTarget,
            returnTarget: context.returnTarget,
        };
        const bodyEntry = ts.isBlock(statement.statement)
            ? buildLexicalBlock(statement.statement, nextTarget, bodyContext)
            : buildSequence([statement.statement], nextTarget, bodyContext);
        currentLoopDepth--;
        setState({
            kind: "iterator-next",
            id: nextId,
            statement,
            binding,
            assignmentTargets,
            slot,
            body: bodyEntry,
            done: next,
        }, context.exceptionTarget);
        const init = setState({
            kind: "iterator-init",
            id: initId,
            statement,
            binding,
            assignmentTargets,
            slot,
            sourceResultSlot,
            next: nextTarget,
        }, context.exceptionTarget);
        if (sourceResultSlot === null) return init;
        const sourceEntry = buildExpressionResult(
            statement.expression,
            sourceResultSlot,
            init,
            context,
        );
        if (!sourceEntry) {
            supported = false;
            return next;
        }
        return sourceEntry;
    };

    const buildStatement = (
        statement: ts.Statement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        if (ts.isBlock(statement)) return buildLexicalBlock(statement, next, context);
        if (ts.isLabeledStatement(statement)) {
            if (ts.isWhileStatement(statement.statement) || ts.isDoStatement(statement.statement) ||
                ts.isForStatement(statement.statement)) {
                return buildLoop(statement.statement, next, context, statement.label.text);
            }
            if ((ts.isForInStatement(statement.statement) || ts.isForOfStatement(statement.statement)) &&
                !containsUnsupportedNestedFunctionOrClass(statement)) {
                if (!(ts.isForOfStatement(statement.statement) && statement.statement.awaitModifier) &&
                    opaqueSynchronousLoopSupported(statement.statement, statement.label.text)) {
                    const id = reserve();
                    return setState({ kind: "sync", id, statement, next }, context.exceptionTarget);
                }
                return buildIteratorLoop(statement.statement, next, context, statement.label.text);
            }
            const labels = new Map(context.labels);
            labels.set(statement.label.text, { breakTarget: next, continueTarget: null });
            return buildStatement(statement.statement, next, { ...context, labels });
        }
        if (ts.isWhileStatement(statement) || ts.isDoStatement(statement) || ts.isForStatement(statement)) {
            return buildLoop(statement, next, context, null);
        }
        if ((ts.isForInStatement(statement) || ts.isForOfStatement(statement)) &&
            !containsUnsupportedNestedFunctionOrClass(statement)) {
            if (!(ts.isForOfStatement(statement) && statement.awaitModifier) &&
                opaqueSynchronousLoopSupported(statement)) {
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
            const clauses: { expression: ts.Expression | null; target: AsyncControlFlowTarget }[] =
                new Array(statement.caseBlock.clauses.length);
            let fallthrough = next;
            for (let index = statement.caseBlock.clauses.length - 1; index >= 0 && supported; index--) {
                const clause = statement.caseBlock.clauses[index]!;
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
            const discriminatorResultSlot = expressionResults.push(statement.expression) - 1;
            const hasAwaitedCase = statement.caseBlock.clauses.some(
                (clause) => ts.isCaseClause(clause) && containsAwait(clause.expression),
            );
            let selectionEntry: AsyncControlFlowTarget;
            if (hasAwaitedCase) {
                let testEntry = defaultTarget;
                let hasLaterCase = false;
                for (let index = statement.caseBlock.clauses.length - 1; index >= 0; index--) {
                    const clause = statement.caseBlock.clauses[index]!;
                    if (!ts.isCaseClause(clause)) continue;
                    const caseResultSlot = containsAwait(clause.expression)
                        ? expressionResults.push(clause.expression) - 1
                        : null;
                    const compareId = reserve();
                    const compare = setState({
                        kind: "switch-compare",
                        id: compareId,
                        statement,
                        expression: clause.expression,
                        discriminatorResultSlot,
                        caseResultSlot,
                        match: clauses[index]!.target,
                        miss: testEntry,
                        releaseDiscriminatorOnMiss: !hasLaterCase,
                    }, context.exceptionTarget);
                    const caseEntry = caseResultSlot === null
                        ? compare
                        : buildExpressionResult(clause.expression, caseResultSlot, compare, context);
                    if (!caseEntry) {
                        supported = false;
                        return next;
                    }
                    testEntry = caseEntry;
                    hasLaterCase = true;
                }
                selectionEntry = testEntry;
            } else {
                const dispatchId = reserve();
                selectionEntry = setState({
                    kind: "switch-dispatch",
                    id: dispatchId,
                    statement,
                    discriminatorResultSlot,
                    clauses,
                    defaultTarget,
                }, context.exceptionTarget);
            }
            const switchBindings = statement.caseBlock.clauses.flatMap((clause) =>
                collectDirectLexicalBindings(clause.statements));
            // The CaseBlock environment is created after the discriminator
            // and before the first case expression, even when no lexical
            // declarations contribute captured cells.
            const scopeId = reserve();
            selectionEntry = setState({
                kind: "scope-enter",
                id: scopeId,
                bindings: switchBindings,
                next: selectionEntry,
            }, context.exceptionTarget);
            const entry = buildExpressionResult(
                statement.expression,
                discriminatorResultSlot,
                selectionEntry,
                context,
            );
            if (entry) return entry;
            supported = false;
            return next;
        }
        if (ts.isTryStatement(statement)) {
            const buildCatchEntry = (
                catchClause: ts.CatchClause,
                catchNext: AsyncControlFlowTarget,
                catchContext: BuildContext,
            ): AsyncControlFlowTarget => {
                let catchEntry = buildLexicalBlock(catchClause.block, catchNext, catchContext);
                const binding = catchClause.variableDeclaration?.name ?? null;
                if (binding && containsSuspendingBindingExpression(binding)) {
                    supported = false;
                    return catchNext;
                }
                if (catchClause.variableDeclaration) {
                    if (binding && ts.isIdentifier(binding)) {
                        declarations.push(catchClause.variableDeclaration);
                    } else if (binding) {
                        bindingIdentifiers.push(...collectBindingIdentifiers(binding));
                    }
                }
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
                return buildLexicalBlock(statement.tryBlock, next, {
                    ...context,
                    exceptionTarget: { target: catchEntry },
                });
            }
            return buildFinalizationRegion(
                next,
                context,
                (finallyExit) => buildLexicalBlock(statement.finallyBlock!, finallyExit, context),
                (normalEnter, throwEnter, protectedContext) => {
                    let tryExceptionTarget = throwEnter;
                    if (statement.catchClause) {
                        const catchEntry = buildCatchEntry(statement.catchClause, normalEnter, {
                            ...protectedContext,
                            exceptionTarget: { target: throwEnter },
                        });
                        tryExceptionTarget = catchEntry;
                    }
                    return buildLexicalBlock(statement.tryBlock, normalEnter, {
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
                const labelledTarget = ts.isBreakStatement(statement)
                    ? targets.breakTarget
                    : targets.continueTarget;
                if (!labelledTarget) {
                    supported = false;
                    return next;
                }
                return labelledTarget;
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
            if (statement.declarationList.declarations.length > 1 &&
                (containsAwait(statement) || statement.declarationList.declarations.some(
                    (declaration) => !ts.isIdentifier(declaration.name)))) {
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
                if (!ts.isIdentifier(declaration.name)) {
                    if (!initializer) {
                        supported = false;
                        return next;
                    }
                    const resultSlot = expressionResults.push(declaration.initializer!) - 1;
                    let bind: AsyncControlFlowTarget | null;
                    if (containsSuspendingBindingExpression(declaration.name)) {
                        bind = buildSuspendingBinding(
                            declaration.name,
                            resultSlot,
                            next,
                            context,
                        );
                    } else {
                        const bindId = reserve();
                        bind = setState({
                            kind: "binding-init",
                            id: bindId,
                            binding: declaration.name,
                            resultSlot,
                            next,
                        }, context.exceptionTarget);
                    }
                    if (!bind) {
                        supported = false;
                        return next;
                    }
                    const entry = buildExpressionResult(
                        declaration.initializer!,
                        resultSlot,
                        bind,
                        context,
                    );
                    if (entry) return entry;
                    supported = false;
                    return next;
                }
                if (initializer && ts.isAwaitExpression(initializer)) {
                    awaitCount++;
                    const id = reserve();
                    return setState({
                        kind: "await-next",
                        id,
                        awaitExpr: initializer,
                        assignment: declaration.name,
                        resultSlot: null,
                        next,
                    }, context.exceptionTarget);
                }
                if (initializer && containsAwait(initializer)) {
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
                    resultSlot: null,
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
                        resultSlot: null,
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
            containsUnsupportedNestedFunctionOrClass(statement) ||
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
            case "scope-enter":
            case "scope-clone":
            case "expression-sync":
            case "await-next":
            case "await-dispose":
            case "catch-bind":
            case "binding-init":
                targets.push(state.next);
                break;
            case "binding-op":
                targets.push(state.next);
                if (state.operation.kind === "default-test") {
                    targets.push(state.operation.defaultTarget);
                }
                break;
            case "expression-complete":
                if (state.branch) {
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
            case "switch-compare":
                targets.push(state.match, state.miss);
                break;
            case "iterator-init":
            case "async-iterator-init":
                targets.push(state.next);
                break;
            case "iterator-next":
            case "async-iterator-next":
                targets.push(state.body, state.done);
                break;
            case "async-iterator-close":
                if (state.next) targets.push(state.next);
                break;
            case "await-logical-condition":
            case "logical-condition":
                targets.push(state.truthy, state.falsy, state.nullish);
                break;
            case "switch-dispatch":
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
        state.kind === "await-next" || state.kind === "await-dispose" ||
        state.kind === "async-iterator-next" || state.kind === "async-iterator-close" ||
        state.kind === "expression-await" ||
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
        bindingIdentifiers,
        awaitCount: reachableAwaitCount,
        loopAwaitDepth,
        finallyCount,
        iteratorCount,
        asyncIteratorCount,
        bindingValueCount,
        expressionAwaits,
        expressionSyncs,
        expressionResults,
    };
}
