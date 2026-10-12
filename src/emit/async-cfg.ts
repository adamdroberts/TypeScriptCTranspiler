import { definitionEvaluationChildren } from "./module-evaluation";
import {classExpressionFromDeclaration} from './class-definition';
import ts from "typescript";
import { normalizeAssignmentTarget, assignmentTargetFromBinding, unwrapTransparentExpression as unwrapExpression } from "./binding-tree";
import { planResumableExpression, type ResumableExpressionState, type ResumableClassDefinition } from "./resumable-expression";
import { directLexicalDeclarations, lexicalDeclarationsFromList } from "./lexical-declarations";
import {
    planAsyncFunctionCompletionEdge,
    type AsyncFunctionCompletionEdge,
} from "./async-ir";

export type AsyncControlFlowTarget = { readonly kind: "state"; readonly id: number };

export interface AsyncControlFlowExceptionTarget {
    readonly target: AsyncControlFlowTarget;
}

type AsyncBindingStagedExpression = {
    readonly expression: ts.Expression;
    readonly storage: "sync" | "result";
    readonly slot: number;
};

type AsyncBindingAssignmentTarget =
    | {
        readonly kind: "property";
        readonly node: ts.PropertyAccessExpression;
        readonly receiver: AsyncBindingStagedExpression;
    }
    | {
        readonly kind: "element";
        readonly node: ts.ElementAccessExpression;
        readonly receiver: AsyncBindingStagedExpression;
        readonly index: AsyncBindingStagedExpression;
    };

type AsyncBindingObjectRestExclusion =
    | { readonly kind: "name"; readonly name: ts.PropertyName }
    | { readonly kind: "value"; readonly valueSlot: number };

type AsyncBindingOperation =
    | {
        readonly kind: "source";
        readonly source:
            | { readonly kind: "expression-result"; readonly resultSlot: number }
            | { readonly kind: "exception"; readonly node: ts.Node };
        readonly valueSlot: number;
        readonly preserveSource?: boolean;
    }
    | {
        readonly kind: "check";
        readonly valueSlot: number;
    }
    | {
        readonly kind: "property-key";
        readonly key: AsyncBindingStagedExpression;
        readonly valueSlot: number;
    }
    | {
        readonly kind: "property";
        readonly sourceSlot: number;
        readonly valueSlot: number;
        readonly name: ts.PropertyName | null;
        readonly keySlot: number | null;
        readonly releaseKey: boolean;
    }
    | {
        readonly kind: "iterator-open";
        readonly sourceSlot: number;
        readonly slot: number;
    }
    | {
        readonly kind: "iterator-step" | "iterator-rest";
        readonly slot: number;
        readonly valueSlot: number | null;
    }
    | {
        readonly kind: "object-rest";
        readonly sourceSlot: number;
        readonly valueSlot: number;
        readonly exclusions: readonly AsyncBindingObjectRestExclusion[];
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
        readonly assignmentTarget: AsyncBindingAssignmentTarget | null;
        readonly valueSlot: number;
        readonly initialize: boolean;
    }
    | {
        readonly kind: "release";
        readonly valueSlot: number;
    };

type AsyncControlFlowStateCore =
    | {
        readonly kind: "module-export";
        readonly id: number;
        readonly statement: ts.ExportAssignment | ts.ClassDeclaration;
        readonly valueSlot: number;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "resumable-expression";
        readonly id: number;
        readonly operation: ResumableExpressionState;
        readonly classDefinitions:readonly ResumableClassDefinition[];
        readonly entry: boolean;
        readonly slots: readonly number[];
        readonly targets: ReadonlyMap<number, AsyncControlFlowTarget>;
        readonly next: AsyncControlFlowTarget;
        readonly returnTarget: AsyncControlFlowTarget | null;
    }
    | {
        readonly kind: "sync";
        readonly id: number;
        readonly statement: ts.Statement;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "scope-enter";
        readonly id: number;
        readonly retainedEnvironment?: boolean;
        readonly bindings: readonly ts.BindingName[];
        readonly functions: readonly ts.FunctionDeclaration[];
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "scope-clone";
        readonly id: number;
        readonly bindings: readonly ts.BindingName[];
        readonly next: AsyncControlFlowTarget;
    }
    | { readonly kind: "object-scope-enter"; readonly id: number; readonly slot: number;
        readonly sourceResultSlot: number; readonly next: AsyncControlFlowTarget }
    | { readonly kind: "environment-exit"; readonly id: number; readonly slot: number;
        readonly next: AsyncControlFlowTarget }
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
        readonly bindingValueSlot: number | null;
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
        readonly bindingValueSlot: number | null;
        readonly body: AsyncControlFlowTarget;
        readonly done: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "async-iterator-close" | "iterator-close";
        readonly id: number;
        readonly slot: number;
        readonly completion: "normal" | "return" | "throw";
        readonly next: AsyncControlFlowTarget | null;
    }


    | {
        readonly kind: "completion";
        readonly id: number;
        readonly completion: AsyncFunctionCompletionEdge;
    }


    | {
        readonly kind: "resource-enter";
        readonly id: number;
        readonly slot: number;
        readonly next: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "resource-dispose";
        readonly id: number;
        readonly slot: number;
        readonly region: number;
        readonly asynchronous: boolean;
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
        readonly completion: "normal";
        readonly finallyTarget: AsyncControlFlowTarget;
        readonly normalTarget: AsyncControlFlowTarget;
    }
    | {
        readonly kind: "finally-enter";
        readonly id: number;
        readonly region: number;
        readonly completion: "throw";
        readonly finallyTarget: AsyncControlFlowTarget;
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
        readonly kind: "expression-complete";
        readonly id: number;
        readonly expression: ts.Expression;
        /** A previously materialized expression value. Logical-value routing
         * uses this instead of evaluating its left operand again. */
        readonly sourceResultSlot: number | null;
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
        readonly next: AsyncControlFlowTarget | null;
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
    readonly resourceScopes: readonly { readonly declarations: readonly ts.VariableDeclaration[]; readonly asynchronous: boolean }[];
    readonly expressionSyncs: readonly ts.Expression[];
    readonly expressionResults: readonly ts.Expression[];
    readonly operationResultSlots: ReadonlySet<number>;
}

export interface AsyncControlFlowPlannerOptions {
    readonly retainedSourceEnvironments?: boolean;
    readonly suspensionKind?: "async" | "generator" | "async-generator";
    readonly instantiatedRoot?: boolean;
    readonly isModuleDefaultClass?: (node: ts.ClassDeclaration) => boolean;
    readonly isSupportedNestedFunction?: (node: ts.SignatureDeclaration) => boolean;
    readonly isSupportedNestedClass?: (node: ts.ClassLikeDeclaration) => boolean;
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
    const resourceScopes: Array<{declarations: readonly ts.VariableDeclaration[]; asynchronous: boolean}> = [];
    const resourceBindings = new Map<ts.VariableDeclaration, number>();
    let supported = true;
    let awaitCount = 0;
    let loopAwaitDepth = 0;
    let currentLoopDepth = 0;
    let finallyCount = 0;
    let iteratorCount = 0;
    let asyncIteratorCount = 0;
    let bindingValueCount = 0;
    const expressionSyncs: ts.Expression[] = [];
    const expressionSyncSlots = new Map<ts.Expression, number>();
    const expressionResults: ts.Expression[] = [];
    const operationResultSlots = new Set<number>();

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
        states[state.id] = { ...state, ...(state.kind === "expression-complete" &&
            (state.completion || state.branch) ? { next: null } : {}), exceptionTarget } as AsyncControlFlowState;
        return target(state.id);
    };
    const containsSuspension = (node: ts.Node, includeYield: boolean): boolean => {
        const worklist = [node];
        while (worklist.length) {
            const current = worklist.pop()!;
            if (ts.isAwaitExpression(current) || includeYield && ts.isYieldExpression(current)) return true;
            for (const child of definitionEvaluationChildren(current)) worklist.push(child);
        }
        return false;
    };
    const containsAwait = (node: ts.Node): boolean => containsSuspension(node, options.suspensionKind === "generator" || options.suspensionKind === "async-generator");
    const containsSuspendingBindingExpression = (node: ts.Node): boolean => containsSuspension(node, true);
    const containsUnsupportedNestedFunctionOrClass = (node: ts.Node): boolean => {
        let found = false;
        const visit = (current: ts.Node): void => {
            if (found) return;
            // FunctionType/ConstructorType nodes are erased annotations;
            // they do not create closures or require runtime environments.
            if (ts.isTypeNode(current)) return;
            if (ts.isFunctionLike(current)) {
                if (options.isSupportedNestedFunction?.(current)) return;
                // Creating an object member does not execute or suspend its
                // body. The ordinary closure owner captures the active cells.
                if (current.parent && ts.isObjectLiteralExpression(current.parent)) return;
                found = true;
                return;
            }
            if (ts.isClassLike(current) && !options.isSupportedNestedClass?.(current)) {
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
            if (ts.isAwaitExpression(current) ||
                (ts.isVariableDeclarationList(current) && (current.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing) ||
                ((options.suspensionKind === "generator" || options.suspensionKind === "async-generator") && ts.isYieldExpression(current)) || ts.isReturnStatement(current) ||
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
    const collectBindingIdentifiers = (name: ts.BindingName): readonly ts.Identifier[] => {
        if (ts.isIdentifier(name)) return [name];
        const identifiers: ts.Identifier[] = [];
        for (const element of name.elements) {
            if (!element || element.kind === ts.SyntaxKind.OmittedExpression) continue;
            identifiers.push(...collectBindingIdentifiers(element.name));
        }
        return identifiers;
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
        const operationPlan = planResumableExpression(expression, { asyncGenerator: options.suspensionKind === "async-generator" });
        if (operationPlan.kind === "graph") {
            const graph = operationPlan.graph;
            const slots = graph.values.map(owner => {
                const slot = expressionResults.push(owner) - 1;
                operationResultSlots.add(slot);
                return slot;
            });
            const completeTarget = setState({
                kind: "expression-complete", id: reserve(), expression,
                sourceResultSlot: slots[graph.result]!, assignment, completion, branch, resultSlot,
                next,
            }, context.exceptionTarget);
            const targets = new Map(graph.states.map(operation => [operation.id, target(reserve())]));
            const bindingContinuations = new Set(graph.states.flatMap(operation =>
                operation.kind === "binding" ? [operation.next] : []));
            for (const operation of graph.states) {
                if (operation.kind === "binding") {
                    const completed = setState({
                        kind: "expression-complete", id: reserve(), expression: operation.node,
                        sourceResultSlot: slots[operation.source]!, assignment: null, completion: null, branch: null,
                        resultSlot: slots[operation.output]!, next: targets.get(operation.next)!,
                    }, context.exceptionTarget);
                    const bound = buildBindingFromValueSlot(
                        operation.binding, completed, context, operation.assignmentTargets, false,
                    );
                    if (!bound) return null;
                    setState({
                        kind: "binding-op", id: targets.get(operation.id)!.id,
                        operation: {
                            kind: "source", source: { kind: "expression-result", resultSlot: slots[operation.source]! },
                            valueSlot: bound.valueSlot, preserveSource: true,
                        },
                        next: bound.entry,
                    }, context.exceptionTarget);
                    continue;
                }
                if (operation.kind === "suspend") {
                    if (operation.suspension !== "await" && options.suspensionKind !== "generator" && options.suspensionKind !== "async-generator") return null;
                    awaitCount++;
                }
                const edgeIds = operation.kind === "complete" ? [] : operation.kind === "branch"
                    ? [operation.yes, operation.no] : [operation.next];
                const edges = new Map(edgeIds.map(id => [id, targets.get(id)!]));
                setState({ kind: "resumable-expression", id: targets.get(operation.id)!.id,
                    operation, classDefinitions:graph.classDefinitions, entry: operation.id === graph.entry || bindingContinuations.has(operation.id), slots, targets: edges, next: edgeIds.length ? targets.get(edgeIds[0]!)! : completeTarget,
                    returnTarget: operation.kind === "suspend" ? context.returnTarget : null }, context.exceptionTarget);
            }
            return targets.get(graph.entry)!;
        }
        return null;
    };
    const buildExpressionResult = (
        expression: ts.Expression,
        resultSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        if (containsAwait(expression)) {
            return buildExpressionSequence(expression, null, next, context, null, null, resultSlot);
        }
        return setState({
            kind: "expression-complete", id: reserve(), expression,
            sourceResultSlot: null, assignment: null, completion: null,
            branch: null, resultSlot, next,
        }, context.exceptionTarget);
    };

    const buildBindingOperation = (
        operation: AsyncBindingOperation,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const id = reserve();
        return setState({ kind: "binding-op", id, operation, next }, context.exceptionTarget);
    };

    const planBindingStagedExpression = (
        expression: ts.Expression,
    ): AsyncBindingStagedExpression => {
        if (containsAwait(expression)) {
            return {
                expression,
                storage: "result",
                slot: expressionResults.push(expression) - 1,
            };
        }
        let slot = expressionSyncSlots.get(expression);
        if (slot === undefined) {
            slot = expressionSyncs.length;
            expressionSyncs.push(expression);
            expressionSyncSlots.set(expression, slot);
        }
        return { expression, storage: "sync", slot };
    };

    const planBindingAssignmentTarget = (
        target: ts.Expression | undefined,
    ): AsyncBindingAssignmentTarget | null => {
        if (!target) return null;
        if (ts.isPropertyAccessExpression(target)) {
            return {
                kind: "property",
                node: target,
                receiver: planBindingStagedExpression(target.expression),
            };
        }
        if (ts.isElementAccessExpression(target)) {
            return {
                kind: "element",
                node: target,
                receiver: planBindingStagedExpression(target.expression),
                index: planBindingStagedExpression(target.argumentExpression),
            };
        }
        return null;
    };

    const buildBindingStagedExpression = (
        staged: AsyncBindingStagedExpression,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        if (staged.storage === "result") {
            return buildExpressionResult(staged.expression, staged.slot, next, context);
        }
        const id = reserve();
        return setState({
            kind: "expression-sync",
            id,
            expression: staged.expression,
            slot: staged.slot,
            next,
        }, context.exceptionTarget);
    };

    const buildBindingAssignmentPreparation = (
        target: AsyncBindingAssignmentTarget,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        let entry = next;
        if (target.kind === "element") {
            const index = buildBindingStagedExpression(target.index, entry, context);
            if (!index) return null;
            entry = index;
        }
        return buildBindingStagedExpression(target.receiver, entry, context);
    };

    const bindingAssignmentTargets = new Map<ts.Identifier, AsyncBindingAssignmentTarget | null>();
    const bindingAssignmentTarget = (
        identifier: ts.Identifier,
        targets: ReadonlyMap<ts.Identifier, ts.Expression>,
    ): AsyncBindingAssignmentTarget | null => {
        if (bindingAssignmentTargets.has(identifier)) return bindingAssignmentTargets.get(identifier)!;
        const plan = planBindingAssignmentTarget(targets.get(identifier));
        bindingAssignmentTargets.set(identifier, plan);
        return plan;
    };

    const buildBindingIdentifier = (
        identifier: ts.Identifier,
        valueSlot: number,
        initializer: ts.Expression | null,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>,
        initialize = true,
    ): AsyncControlFlowTarget | null => {
        const targetNode = assignmentTargets.get(identifier);
        const assignmentTarget = bindingAssignmentTarget(identifier,assignmentTargets);
        if (targetNode && !assignmentTarget) return null;
        const release = buildBindingOperation({ kind: "release", valueSlot }, next, context);
        const assign = buildBindingOperation({
            kind: "assign",
            identifier,
            assignmentTarget,
            valueSlot,
            initialize,
        }, release, context);
        let entry = assign;
        if (initializer) {
            const resultSlot = expressionResults.push(initializer) - 1;
            const apply = buildBindingOperation({
                kind: "default-apply",
                resultSlot,
                valueSlot,
            }, assign, context);
            const defaultTarget = buildExpressionResult(
                initializer,
                resultSlot,
                apply,
                context,
            );
            if (!defaultTarget) return null;
            entry = buildBindingOperation({
                kind: "default-test",
                valueSlot,
                defaultTarget,
            }, assign, context);
        }
        return entry;
    };

    const buildBindingElement = (
        element: ts.BindingElement,
        valueSlot: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>,
        initialize = true,
    ): AsyncControlFlowTarget | null => {
        if (ts.isIdentifier(element.name)) {
            return buildBindingIdentifier(
                element.name,
                valueSlot,
                element.initializer ?? null,
                next,
                context,
                assignmentTargets,
                initialize,
            );
        }
        const bound = buildBindingName(
            element.name,
            valueSlot,
            next,
            context,
            assignmentTargets,
            initialize,
        );
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
        assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>,
        initialize = true,
    ): AsyncControlFlowTarget | null => {
        if (ts.isIdentifier(binding)) {
            const assigned = buildBindingIdentifier(
                binding, valueSlot, null, next, context, assignmentTargets, initialize,
            );
            if (!assigned) return null;
            const reference = bindingAssignmentTarget(binding, assignmentTargets);
            return reference ? buildBindingAssignmentPreparation(reference, assigned, context) : assigned;
        }
        const array = ts.isArrayBindingPattern(binding);
        const release = buildBindingOperation({ kind: "release", valueSlot }, next, context);
        let protectedContext = context, entry = release, iteratorSlot = -1;
        if (array) {
            // Patterns and loops own the same Iterator Record collection.
            // Nested closes unwind through their enclosing completion edges.
            iteratorSlot = iteratorCount++;
            entry = setState({
                kind: "iterator-close", id: reserve(), slot: iteratorSlot,
                completion: "normal", next: release,
            }, context.exceptionTarget);
            const closeThrow = setState({
                kind: "iterator-close", id: reserve(), slot: iteratorSlot,
                completion: "throw", next: context.exceptionTarget?.target ?? null,
            }, context.exceptionTarget);
            const closeReturn = setState({
                kind: "iterator-close", id: reserve(), slot: iteratorSlot,
                completion: "return", next: context.returnTarget,
            }, context.exceptionTarget);
            protectedContext = { ...context, exceptionTarget: { target: closeThrow }, returnTarget: closeReturn };
        }
        const properties = new Map<ts.BindingElement, {
            name: ts.PropertyName | null;
            key: AsyncBindingStagedExpression | null;
            keySlot: number | null;
        }>();
        const hasRest = !array && binding.elements.some(element => ts.isBindingElement(element) && !!element.dotDotDotToken);
        if (!array) for (const element of binding.elements) {
            if (!ts.isBindingElement(element) || element.dotDotDotToken) continue;
            const name = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : null);
            if (!name) return null;
            properties.set(element, ts.isComputedPropertyName(name)
                ? { name: null, key: planBindingStagedExpression(name.expression), keySlot: bindingValueCount++ }
                : { name, key: null, keySlot: null });
        }
        const exclusions: AsyncBindingObjectRestExclusion[] = [...properties.values()].map(property =>
            property.keySlot !== null
                ? { kind: "value", valueSlot: property.keySlot }
                : { kind: "name", name: property.name! });
        for (let index = binding.elements.length - 1; index >= 0; index--) {
            const element = binding.elements[index];
            if (!element || ts.isOmittedExpression(element)) {
                if (array) entry = buildBindingOperation({
                    kind: "iterator-step", slot: iteratorSlot, valueSlot: null,
                }, entry, protectedContext);
                continue;
            }
            const childSlot = bindingValueCount++;
            const child = buildBindingElement(
                element, childSlot, entry, protectedContext, assignmentTargets, initialize,
            );
            if (!child) return null;
            let obtain: AsyncControlFlowTarget;
            if (element.dotDotDotToken) {
                if (index !== binding.elements.length - 1 || element.propertyName || element.initializer) return null;
                obtain = array
                    ? buildBindingOperation({ kind: "iterator-rest", slot: iteratorSlot, valueSlot: childSlot }, child, protectedContext)
                    : buildBindingOperation({
                        kind: "object-rest", sourceSlot: valueSlot, valueSlot: childSlot, exclusions,
                    }, child, protectedContext);
            } else if (array) {
                obtain = buildBindingOperation({
                    kind: "iterator-step", slot: iteratorSlot, valueSlot: childSlot,
                }, child, protectedContext);
            } else {
                const property = properties.get(element);
                if (!property) return null;
                obtain = buildBindingOperation({
                    kind: "property", sourceSlot: valueSlot, valueSlot: childSlot,
                    name: property.name, keySlot: property.keySlot, releaseKey: property.keySlot !== null && !hasRest,
                }, child, protectedContext);
            }
            // Save the assignment Reference operands before obtaining its
            // source value. Source computed names convert before that Reference.
            const reference = ts.isIdentifier(element.name)
                ? bindingAssignmentTarget(element.name, assignmentTargets) : null;
            if (reference) {
                const prepared = buildBindingAssignmentPreparation(reference, obtain, protectedContext);
                if (!prepared) return null;
                obtain = prepared;
            }
            const property = properties.get(element);
            if (property?.key) {
                const converted = buildBindingOperation({
                    kind: "property-key", key: property.key, valueSlot: property.keySlot!,
                }, obtain, protectedContext);
                const keyed = buildBindingStagedExpression(property.key, converted, protectedContext);
                if (!keyed) return null;
                obtain = keyed;
            }
            entry = obtain;
        }
        // A failed GetIterator cannot close an unacquired own record.
        return array
            ? buildBindingOperation({ kind: "iterator-open", sourceSlot: valueSlot, slot: iteratorSlot }, entry, context)
            : buildBindingOperation({ kind: "check", valueSlot }, entry, context);
    };

    const buildBindingFromValueSlot = (
        binding: ts.BindingName,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression> = new Map(),
        initialize = true,
    ): { readonly entry: AsyncControlFlowTarget; readonly valueSlot: number } | null => {
        const valueSlot = bindingValueCount++;
        const bound = buildBindingName(
            binding,
            valueSlot,
            next,
            context,
            assignmentTargets,
            initialize,
        );
        if (!bound) return null;
        return { entry: bound, valueSlot };
    };

    const buildSuspendingBinding = (
        binding: ts.BindingName,
        source: Extract<AsyncBindingOperation, { readonly kind: "source" }>["source"],
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget | null => {
        const bound = buildBindingFromValueSlot(binding, next, context);
        if (!bound) return null;
        return buildBindingOperation({
            kind: "source",
            source,
            valueSlot: bound.valueSlot,
        }, bound.entry, context);
    };

    const buildSequence = (
        sequence: readonly ts.Statement[],
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const firstResource = sequence.findIndex(statement => ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.Using) !== 0 &&
            statement.declarationList.declarations.some(declaration => !resourceBindings.has(declaration)));
        if (firstResource >= 0) return buildResourceScope(sequence, firstResource, next, context);
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
        if (block === body && options.instantiatedRoot) return buildSequence(block.statements, next, context);
        const lexical = directLexicalDeclarations(block.statements);
        const bindings = lexical.map((declaration) => declaration.name);
        const functions = lexical.filter((declaration): declaration is ts.FunctionDeclaration & { name: ts.Identifier } =>
            ts.isFunctionDeclaration(declaration));
        bindingIdentifiers.push(...lexical.filter((declaration) => !ts.isVariableDeclaration(declaration))
            .map((declaration) => declaration.name));
        if (bindings.length === 0) return buildSequence(block.statements, next, context);
        if (options.retainedSourceEnvironments) return buildLexicalRegion(block, bindings, functions, next, context,
            (normal, protectedContext) => buildSequence(block.statements, normal, protectedContext));
        const id = reserve();
        const entry = buildSequence(block.statements, next, context);
        return setState({ kind: "scope-enter", id, bindings, functions, next: entry }, context.exceptionTarget);
    };

    const buildFinalizationRegion = (
        next: AsyncControlFlowTarget,
        context: BuildContext,
        buildFinalizer: (exit: AsyncControlFlowTarget, region: number) => AsyncControlFlowTarget,
        buildProtected: (
            normalEnter: AsyncControlFlowTarget,
            throwEnter: AsyncControlFlowTarget,
            protectedContext: BuildContext,
        ) => AsyncControlFlowTarget,
    ): AsyncControlFlowTarget => {
        const region = finallyCount++;
        const finallyExitId = reserve();
        const finallyExitTarget = target(finallyExitId);
        const finallyEntry = buildFinalizer(finallyExitTarget, region);

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

    const retainedScopeOwners = new Set<ts.Node>();
    const retainedSwitchDiscriminators = new Map<ts.SwitchStatement,number>();
    const buildLexicalRegion = (owner: ts.Node, bindings: readonly ts.BindingName[], functions: readonly ts.FunctionDeclaration[],
        next: AsyncControlFlowTarget, context: BuildContext,
        buildBody: (normal: AsyncControlFlowTarget, context: BuildContext) => AsyncControlFlowTarget): AsyncControlFlowTarget => {
        retainedScopeOwners.add(owner);
        const id = reserve();
        return buildFinalizationRegion(next, context,
            exit => setState({kind:"environment-exit",id:reserve(),slot:id,next:exit},context.exceptionTarget),
            (normal, thrown, protectedContext) => {
                const entry=buildBody(normal,{...protectedContext,exceptionTarget:{target:thrown}});
                return setState({kind:"scope-enter",id,bindings,functions,retainedEnvironment:true,next:entry},context.exceptionTarget);
            });
    };

    const buildResourceRegion = (
        resources: readonly ts.VariableDeclaration[],
        next: AsyncControlFlowTarget,
        context: BuildContext,
        buildProtected: (next: AsyncControlFlowTarget, context: BuildContext) => AsyncControlFlowTarget,
    ): AsyncControlFlowTarget => {
        if (resources.some(declaration => !ts.isIdentifier(declaration.name))) {
            supported = false;
            return next;
        }
        const asynchronous = resources.some(declaration =>
            (declaration.parent.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing);
        const slot = resourceScopes.push({declarations: resources, asynchronous}) - 1;
        for (const declaration of resources) resourceBindings.set(declaration, slot);
        return buildFinalizationRegion(next, context, (finallyExit, region) => {
            const id = reserve();
            if (asynchronous) awaitCount++;
            return setState({kind: "resource-dispose", id, slot, region, asynchronous, next: finallyExit}, context.exceptionTarget);
        }, (normalEnter, throwEnter, protectedContext) => {
            const entry = buildProtected(normalEnter, {...protectedContext, exceptionTarget: {target: throwEnter}});
            const id = reserve();
            return setState({kind: "resource-enter", id, slot, next: entry}, context.exceptionTarget);
        });
    };

    const buildResourceScope = (
        sequence: readonly ts.Statement[],
        firstResource: number,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        const protectedStatements = sequence.slice(firstResource);
        const resources = protectedStatements.flatMap(statement => ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.Using) !== 0 ? [...statement.declarationList.declarations] : []);
        if (resources.some(declaration => !declaration.initializer)) {
            supported = false;
            return next;
        }
        const entry = buildResourceRegion(resources, next, context,
            (normal, protectedContext) => buildSequence(protectedStatements, normal, protectedContext));
        return buildSequence(sequence.slice(0, firstResource), entry, context);
    };

    const buildLoop = (
        statement: ts.WhileStatement | ts.DoStatement | ts.ForStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        if (options.retainedSourceEnvironments && !retainedScopeOwners.has(statement) && ts.isForStatement(statement) &&
            statement.initializer && ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.BlockScoped) !== 0)
            return buildLexicalRegion(statement,statement.initializer.declarations.map(declaration=>declaration.name),[],next,context,
                (normal,protectedContext)=>buildLoop(statement,normal,protectedContext,label));
        if (ts.isForStatement(statement) && statement.initializer && ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.Using) !== 0 &&
            statement.initializer.declarations.some(declaration => !resourceBindings.has(declaration)))
            return buildResourceRegion([...statement.initializer.declarations], next, context,
                (normal, protectedContext) => buildLoop(statement, normal, protectedContext, label));
        const conditionId = reserve();
        const conditionTarget = target(conditionId);
        const headList = ts.isForStatement(statement) && statement.initializer &&
            ts.isVariableDeclarationList(statement.initializer) ? statement.initializer : null;
        const headDeclarations = headList ? lexicalDeclarationsFromList(headList) : [];
        const headBindings = headDeclarations.map((declaration) => declaration.name);
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
        if (headList && (headList.flags & ts.NodeFlags.Let) !== 0) {
            const bindings = headBindings;
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
        if (!containsAwait(rawCondition)) {
            setState({ kind: "branch", id: conditionId, expression: rawCondition,
                truthy: bodyEntry, falsy: next }, context.exceptionTarget);
        } else {
            loopAwaitDepth = Math.max(loopAwaitDepth, currentLoopDepth + 1);
            const conditionEntry = buildExpressionSequence(rawCondition, null, next, context, null,
                { mode: "truthy", truthy: bodyEntry, falsy: next });
            if (!conditionEntry) { supported = false; return next; }
            setState({ kind: "sync", id: conditionId,
                statement: ts.factory.createEmptyStatement(), next: conditionEntry }, context.exceptionTarget);
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
        if (headBindings.length > 0 && !retainedScopeOwners.has(statement)) {
            const id = reserve();
            entry = setState({ kind: "scope-enter", id, bindings: headBindings,
                functions: [], next: entry }, context.exceptionTarget);
        }
        return entry;
    };

    const buildIteratorLoop = (
        statement: ts.ForInStatement | ts.ForOfStatement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
        label: string | null,
    ): AsyncControlFlowTarget => {
        if (options.retainedSourceEnvironments && !retainedScopeOwners.has(statement) && ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.BlockScoped) !== 0)
            return buildLexicalRegion(statement,statement.initializer.declarations.map(declaration=>declaration.name),[],next,context,
                (normal,protectedContext)=>buildIteratorLoop(statement,normal,protectedContext,label));
        const asynchronous = ts.isForOfStatement(statement) && !!statement.awaitModifier;
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
            binding = declaration.name;
            if (ts.isIdentifier(declaration.name)) {
                declarations.push(declaration);
            } else {
                bindingIdentifiers.push(...collectBindingIdentifiers(declaration.name));
            }
        } else {
            const assignmentBinding = normalizeAssignmentTarget(
                statement.initializer,
                assignmentTargets,
            );
            if (!assignmentBinding) {
                supported = false;
                return next;
            }
            binding = assignmentBinding;
        }

        // Cardinality is independent of the iterable: one init/next state pair
        // is allocated per syntactic loop and every body completion returns to
        // the same next-state back edge. Runtime iteration count never enters
        // graph construction.
        const slot = asynchronous ? asyncIteratorCount++ : iteratorCount++;
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
                kind: asynchronous ? "async-iterator-close" : "iterator-close",
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
            kind: asynchronous ? "async-iterator-close" : "iterator-close",
            id: closeReturnId,
            slot,
            completion: "return",
            next: context.returnTarget,
        }, context.exceptionTarget);
        const closeThrowId = reserve();
        const closeThrow = setState({
            kind: asynchronous ? "async-iterator-close" : "iterator-close",
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
        let bindingValueSlot = -1;
        const buildIteration = (bodyNext: AsyncControlFlowTarget, iterationContext: BuildContext): AsyncControlFlowTarget => {
            const bodyEntry = ts.isBlock(statement.statement)
                ? buildLexicalBlock(statement.statement, bodyNext, iterationContext)
                : buildSequence([statement.statement], bodyNext, iterationContext);
            const bound = buildBindingFromValueSlot(binding, bodyEntry, iterationContext, assignmentTargets, ts.isVariableDeclarationList(statement.initializer));
            if (!bound) { supported = false; return bodyNext; }
            bindingValueSlot = bound.valueSlot;
            return bound.entry;
        };
        const resources = ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.Using) !== 0 ? [...statement.initializer.declarations] : [];
        const bindingEntry = resources.length > 0
            ? buildResourceRegion(resources, nextTarget, bodyContext, buildIteration)
            : buildIteration(nextTarget, bodyContext);
        if (!supported || bindingValueSlot < 0) {
            currentLoopDepth--;
            supported = false;
            return next;
        }
        currentLoopDepth--;
        const nextState = {
            id: nextId,
            statement,
            binding,
            assignmentTargets,
            slot,
            bindingValueSlot,
            body: bindingEntry,
            done: next,
        };
        if (asynchronous && ts.isForOfStatement(statement)) setState({ ...nextState, kind: "async-iterator-next", statement }, context.exceptionTarget);
        else setState({ ...nextState, kind: "iterator-next", statement }, context.exceptionTarget);
        const initState = {
            id: initId,
            statement,
            binding,
            assignmentTargets,
            slot,
            sourceResultSlot,
            next: nextTarget,
        };
        const init = asynchronous && ts.isForOfStatement(statement)
            ? setState({ ...initState, kind: "async-iterator-init", statement }, context.exceptionTarget)
            : setState({ ...initState, kind: "iterator-init", statement }, context.exceptionTarget);
        const sourceEntry = sourceResultSlot === null ? init : buildExpressionResult(
            statement.expression,
            sourceResultSlot,
            init,
            context,
        );
        if (!sourceEntry) {
            supported = false;
            return next;
        }
        if (ts.isVariableDeclarationList(statement.initializer) &&
            (statement.initializer.flags & ts.NodeFlags.BlockScoped) !== 0 && !retainedScopeOwners.has(statement)) {
            return setState({ kind: "scope-enter", id: reserve(), bindings: [binding], functions: [], next: sourceEntry }, context.exceptionTarget);
        }
        return sourceEntry;
    };

    const buildStatement = (
        statement: ts.Statement,
        next: AsyncControlFlowTarget,
        context: BuildContext,
    ): AsyncControlFlowTarget => {
        if (options.suspensionKind === "async-generator" && ts.isReturnStatement(statement) && statement.expression) {
            const awaited = ts.factory.createAwaitExpression(statement.expression);
            const returned = ts.factory.updateReturnStatement(statement, awaited);
            ts.setTextRange(awaited, statement.expression);
            Object.assign(returned, { parent: statement.parent });
            Object.assign(awaited, { parent: returned });
            statement = returned;
        }
        if (ts.isBlock(statement)) return buildLexicalBlock(statement, next, context);
        if (ts.isWithStatement(statement)) {
            const slot = reserve(), sourceResultSlot = expressionResults.push(statement.expression) - 1;
            return buildFinalizationRegion(next, context,
                exit => setState({kind: "environment-exit", id: reserve(), slot, next: exit}, context.exceptionTarget),
                (normal, thrown, protectedContext) => {
                    const entry = buildStatement(statement.statement, normal, {...protectedContext, exceptionTarget: {target: thrown}});
                    const entered = setState({kind: "object-scope-enter", id: slot, slot, sourceResultSlot, next: entry}, context.exceptionTarget);
                    return buildExpressionResult(statement.expression, sourceResultSlot, entered, context) ?? next;
                });
        }
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
            if (containsAwait(condition)) {
                const entry = buildExpressionSequence(condition, null, next, context, null,
                    { mode: "truthy", truthy, falsy });
                if (entry) return entry;
                supported = false; return next;
            }
            const id = reserve();
            return setState(
                { kind: "branch", id, expression: condition, truthy, falsy },
                context.exceptionTarget,
            );
        }
        if (ts.isSwitchStatement(statement)) {
            const scopeDeclarations=directLexicalDeclarations(statement.caseBlock.clauses.flatMap(clause=>[...clause.statements]));
            if(options.retainedSourceEnvironments && scopeDeclarations.length && !retainedScopeOwners.has(statement)) {
                const resultSlot=expressionResults.push(statement.expression)-1;
                retainedSwitchDiscriminators.set(statement,resultSlot);
                const entered=buildLexicalRegion(statement,scopeDeclarations.map(declaration=>declaration.name),
                    scopeDeclarations.filter((declaration):declaration is ts.FunctionDeclaration & {name:ts.Identifier}=>ts.isFunctionDeclaration(declaration)),next,context,
                    (normal,protectedContext)=>buildStatement(statement,normal,protectedContext));
                // Discriminator evaluation precedes CaseBlock instantiation.
                const entry=buildExpressionResult(statement.expression,resultSlot,entered,context);
                return entry??next;
            }
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
            const discriminatorResultSlot = retainedSwitchDiscriminators.get(statement) ?? expressionResults.push(statement.expression) - 1;
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
            const lexical = directLexicalDeclarations(statement.caseBlock.clauses.flatMap((clause) => [...clause.statements]));
            const switchFunctions = lexical.filter((declaration): declaration is ts.FunctionDeclaration & { name: ts.Identifier } =>
                ts.isFunctionDeclaration(declaration));
            const switchBindings = lexical.map((declaration) => declaration.name);
            bindingIdentifiers.push(...lexical.filter((declaration) => !ts.isVariableDeclaration(declaration))
                .map((declaration) => declaration.name));
            // The CaseBlock environment is created after the discriminator
            // and before the first case expression, even when no lexical
            // declarations contribute captured cells.
            if (!retainedScopeOwners.has(statement)) selectionEntry = setState({
                kind: "scope-enter",
                id: reserve(),
                bindings: switchBindings,
                functions: switchFunctions,
                next: selectionEntry,
            }, context.exceptionTarget);
            if (retainedSwitchDiscriminators.has(statement)) return selectionEntry;
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
                const binding = catchClause.variableDeclaration?.name ?? null;
                if(options.retainedSourceEnvironments && binding && !retainedScopeOwners.has(catchClause))
                    return buildLexicalRegion(catchClause,[binding],[],catchNext,catchContext,
                        (normal,protectedContext)=>buildCatchEntry(catchClause,normal,protectedContext));
                let catchEntry = buildLexicalBlock(catchClause.block, catchNext, catchContext);
                if (catchClause.variableDeclaration) {
                    if (binding && ts.isIdentifier(binding)) {
                        declarations.push(catchClause.variableDeclaration);
                    } else if (binding) {
                        bindingIdentifiers.push(...collectBindingIdentifiers(binding));
                    }
                }
                if (binding && containsSuspendingBindingExpression(binding)) {
                    const bound = buildSuspendingBinding(
                        binding,
                        { kind: "exception", node: binding },
                        catchEntry,
                        catchContext,
                    );
                    if (!bound) {
                        supported = false;
                        return catchNext;
                    }
                    const scopeId = reserve();
                    return setState({
                        kind: "scope-enter",
                        id: scopeId,
                        bindings: [binding],
                        functions: [],
                        next: bound,
                    }, catchContext.exceptionTarget);
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
            const expression = statement.expression;
            if (expression && containsAwait(expression)) {
                const sequence = buildExpressionSequence(expression, null, next, context,
                    { kind: completion.kind, target: completion.kind === "return" ? context.returnTarget : null });
                if (sequence) return sequence;
                supported = false; return next;
            }
            const id = reserve();
            if (completion.kind === "return" && context.returnTarget) {
                return setState({
                    kind: "return-route",
                    id,
                    completion,
                    target: context.returnTarget,
                }, context.exceptionTarget);
            }
            if (completion.kind === "throw" && context.exceptionTarget) {
                return setState({
                    kind: "throw-route",
                    id,
                    expression: completion.value,
                    target: context.exceptionTarget.target,
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
                let withInitializer=false;
                if(initializer && (statement.declarationList.flags & ts.NodeFlags.BlockScoped)===0)
                    for(let node:ts.Node|undefined=declaration.parent;node;node=node.parent)
                        if(ts.isWithStatement(node)&&node.statement.pos<=declaration.pos&&node.statement.end>=declaration.end){withInitializer=true;break;}
                if(withInitializer){
                    const assignment=ts.factory.createBinaryExpression(assignmentTargetFromBinding(declaration.name),ts.SyntaxKind.EqualsToken,declaration.initializer!);
                    ts.setTextRange(assignment,declaration);Object.assign(assignment,{parent:declaration.parent});
                    const entry=buildExpressionSequence(assignment,null,next,context);
                    if(entry)return entry;
                    supported=false;return next;
                }
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
                            { kind: "expression-result", resultSlot },
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
                if (initializer && containsAwait(initializer)) {
                    const sequence = buildExpressionSequence(declaration.initializer!, declaration.name, next, context);
                    if (sequence) return sequence;
                }
            }
        }
        if (ts.isExpressionStatement(statement) && containsAwait(statement.expression)) {
            const sequence = buildExpressionSequence(statement.expression, null, next, context);
            if (sequence) return sequence;
        }
        if (options.instantiatedRoot &&
            (ts.isExportAssignment(statement) && !statement.isExportEquals ||
                ts.isClassDeclaration(statement) && (!statement.name || options.isModuleDefaultClass?.(statement)))) {
            const expression = ts.isExportAssignment(statement) ? statement.expression : classExpressionFromDeclaration(statement);
            const valueSlot = expressionResults.push(expression) - 1;
            operationResultSlots.add(valueSlot);
            const completed = setState({ kind: "module-export", id: reserve(), statement, valueSlot, next }, context.exceptionTarget);
            const sequence = buildExpressionSequence(expression, null, completed, context, null, null, valueSlot);
            if (sequence) return sequence;
            supported = false;
            return next;
        }
        if(ts.isClassDeclaration(statement)&&statement.name&&containsAwait(statement)&&options.isSupportedNestedClass?.(statement)){
            const sequence=buildExpressionSequence(classExpressionFromDeclaration(statement),statement.name,next,context);
            if(sequence)return sequence;
        }
        if (containsAwait(statement) ||
            containsUnsupportedNestedFunctionOrClass(statement) ||
            ((ts.isForInStatement(statement) || ts.isForOfStatement(statement)) &&
                !opaqueSynchronousLoopSupported(statement)) ||
            (ts.isFunctionDeclaration(statement) &&
                !options.isSupportedNestedFunction?.(statement)) ||
            (ts.isClassDeclaration(statement) &&
                !options.isSupportedNestedClass?.(statement))) {
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
    const entry = buildLexicalBlock(body, target(terminalId), {
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
            case "resumable-expression": {
                const operation = state.operation;
                if (operation.kind === "complete") targets.push(state.next);
                else if (operation.kind === "branch") targets.push(state.targets.get(operation.yes)!, state.targets.get(operation.no)!);
                else targets.push(state.targets.get(operation.next)!);
                if (operation.kind === "suspend" && state.returnTarget) targets.push(state.returnTarget);
                break;
            }
            case "sync":
            case "scope-enter":
            case "scope-clone":
            case "object-scope-enter":
            case "environment-exit":
            case "expression-sync":
            case "resource-enter":
            case "resource-dispose":
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
            case "module-export":
                targets.push(state.next);
                break;
            case "expression-complete":
                if (state.branch) {
                    targets.push(state.branch.truthy, state.branch.falsy);
                    if (state.branch.nullish) targets.push(state.branch.nullish);
                } else if (state.completion?.kind === "return" && state.completion.target) {
                    targets.push(state.completion.target);
                } else if (!state.completion && state.next) {
                    targets.push(state.next);
                }
                break;
            case "branch":
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
            case "iterator-close":
            case "async-iterator-close":
                if (state.next) targets.push(state.next);
                break;
            case "switch-dispatch":
                targets.push(...state.clauses.map((clause) => clause.target), state.defaultTarget);
                break;
            case "throw-route":
            case "return-route":
                targets.push(state.target);
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
            case "completion":
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
        state.kind === "resource-dispose" && state.asynchronous ||
        state.kind === "async-iterator-next" || state.kind === "async-iterator-close" ||
        state.kind === "resumable-expression" && state.operation.kind === "suspend" ||
        (state.kind === "return-route" && state.completion.awaitExpr !== null)
            ? 1
            : 0
    ), 0);
    /* Keep the direct synchronous async-function path only when graph
     * construction found no suspension at all. A source function can contain
     * suspensions whose states are all removed by the reachability worklist
     * (for example, code following an unconditional abrupt completion in a
     * protected region). In that case this zero-suspension graph is the
     * canonical proof that the syntax is unreachable; rejecting it would send
     * the original await-bearing tree to an emitter which must fail closed. */
    if (reachableAwaitCount < 1 && awaitCount < 1 && options.suspensionKind !== "generator" && options.suspensionKind !== "async-generator") return null;
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
        resourceScopes,
        expressionSyncs,
        expressionResults,
        operationResultSlots,
    };
}
