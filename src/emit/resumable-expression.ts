import ts from "typescript";
import { normalizeAssignmentTarget } from "./binding-tree";

export type ResumableValueSlot = number;
export type ResumableExpressionTarget = number;
export type ResumableReference =
    | { readonly kind: "binding"; readonly identifier: ts.Identifier }
    | { readonly kind: "property"; readonly node: ts.PropertyAccessExpression | ts.ElementAccessExpression;
        readonly base: ResumableValueSlot; readonly key: ResumableValueSlot; readonly receiver?: ResumableValueSlot };

type ValueOperation =
    | { readonly kind: "evaluate"; readonly expression: ts.Expression;
        readonly inputs: readonly { readonly expression: ts.Expression; readonly slot: ResumableValueSlot }[] }
    | { readonly kind: "super-constructor"; readonly node: ts.CallExpression }
    | { readonly kind: "super-this"; readonly node: ts.PropertyAccessExpression | ts.ElementAccessExpression }
    | { readonly kind: "super-base"; readonly node: ts.PropertyAccessExpression | ts.ElementAccessExpression }
    | { readonly kind: "copy"; readonly source: ResumableValueSlot }
    | { readonly kind: "undefined" }
    | { readonly kind: "property-key"; readonly source: ResumableValueSlot }
    | { readonly kind: "get"; readonly reference: ResumableReference }
    | { readonly kind: "set"; readonly reference: ResumableReference; readonly source: ResumableValueSlot }
    | { readonly kind: "delete"; readonly reference: ResumableReference }
    | { readonly kind: "update"; readonly reference: ResumableReference;
        readonly increment: boolean; readonly prefix: boolean }
    | { readonly kind: "compound"; readonly operator: ts.SyntaxKind;
        readonly left: ResumableValueSlot; readonly right: ResumableValueSlot }
    | { readonly kind: "arguments" }
    | { readonly kind: "template-object"; readonly template: ts.TemplateLiteral }
    | { readonly kind: "call"; readonly node: ts.CallExpression | ts.NewExpression | ts.TaggedTemplateExpression;
        readonly callee: ResumableValueSlot; readonly receiver: ResumableValueSlot | null;
        readonly arguments: ResumableValueSlot; readonly construct: boolean }
    | { readonly kind: "array" }
    | { readonly kind: "object" };

export type ResumableExpressionState =
    | { readonly kind: "binding"; readonly id: number; readonly node: ts.BinaryExpression;
        readonly binding: ts.BindingName; readonly assignmentTargets: ReadonlyMap<ts.Identifier, ts.Expression>;
        readonly source: ResumableValueSlot; readonly output: ResumableValueSlot;
        readonly next: ResumableExpressionTarget }
    | { readonly kind: "value"; readonly id: number; readonly operation: ValueOperation;
        readonly output: ResumableValueSlot; readonly next: ResumableExpressionTarget }
    | { readonly kind: "append"; readonly id: number; readonly target: ResumableValueSlot;
        readonly source: ResumableValueSlot | null; readonly spread: boolean; readonly container: "array" | "arguments";
        readonly next: ResumableExpressionTarget }
    | { readonly kind: "define"; readonly id: number; readonly target: ResumableValueSlot;
        readonly key: ResumableValueSlot; readonly source: ResumableValueSlot;
        readonly next: ResumableExpressionTarget }
    | { readonly kind: "define-member"; readonly id: number; readonly target: ResumableValueSlot;
        readonly key: ResumableValueSlot; readonly member: ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration;
        readonly next: ResumableExpressionTarget }
    | { readonly kind: "spread-object"; readonly id: number; readonly target: ResumableValueSlot;
        readonly source: ResumableValueSlot; readonly next: ResumableExpressionTarget }
    | { readonly kind: "prototype"; readonly id: number; readonly target: ResumableValueSlot;
        readonly source: ResumableValueSlot; readonly next: ResumableExpressionTarget }
    | { readonly kind: "template-append"; readonly id: number; readonly target: ResumableValueSlot;
        readonly source: ResumableValueSlot; readonly tail: string; readonly next: ResumableExpressionTarget }
    | { readonly kind: "branch"; readonly id: number; readonly source: ResumableValueSlot;
        readonly mode: "truthy" | "nullish"; readonly yes: ResumableExpressionTarget;
        readonly no: ResumableExpressionTarget }
    | { readonly kind: "suspend"; readonly id: number; readonly node: ts.AwaitExpression | ts.YieldExpression;
        readonly source: ResumableValueSlot | null; readonly output: ResumableValueSlot;
        readonly suspension: "await" | "yield" | "delegate"; readonly next: ResumableExpressionTarget }
    | { readonly kind: "jump"; readonly id: number; readonly next: ResumableExpressionTarget }
    | { readonly kind: "complete"; readonly id: number; readonly value: ResumableValueSlot };

export interface ResumableExpressionGraph {
    readonly entry: ResumableExpressionTarget;
    readonly states: readonly ResumableExpressionState[];
    /** Source ownership for every retained value, including normalized keys,
     * actual argument Lists and partially initialized literal owners. */
    readonly values: readonly ts.Expression[];
    readonly result: ResumableValueSlot;
}

export interface ResumableExpressionFailure {
    readonly node: ts.Node;
    readonly message: "resumable expression requires a canonical operation";
}

export type ResumableExpressionPlan =
    | { readonly kind: "graph"; readonly graph: ResumableExpressionGraph }
    | { readonly kind: "unsupported"; readonly failure: ResumableExpressionFailure };

function transparent(expression: ts.Expression): ts.Expression {
    let node = expression;
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node))
        node = node.expression;
    return node;
}

/** One continuation worklist lowers an expression tree. IDs and value slots
 * come exclusively from its collections; no suspension count, call arity,
 * branch depth or literal width changes the algorithm. Reference formation,
 * GetValue, ToPropertyKey and actual argument iteration are distinct states. */
export function planResumableExpression(expression: ts.Expression, options: { asyncGenerator?: boolean } = {}): ResumableExpressionPlan {
    const states: Array<ResumableExpressionState | undefined> = [];
    const values: ts.Expression[] = [];
    const worklist: Array<() => void> = [];
    let failure: ResumableExpressionFailure | null = null;
    const reject = (node: ts.Node): void => {
        failure ??= { node, message: "resumable expression requires a canonical operation" };
    };
    const reserve = (): number => states.push(undefined) - 1;
    const value = (owner: ts.Expression): number => values.push(owner) - 1;
    const put = (state: ResumableExpressionState): number => {
        states[state.id] = state;
        return state.id;
    };
    const operation = (op: ValueOperation, output: number, next: number): number =>
        put({ kind: "value", id: reserve(), operation: op, output, next });
    const jump = (id: number, next: number): void => { put({ kind: "jump", id, next }); };
    const copy = (source: number, output: number, next: number): number =>
        operation({ kind: "copy", source }, output, next);
    const result = value(expression);
    const complete = put({ kind: "complete", id: reserve(), value: result });

    const buildReference = (node: ts.Expression,
        consumer: (reference: ResumableReference) => number, chainExit?: number): number => {
        const current = transparent(node);
        if (ts.isIdentifier(current)) return consumer({ kind: "binding", identifier: current });
        if (!ts.isPropertyAccessExpression(current) && !ts.isElementAccessExpression(current)) {
            reject(current); return complete;
        }
        if (current.questionDotToken && chainExit === undefined ||
            ts.isPropertyAccessExpression(current) && ts.isPrivateIdentifier(current.name)) {
            reject(current); return complete;
        }
        const base = value(current.expression), key = value(current);
        const superReference = current.expression.kind === ts.SyntaxKind.SuperKeyword;
        const receiver = superReference ? value(current.expression) : undefined;
        const reference: ResumableReference = { kind: "property", node: current, base, key, receiver };
        const next = superReference ? operation({ kind: "super-base", node: current }, base, consumer(reference)) : consumer(reference);
        let keyEntry: number;
        if (ts.isPropertyAccessExpression(current)) {
            keyEntry = operation({ kind: "evaluate", expression: ts.factory.createStringLiteral(current.name.text), inputs: [] }, key, next);
        } else {
            const raw = value(current.argumentExpression);
            keyEntry = build(current.argumentExpression, raw, copy(raw, key, next));
        }
        if (current.questionDotToken) keyEntry = put({ kind: "branch", id: reserve(), source: base,
            mode: "nullish", yes: chainExit!, no: keyEntry });
        return superReference ? operation({ kind: "super-this", node: current }, receiver!, keyEntry)
            : build(current.expression, base, keyEntry, chainExit);
    };

    const buildOrdered = (children: readonly { expression: ts.Expression; slot: number }[], next: number): number => {
        let entry = next;
        for (let index = children.length - 1; index >= 0; --index) {
            const child = children[index]!;
            entry = build(child.expression, child.slot, entry);
        }
        return entry;
    };

    const buildCall = (node: ts.CallExpression | ts.NewExpression | ts.TaggedTemplateExpression, output: number, next: number, chainExit?: number): number => {
        const tagged = ts.isTaggedTemplateExpression(node);
        const targetExpression = tagged ? node.tag : node.expression;
        const args = tagged ? ts.isTemplateExpression(node.template) ? node.template.templateSpans.map(span => span.expression) : [] : node.arguments ?? [];
        const target = transparent(targetExpression), callee = value(target), actuals = value(node);
        let receiver: number | null = null;
        const targetIsProperty = ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target);
        if (targetIsProperty) receiver = value(target.expression);
        const apply = operation({ kind: "call", node, callee, receiver, arguments: actuals,
            construct: ts.isNewExpression(node) }, output, next);
        let argumentsEntry = apply;
        for (let index = args.length - 1; index >= 0; --index) {
            const argument = args[index]!, spread = ts.isSpreadElement(argument);
            const source = spread ? argument.expression : argument;
            const slot = value(source);
            const append = put({ kind: "append", id: reserve(), target: actuals, source: slot, spread, container: "arguments", next: argumentsEntry });
            argumentsEntry = build(source, slot, append);
        }
        if (tagged) {
            const template = value(node.template);
            const append = put({ kind: "append", id: reserve(), target: actuals, source: template, spread: false, container: "arguments", next: argumentsEntry });
            argumentsEntry = operation({ kind: "template-object", template: node.template }, template, append);
        }
        argumentsEntry = operation({ kind: "arguments" }, actuals, argumentsEntry);
        const skip = chainExit ?? operation({ kind: "undefined" }, output, next);
        if (ts.isCallExpression(node) && node.questionDotToken) {
            argumentsEntry = put({ kind: "branch", id: reserve(), source: callee, mode: "nullish",
                yes: skip, no: argumentsEntry });
        }
        if (ts.isCallExpression(node) && target.kind === ts.SyntaxKind.SuperKeyword)
            return operation({ kind: "super-constructor", node }, callee, argumentsEntry);
        if (!targetIsProperty) return build(targetExpression, callee, argumentsEntry, ts.isOptionalChain(node) ? skip : undefined);
        const calleeExit = ts.isOptionalChain(node) && !ts.isParenthesizedExpression(targetExpression)
            ? skip : operation({ kind: "undefined" }, callee, argumentsEntry);
        return buildReference(target, reference => {
            if (reference.kind !== "property") throw new Error("property call requires a property Reference");
            const get = operation({ kind: "get", reference }, callee, argumentsEntry);
            return copy(reference.receiver ?? reference.base, receiver!, get);
        }, calleeExit);

    };

    const buildLiteral = (node: ts.ArrayLiteralExpression | ts.ObjectLiteralExpression, output: number, next: number): number => {
        let entry = next;
        if (ts.isArrayLiteralExpression(node)) {
            for (let index = node.elements.length - 1; index >= 0; --index) {
                const element = node.elements[index]!;
                if (ts.isOmittedExpression(element)) {
                    entry = put({ kind: "append", id: reserve(), target: output, source: null, spread: false, container: "array", next: entry });
                    continue;
                }
                const spread = ts.isSpreadElement(element), source = spread ? element.expression : element;
                const slot = value(source);
                const append = put({ kind: "append", id: reserve(), target: output, source: slot, spread, container: "array", next: entry });
                entry = build(source, slot, append);
            }
            return operation({ kind: "array" }, output, entry);
        }
        for (let index = node.properties.length - 1; index >= 0; --index) {
            const property = node.properties[index]!;
            if (ts.isSpreadAssignment(property)) {
                const source = value(property.expression);
                const spread = put({ kind: "spread-object", id: reserve(), target: output, source, next: entry });
                entry = build(property.expression, source, spread);
                continue;
            }
            if (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) {
                const key = value(node);
                const define = put({ kind: "define-member", id: reserve(), target: output, key, member: property, next: entry });
                if (ts.isComputedPropertyName(property.name)) {
                    const raw = value(property.name.expression);
                    const normalize = operation({ kind: "property-key", source: raw }, key, define);
                    entry = build(property.name.expression, raw, normalize);
                } else if (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) || ts.isNumericLiteral(property.name)) {
                    const text = ts.isNumericLiteral(property.name) ? String(Number(property.name.text)) : property.name.text;
                    entry = operation({ kind: "evaluate", expression: ts.factory.createStringLiteral(text), inputs: [] }, key, define);
                } else { reject(property.name); return complete; }
                continue;
            }
            if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
                reject(property); return complete;
            }
            const sourceNode = ts.isPropertyAssignment(property) ? property.initializer : property.name;
            const source = value(sourceNode), key = value(node);
            if (ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) &&
                (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) && property.name.text === "__proto__") {
                const setPrototype = put({ kind: "prototype", id: reserve(), target: output, source, next: entry });
                entry = build(sourceNode, source, setPrototype); continue;
            }
            const define = put({ kind: "define", id: reserve(), target: output, key, source, next: entry });
            entry = build(sourceNode, source, define);
            if (ts.isComputedPropertyName(property.name)) {
                const raw = value(property.name.expression);
                const normalize = operation({ kind: "property-key", source: raw }, key, entry);
                entry = build(property.name.expression, raw, normalize);
            } else if (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) || ts.isNumericLiteral(property.name)) {
                const text = ts.isNumericLiteral(property.name) ? String(Number(property.name.text)) : property.name.text;
                entry = operation({ kind: "evaluate", expression: ts.factory.createStringLiteral(text), inputs: [] }, key, entry);
            } else { reject(property.name); return complete; }
        }
        return operation({ kind: "object" }, output, entry);
    };

    const build = (source: ts.Expression, output: number, next: number, chainExit?: number): number => {
        const anchor = reserve();
        worklist.push(() => {
            const node = transparent(source);
            if (!suspending.get(source)) {
                jump(anchor, operation({ kind: "evaluate", expression: source, inputs: [] }, output, next));
                return;
            }
            // Parentheses delimit optional-chain propagation while retaining a
            // property Reference for an enclosing call's receiver.
            const optionalExit = ts.isOptionalChain(node) ?
                !ts.isParenthesizedExpression(source) && chainExit !== undefined ? chainExit
                    : operation({ kind: "undefined" }, output, next) : undefined;
            if (ts.isAwaitExpression(node) || ts.isYieldExpression(node)) {
                const operand = node.expression, slot = operand ? value(operand) : null;
                const suspension = ts.isAwaitExpression(node) ? "await" : node.asteriskToken ? "delegate" : "yield";
                const awaited = options.asyncGenerator && suspension === "yield" ? value(node) : null;
                const suspend = put({ kind: "suspend", id: reserve(), node, source: awaited ?? slot, output, suspension, next });
                const entry = awaited === null ? suspend : put({ kind: "suspend", id: reserve(), node,
                    source: slot, output: awaited, suspension: "await", next: suspend });
                jump(anchor, operand ? build(operand, slot!, entry) : entry);
                return;
            }
            if (ts.isConditionalExpression(node)) {
                const condition = value(node.condition);
                const yes = build(node.whenTrue, output, next), no = build(node.whenFalse, output, next);
                const branch = put({ kind: "branch", id: reserve(), source: condition, mode: "truthy", yes, no });
                jump(anchor, build(node.condition, condition, branch)); return;
            }
            if (ts.isBinaryExpression(node)) {
                const operator = node.operatorToken.kind;
                if (operator === ts.SyntaxKind.CommaToken) {
                    const ignored = value(node.left);
                    jump(anchor, build(node.left, ignored, build(node.right, output, next))); return;
                }
                if (operator === ts.SyntaxKind.AmpersandAmpersandToken || operator === ts.SyntaxKind.BarBarToken ||
                    operator === ts.SyntaxKind.QuestionQuestionToken) {
                    const left = value(node.left), selected = copy(left, output, next), right = build(node.right, output, next);
                    const nullish = operator === ts.SyntaxKind.QuestionQuestionToken;
                    const yes = operator === ts.SyntaxKind.BarBarToken ? selected : right;
                    const no = operator === ts.SyntaxKind.BarBarToken ? right : selected;
                    const branch = put({ kind: "branch", id: reserve(), source: left, mode: nullish ? "nullish" : "truthy", yes, no });
                    jump(anchor, build(node.left, left, branch)); return;
                }
                if (operator === ts.SyntaxKind.EqualsToken) {
                    const target = transparent(node.left);
                    if (ts.isArrayLiteralExpression(target) || ts.isObjectLiteralExpression(target)) {
                        const assignmentTargets = new Map<ts.Identifier, ts.Expression>();
                        const binding = normalizeAssignmentTarget(target, assignmentTargets);
                        if (!binding) { reject(node.left); return; }
                        const right = value(node.right);
                        const bind = put({
                            kind: "binding", id: reserve(), node, binding, assignmentTargets,
                            source: right, output, next,
                        });
                        jump(anchor, build(node.right, right, bind)); return;
                    }
                    jump(anchor, buildReference(node.left, reference => {
                        const right = value(node.right);
                        const store = operation({ kind: "set", reference, source: right }, output, next);
                        return build(node.right, right, store);
                    })); return;
                }
                if (operator >= ts.SyntaxKind.FirstAssignment && operator <= ts.SyntaxKind.LastAssignment) {
                    jump(anchor, buildReference(node.left, reference => {
                        const old = value(node.left), right = value(node.right), combined = value(node);
                        const store = operation({ kind: "set", reference, source: combined }, output, next);
                        let rightEntry: number;
                        if (operator === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
                            operator === ts.SyntaxKind.BarBarEqualsToken || operator === ts.SyntaxKind.QuestionQuestionEqualsToken) {
                            const selected = copy(old, output, next);
                            const assigned = build(node.right, combined, store);
                            const yes = operator === ts.SyntaxKind.BarBarEqualsToken ? selected : assigned;
                            const no = operator === ts.SyntaxKind.BarBarEqualsToken ? assigned : selected;
                            rightEntry = put({ kind: "branch", id: reserve(), source: old,
                                mode: operator === ts.SyntaxKind.QuestionQuestionEqualsToken ? "nullish" : "truthy", yes, no });
                        } else {
                            const combine = operation({ kind: "compound", operator, left: old, right }, combined, store);
                            rightEntry = build(node.right, right, combine);
                        }
                        return operation({ kind: "get", reference }, old, rightEntry);
                    })); return;
                }
            }
            if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node)) { jump(anchor, buildCall(node, output, next, optionalExit)); return; }
            if (ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node)) { jump(anchor, buildLiteral(node, output, next)); return; }
            if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
                jump(anchor, buildReference(node, reference => operation({ kind: "get", reference }, output, next), optionalExit)); return;
            }
            if (ts.isDeleteExpression(node)) {
                const skipped = operation({ kind: "evaluate", expression: ts.factory.createTrue(), inputs: [] }, output, next);
                jump(anchor, buildReference(node.expression, reference => operation({ kind: "delete", reference }, output, next), skipped)); return;
            }
            if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) ||
                ts.isPostfixUnaryExpression(node)) {
                jump(anchor, buildReference(node.operand, reference => operation({ kind: "update", reference,
                    increment: node.operator === ts.SyntaxKind.PlusPlusToken, prefix: ts.isPrefixUnaryExpression(node) }, output, next))); return;
            }
            if (ts.isTemplateExpression(node)) {
                let entry = next;
                for (let index = node.templateSpans.length - 1; index >= 0; --index) {
                    const span = node.templateSpans[index]!, source = value(span.expression);
                    const append = put({ kind: "template-append", id: reserve(), target: output,
                        source, tail: span.literal.text, next: entry });
                    entry = build(span.expression, source, append);
                }
                jump(anchor, operation({ kind: "evaluate", expression: ts.factory.createStringLiteral(node.head.text), inputs: [] }, output, entry));
                return;
            }
            const children: ts.Expression[] = [];
            if (ts.isBinaryExpression(node)) children.push(node.left, node.right);
            else if (ts.isPrefixUnaryExpression(node)) children.push(node.operand);
            else if (ts.isVoidExpression(node)) children.push(node.expression);
            else if (ts.isTypeOfExpression(node)) {
                // An unresolvable binding has special typeof semantics.
                if (!ts.isIdentifier(transparent(node.expression))) children.push(node.expression);
            }
            else if (ts.isIdentifier(node) || ts.isLiteralExpression(node) || ts.isFunctionExpression(node) ||
                ts.isArrowFunction(node) || ts.isClassExpression(node) || node.kind === ts.SyntaxKind.ThisKeyword ||
                node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword ||
                node.kind === ts.SyntaxKind.NullKeyword || ts.isMetaProperty(node)) {
                // Ordinary leaf/definition evaluation runs in its existing
                // lexical environment. Nested bodies are separate graphs.
            } else { reject(node); return; }
            const inputs = children.map(expression => ({ expression, slot: value(expression) }));
            const evaluate = operation({ kind: "evaluate", expression: node, inputs }, output, next);
            jump(anchor, buildOrdered(inputs, evaluate));
        });
        return anchor;
    };

    // Mark maximal synchronous subtrees once. Their ordinary evaluator already
    // owns native call adapters and synchronous internal evaluation order.
    const suspending = new Map<ts.Node, boolean>();
    const sourceWorklist: { node: ts.Node; expanded: boolean }[] = [{ node: expression, expanded: false }];
    while (sourceWorklist.length) {
        const item = sourceWorklist.pop()!, node = item.node;
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) { suspending.set(node, false); continue; }
        if (!item.expanded) {
            sourceWorklist.push({ node, expanded: true });
            ts.forEachChild(node, child => { sourceWorklist.push({ node: child, expanded: false }); });
        } else {
            let found = ts.isAwaitExpression(node) || ts.isYieldExpression(node);
            ts.forEachChild(node, child => { found ||= suspending.get(child) ?? false; });
            suspending.set(node, found);
        }
    }
    const entry = build(expression, result, complete);
    while (worklist.length > 0 && !failure) worklist.pop()!();
    if (failure) return { kind: "unsupported", failure };
    // Scheduling anchors are compile-time forwarding edges. Resolve and
    // compress them with one iterative graph walk before publishing the graph.
    const resolved = new Map<number, number>();
    const resolve = (id: number): number => {
        const path: number[] = [];
        let current = id;
        while (!resolved.has(current) && states[current]!.kind === "jump") {
            path.push(current);
            current = (states[current] as Extract<ResumableExpressionState, { kind: "jump" }>).next;
        }
        const target = resolved.get(current) ?? current;
        for (const anchor of path) resolved.set(anchor, target);
        return target;
    };
    const retained = (states as ResumableExpressionState[]).filter(state => state.kind !== "jump");
    const ids = new Map(retained.map((state, id) => [state.id, id]));
    const target = (id: number): number => ids.get(resolve(id))!;
    const compact = retained.map((state, id): ResumableExpressionState => {
        if (state.kind === "complete") return { ...state, id };
        if (state.kind === "branch") return { ...state, id, yes: target(state.yes), no: target(state.no) };
        return { ...state, id, next: target(state.next) };
    });
    return { kind: "graph", graph: { entry: target(entry), states: compact, values, result } };
}
