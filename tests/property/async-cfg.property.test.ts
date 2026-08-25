import { expect, test } from "bun:test";
import ts from "typescript";
import {
    planAsyncControlFlowGraph,
    type AsyncControlFlowGraph,
    type AsyncControlFlowState,
} from "../../src/emit/async-cfg";

interface SourceFactory {
    readonly nextName: (prefix: string) => string;
    readonly nextInt: (exclusiveMaximum: number) => number;
}

interface ParsedSubject {
    readonly body: ts.Block;
    readonly sourceFile: ts.SourceFile;
}

const plannerOptions = {
    isStableSynchronousTail: (node: ts.Expression): boolean =>
        ts.isIdentifier(node) || ts.isPropertyAccessExpression(node),
    isStableBeforeSuspension: (node: ts.Expression): boolean => ts.isIdentifier(node),
    isSupportedNestedFunction: (): boolean => false,
};

function sourceFactory(seed: number): SourceFactory {
    let state = seed >>> 0;
    let name = 0;
    return {
        nextName: (prefix) => `${prefix}_${name++}`,
        nextInt: (exclusiveMaximum) => {
            // A deterministic sampler keeps failures reproducible. The recursion
            // budget below bounds test resources; it is not a language limit.
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state % exclusiveMaximum;
        },
    };
}

function leaf(factory: SourceFactory): string {
    const binding = factory.nextName("binding");
    const value = factory.nextInt(97);
    switch (factory.nextInt(5)) {
        case 0:
            return `value += await settled(${value});`;
        case 1:
            return `value += (await settled(${value})) + (await settled(${value + 1}));`;
        case 2:
            return `value = await settled(flag) ? await settled(${value}) : await settled(${value + 1});`;
        case 3:
            return `value = (await settled(null)) ?? (await settled(${value}));`;
        default:
            return `const { item: [${binding} = await settled(${value})] } = { item: [] }; value += ${binding};`;
    }
}

function statementTree(factory: SourceFactory, budget: number): string {
    if (budget === 0) return leaf(factory);
    switch (factory.nextInt(6)) {
        case 0:
            return `${statementTree(factory, budget - 1)}\n${statementTree(factory, budget - 1)}`;
        case 1:
            return `if (await settled(flag)) { ${statementTree(factory, budget - 1)} } ` +
                `else { ${statementTree(factory, budget - 1)} }`;
        case 2: {
            const index = factory.nextName("index");
            return `for (let ${index} = 0; await settled(${index} < 1); ` +
                `${index} = await settled(${index} + 1)) { ${statementTree(factory, budget - 1)} }`;
        }
        case 3:
            return `switch (await settled(value & 1)) { ` +
                `case 0: { ${statementTree(factory, budget - 1)} break; } ` +
                `default: { ${statementTree(factory, budget - 1)} } }`;
        case 4: {
            const error = factory.nextName("error");
            return `try { ${statementTree(factory, budget - 1)} } ` +
                `catch (${error}) { value += await settled(${error} ? 1 : 0); } ` +
                `finally { value += await settled(1); }`;
        }
        default: {
            const label = factory.nextName("loop");
            return `${label}: while (await settled(flag)) { ` +
                `${statementTree(factory, budget - 1)} break ${label}; }`;
        }
    }
}

function parseSubject(statements: string): ParsedSubject {
    const sourceFile = ts.createSourceFile(
        "async-cfg-property.ts",
        `
            declare function settled<T>(value: T): Promise<T>;
            async function subject(flag: boolean): Promise<number> {
                let value = 0;
                ${statements}
                return await settled(value);
            }
        `,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TS,
    );
    const parseDiagnostics = (sourceFile as ts.SourceFile & {
        readonly parseDiagnostics?: readonly ts.Diagnostic[];
    }).parseDiagnostics ?? [];
    expect(parseDiagnostics).toEqual([]);
    const subject = sourceFile.statements.find((statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === "subject");
    if (!subject?.body) throw new Error("generated property source has no subject body");
    return { body: subject.body, sourceFile };
}

function controlFlowTargets(value: unknown, targets: Set<number>, seen = new Set<object>()): void {
    if (value === null || typeof value !== "object") return;
    const object = value as { readonly kind?: unknown; readonly id?: unknown };
    if (object.kind === "state") {
        if (!Number.isInteger(object.id)) throw new Error("CFG contains a malformed state target");
        targets.add(object.id as number);
        return;
    }
    // TypeScript nodes may contain parent links. They cannot contain CFG edges.
    if (typeof object.kind === "number" || seen.has(object)) return;
    seen.add(object);
    if (Array.isArray(object)) {
        for (const item of object) controlFlowTargets(item, targets, seen);
        return;
    }
    if (object instanceof Map || object instanceof Set) {
        for (const item of object.values()) controlFlowTargets(item, targets, seen);
        return;
    }
    for (const item of Object.values(object)) controlFlowTargets(item, targets, seen);
}

function stateTargets(state: AsyncControlFlowState): Set<number> {
    const targets = new Set<number>();
    controlFlowTargets(state, targets);
    return targets;
}

function sourceAwaits(body: ts.Block): ts.AwaitExpression[] {
    const awaits: ts.AwaitExpression[] = [];
    const visit = (node: ts.Node): void => {
        if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
        if (ts.isAwaitExpression(node)) awaits.push(node);
        ts.forEachChild(node, visit);
    };
    visit(body);
    return awaits;
}

function suspensionOwner(state: AsyncControlFlowState): ts.AwaitExpression | null {
    switch (state.kind) {
        case "await-condition":
        case "await-logical-condition":
        case "await-next":
        case "expression-await":
            return state.awaitExpr;
        case "await-completion":
        case "return-route":
            return state.completion.awaitExpr;
        default:
            return null;
    }
}

function assertClosedCanonicalGraph(graph: AsyncControlFlowGraph, body: ts.Block): void {
    const states = new Map<number, AsyncControlFlowState>();
    for (const state of graph.states) {
        expect(states.has(state.id)).toBeFalse();
        states.set(state.id, state);
    }
    expect(states.has(graph.entry.id)).toBeTrue();

    const allTargets = new Set<number>([graph.entry.id]);
    for (const state of graph.states) {
        for (const target of stateTargets(state)) allTargets.add(target);
    }
    for (const target of allTargets) expect(states.has(target)).toBeTrue();

    const reachable = new Set<number>();
    const worklist = [graph.entry.id];
    while (worklist.length > 0) {
        const id = worklist.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const target of stateTargets(states.get(id)!)) worklist.push(target);
    }
    expect([...reachable].sort((left, right) => left - right)).toEqual(
        [...states.keys()].sort((left, right) => left - right),
    );

    const owners = new Map<ts.AwaitExpression, number>();
    for (const state of graph.states) {
        const awaitExpression = suspensionOwner(state);
        if (awaitExpression) owners.set(awaitExpression, (owners.get(awaitExpression) ?? 0) + 1);
    }
    for (const awaitExpression of sourceAwaits(body)) {
        expect(owners.get(awaitExpression)).toBe(1);
    }
    expect(graph.awaitCount).toBe(owners.size);
}

test("recursive async syntax lowers to one closed canonical state graph", () => {
    // Seeds select grammar paths, while the assertion is invariant over the
    // recursively composed syntax tree rather than any fixture-family count.
    for (const seed of [0x1a2b3c4d, 0x5e6f7788, 0x91a2b3c4, 0xd5e6f708]) {
        const factory = sourceFactory(seed);
        const statements = statementTree(factory, 4);
        const { body } = parseSubject(statements);
        const graph = planAsyncControlFlowGraph(body, plannerOptions);
        if (!graph) throw new Error(`generated supported syntax failed to plan (seed ${seed}):\n${statements}`);
        assertClosedCanonicalGraph(graph, body);
    }
});

test("unsupported suspension trees fail closed", () => {
    const { body } = parseSubject(`
        await settled(1);
        class UnsupportedNestedClass {}
        value += new UnsupportedNestedClass() instanceof UnsupportedNestedClass ? 1 : 0;
    `);
    expect(planAsyncControlFlowGraph(body, plannerOptions)).toBeNull();
});
