import { expect, test } from "bun:test";
import ts from "typescript";
import { planResumableExpression, type ResumableExpressionGraph, type ResumableReference } from "../../src/emit/resumable-expression";

function parse(source: string): ts.Expression {
    const file = ts.createSourceFile("resumable-expression.js", `function* subject() { return (${source}); }`, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    const fn = file.statements[0] as ts.FunctionDeclaration;
    return (fn.body!.statements[0] as ts.ReturnStatement).expression!;
}

function graph(source: string): ResumableExpressionGraph {
    const result = planResumableExpression(parse(source));
    if (result.kind !== "graph") throw new Error(result.failure.message + ": " + result.failure.node.getText());
    return result.graph;
}

const templateObjects = new WeakMap<ts.TemplateLiteral, TemplateStringsArray>();
function engineTemplateObject(template: ts.TemplateLiteral): TemplateStringsArray {
    let result = templateObjects.get(template);
    if (!result) {
        let text = template.getText();
        if (ts.isTemplateExpression(template)) {
            const start = template.getStart();
            for (const span of [...template.templateSpans].reverse()) {
                text = text.slice(0, span.expression.getStart() - start) + "0" + text.slice(span.expression.end - start);
            }
        }
        result = new Function("capture", `return capture${text};`)((strings: TemplateStringsArray) => strings);
        templateObjects.set(template, result!);
    }
    return result!;
}

/** An independent executor delegates primitive operations to JavaScript,
 * while the graph alone decides effect order, saved references and branches.
 * The comparison engine executes the original source as a real generator. */
function* execute(plan: ResumableExpressionGraph, environment: Record<string, any>): Generator<any, any, any> {
    const values: any[] = [], states = new Map(plan.states.map(state => [state.id, state]));
    const key = (value: any): PropertyKey => Reflect.ownKeys({ [value]: 0 })[0]!;
    const propertyKey = (reference: Extract<ResumableReference, { kind: "property" }>): PropertyKey => {
        // The pinned edition's GetValue/PutValue first performs ToObject,
        // then stores ToPropertyKey's result back in [[ReferencedName]].
        if (values[reference.base] == null) throw new TypeError("nullish reference");
        return values[reference.key] = key(values[reference.key]);
    };
    const get = (reference: ResumableReference): any => reference.kind === "binding"
        ? environment[reference.identifier.text] : Reflect.get(values[reference.base], propertyKey(reference),
            reference.receiver === undefined ? values[reference.base] : values[reference.receiver]);
    const set = (reference: ResumableReference, value: any): void => {
        if (reference.kind === "binding") environment[reference.identifier.text] = value;
        else Reflect.set(values[reference.base], propertyKey(reference), value,
            reference.receiver === undefined ? values[reference.base] : values[reference.receiver]);
    };
    let pc = plan.entry;
    for (;;) {
        const state = states.get(pc);
        if (!state) throw new Error("missing operation state");
        if (state.kind === "complete") return values[state.value];
        if (state.kind === "jump") { pc = state.next; continue; }
        if (state.kind === "branch") {
            const selected = state.mode === "nullish" ? values[state.source] == null : !!values[state.source];
            pc = selected ? state.yes : state.no; continue;
        }
        if (state.kind === "suspend") {
            const value = state.source === null ? undefined : values[state.source];
            if (state.suspension === "delegate") values[state.output] = yield* value;
            else values[state.output] = yield value;
        } else if (state.kind === "value") {
            const op = state.operation;
            let result: any;
            if (op.kind === "copy") result = values[op.source];
            else if (op.kind === "undefined") result = undefined;
            else if (op.kind === "template-object") result = engineTemplateObject(op.template);
            else if (op.kind === "property-key") result = key(values[op.source]);
            else if (op.kind === "get") result = get(op.reference);
            else if (op.kind === "set") { result = values[op.source]; set(op.reference, result); }
            else if (op.kind === "delete") {
                if (op.reference.kind !== "property") throw new Error("binding delete requires an environment operation");
                result = Reflect.deleteProperty(values[op.reference.base], values[op.reference.key]);
            } else if (op.kind === "update") {
                let numeric = get(op.reference); const old = numeric++;
                if (!op.increment) numeric = typeof old === "bigint" ? old - 1n : old - 1;
                set(op.reference, numeric); result = op.prefix ? numeric : old;
            } else if (op.kind === "compound") {
                const spelling = ts.tokenToString(op.operator)!;
                result = new Function("left", "right", `return left ${spelling.slice(0, -1)} right;`)(values[op.left], values[op.right]);
            } else if (op.kind === "arguments" || op.kind === "array") result = [];
            else if (op.kind === "object") result = {};
            else if (op.kind === "super-constructor") result = Object.getPrototypeOf(environment.constructor);
            else if (op.kind === "super-this") result = environment.thisValue;
            else if (op.kind === "super-base") result = Object.getPrototypeOf(environment.homeObject);
            else if (op.kind === "call") result = op.construct
                ? Reflect.construct(values[op.callee], values[op.arguments])
                : Reflect.apply(values[op.callee], op.receiver === null ? undefined : values[op.receiver], values[op.arguments]);
            else {
                const substitutions = new Map(op.inputs.map(input => [input.expression, ts.factory.createIdentifier(`slot_${input.slot}`)]));
                const transformed = ts.transform(op.expression, [context => root => {
                    const visit: ts.Visitor = node => substitutions.get(node as ts.Expression) ?? ts.visitEachChild(node, visit, context);
                    return ts.visitNode(root, visit) as ts.Expression;
                }]);
                try {
                    const text = ts.createPrinter().printNode(ts.EmitHint.Expression, transformed.transformed[0]!, op.expression.getSourceFile() ?? ts.createSourceFile("synthetic.js", "", ts.ScriptTarget.ESNext));
                    const scope = Object.assign(Object.create(environment), Object.fromEntries(op.inputs.map(input => [`slot_${input.slot}`, values[input.slot]])));
                    result = new Function("scope", `with (scope) { return (${text}); }`)(scope);
                } finally { transformed.dispose(); }
            }
            values[state.output] = result;
        } else if (state.kind === "append") {
            const target = values[state.target];
            if (state.source === null) target.length++;
            else if (state.spread) {
                for (const item of values[state.source]) Object.defineProperty(target, target.length, { value: item, writable: true, enumerable: true, configurable: true });
            } else Object.defineProperty(target, target.length, { value: values[state.source], writable: true, enumerable: true, configurable: true });
        } else if (state.kind === "define") Object.defineProperty(values[state.target], values[state.key], { value: values[state.source], writable: true, enumerable: true, configurable: true });
        else if (state.kind === "define-member") {
            const member = state.member, name = ts.factory.createIdentifier("member");
            const renamed = ts.isMethodDeclaration(member) ? ts.factory.updateMethodDeclaration(member, member.modifiers,
                member.asteriskToken, name, member.questionToken, member.typeParameters, member.parameters, member.type, member.body)
                : ts.isGetAccessorDeclaration(member) ? ts.factory.updateGetAccessorDeclaration(member, member.modifiers,
                    name, member.parameters, member.type, member.body)
                    : ts.factory.updateSetAccessorDeclaration(member, member.modifiers, name, member.parameters, member.body);
            const literal = ts.factory.createObjectLiteralExpression([renamed]);
            const text = ts.createPrinter().printNode(ts.EmitHint.Expression, literal, member.getSourceFile());
            const owner = new Function("scope", `with (scope) { return (${text}); }`)(environment);
            const descriptor = Object.getOwnPropertyDescriptor(owner, "member")!;
            Object.defineProperty(values[state.target], values[state.key], descriptor);
        } else if (state.kind === "spread-object") {
            const source = values[state.source];
            if (source != null) for (const property of Reflect.ownKeys(Object(source))) {
                if (Object.getOwnPropertyDescriptor(source, property)?.enumerable)
                    Object.defineProperty(values[state.target], property, { value: source[property], writable: true, enumerable: true, configurable: true });
            }
        } else if (state.kind === "prototype") {
            const source = values[state.source];
            if (source === null || typeof source === "object" || typeof source === "function") Object.setPrototypeOf(values[state.target], source);
        } else if (state.kind === "binding") {
            throw new Error("binding operations require the canonical CFG projection");
        } else values[state.target] += `${values[state.source]}` + state.tail;
        pc = state.next;
    }
}

function environment(): Record<string, any> {
    const events: string[] = [], receiver: any = { value: 3, tag: 17 };
    Object.defineProperty(receiver, "method", { configurable: true, get() {
        events.push("get-method"); return function(this: any, ...values: any[]) { events.push("call:" + this.tag); return values.reduce((sum, value) => sum + value, 0); };
    } });
    Object.defineProperty(receiver, "templateTag", { get() {
        events.push("get-tag");
        return function(this: any, strings: TemplateStringsArray, ...values: any[]) {
            events.push("tag:" + this.tag + ":" + Object.isFrozen(strings) + ":" + Object.isFrozen(strings.raw));
            return [strings.join("|"), strings.raw.join("|"), ...values];
        };
    } });
    const propertyKey = { [Symbol.toPrimitive]() { events.push("key-conversion"); return "value"; } };
    const iterable = { *[Symbol.iterator]() { events.push("iterate-start"); yield 2; events.push("iterate-next"); yield 4; } };
    class Box { value: number; constructor(value: number) { events.push("construct"); this.value = value; } }
    return { events, receiver, propertyKey, iterable, Box, absent: null, local: 3,
        mark(value: any) { events.push("mark:" + String(value)); return value; },
        conversion: { toString() { events.push("string-conversion"); return "converted"; } } };
}

function observe(iterator: Generator<any, any, any>, env: Record<string, any>): unknown {
    const steps: any[] = []; let result = iterator.next(); let resume = 11;
    while (!result.done) { steps.push(result.value); result = iterator.next(resume++); }
    return { steps, result: result.value, events: env.events, local: env.local, value: env.receiver.value };
}

test("resumable operation graphs preserve references, lookup, branch and literal effect order", () => {
    const sources = [
        "receiver.method(mark(1), (yield mark(2)), ...iterable, mark(3))",
        "receiver[propertyKey] += (yield mark(4))",
        "receiver[(yield mark(5))] = mark(6)",
        "(yield 0) ? receiver.method(yield 1) : mark(9)",
        "absent?.method(mark(yield 1)).value", "(absent?.method)?.(mark(yield 1))",
        "receiver.method?.(yield 7)", "delete absent?.[mark(yield 1)]",
        "(yield null) ?? (local += mark(8))", "local ||= (yield mark(9))",
        "[mark(1), ...(yield iterable), , mark(2)]",
        "({ [propertyKey]: yield 3, ...{ value: mark(4) }, [yield 5]: mark(6) })",
        "`prefix:${conversion}:${yield 2}:${mark(3)}`",
        "new Box(yield mark(2)).value", "receiver[(yield 'value')]++",
        "receiver.templateTag`head\\n${mark(1)}middle${yield mark(2)}tail`",
        "receiver[mark('templateTag')]`invalid\\u{110000}${yield mark(3)}tail`",
    ];
    for (const source of sources) {
        const nativeEnv = environment(), modelEnv = environment();
        const native = new Function("environment", `with (environment) { return (function* () { return (${source}); })(); }`)(nativeEnv);
        // Spread input is itself supplied as the resume value for this one
        // partition rather than accidentally replacing it with a Number.
        const run = source.includes("yield iterable") ? (iterator: Generator<any, any, any>, env: Record<string, any>) => {
            const first = iterator.next(), last = iterator.next(env.iterable);
            return { first: first.value === env.iterable, result: last.value, done: last.done, events: env.events };
        } : observe;
        expect({ source, observation: run(execute(graph(source), modelEnv), modelEnv) }).toEqual({ source, observation: run(native, nativeEnv) });
    }
});

test("one worklist retains a deep expression tree without recursive lowering", () => {
    const source = "(yield 1)" + " + 1".repeat(4096), plan = graph(source), env = environment();
    const observed = observe(execute(plan, env), env) as { result: number };
    expect(observed.result).toBe(4107);
    expect(new Set(plan.states.map(state => state.id)).size).toBe(plan.states.length);
    const ids = new Set(plan.states.map(state => state.id));
    for (const state of plan.states) {
        if (state.kind === "complete") continue;
        if (state.kind === "branch") { expect(ids.has(state.yes)).toBeTrue(); expect(ids.has(state.no)).toBeTrue(); }
        else expect(ids.has(state.next)).toBeTrue();
    }
});

test("unrepresented suspending operations fail closed with a stable diagnostic", () => {
    const result = planResumableExpression(parse('object.#method(yield 1)'));
    expect(result.kind).toBe("unsupported");
    if (result.kind !== "unsupported") throw new Error("unrepresented operation was admitted");
    expect(result.failure.message).toBe("resumable expression requires a canonical operation");
    expect(ts.isPropertyAccessExpression(result.failure.node)).toBeTrue();
});


test("super References retain the actual receiver, captured base and normalized name", () => {
    const effects: string[] = [], receiver = {}, base = {first: 2, second: 30}, homeObject = Object.create(base);
    let conversions = 0;
    const key = {[Symbol.toPrimitive]() { effects.push("key"); return conversions++ === 0 ? "first" : "second"; }};
    const env = {thisValue: receiver, homeObject, key, right: 3, effects};
    const result = execute(graph("super[key] += yield right"), env);
    expect(result.next().value).toBe(3);
    Object.setPrototypeOf(homeObject, {first: 99});
    expect(result.next(4)).toEqual({value: 6, done: true});
    expect(receiver).toEqual({first: 6});
    expect(base).toEqual({first: 2, second: 30});
    expect(effects).toEqual(["key"]);
});


test("a parenthesized optional callee evaluates suspended arguments before failing", () => {
    const invocation = execute(graph("(absent?.method)(yield 1)"), {absent: null});
    expect(invocation.next()).toEqual({value: 1, done: false});
    expect(() => invocation.next(2)).toThrow(TypeError);
    expect(execute(graph("absent?.method(yield 1)"), {absent: null}).next()).toEqual({value: undefined, done: true});
});
