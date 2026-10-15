import ts from "typescript";

export interface EmitterMethodGraph {
    readonly methods: ReadonlyMap<string, ts.MethodDeclaration>;
    readonly roots: ReadonlySet<string>;
    readonly edges: ReadonlyMap<string, ReadonlySet<string>>;
    readonly reachable: ReadonlySet<string>;
}

/** Retained method references, including callbacks, share one declaration graph. */
export function emitterMethodGraph(program: ts.Program, emitter: ts.ClassDeclaration): EmitterMethodGraph {
    const checker = program.getTypeChecker();
    const methods = new Map<string, ts.MethodDeclaration>();
    const declarations = new Map<ts.Declaration, string>();
    const edges = new Map<string, Set<string>>();
    const roots = new Set<string>();
    for (const member of emitter.members) {
        if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) continue;
        const name = member.name.text;
        methods.set(name, member);
        declarations.set(member, name);
        edges.set(name, new Set());
    }
    if (!methods.has("run")) throw new Error("unknown emitter reachability root: run");
    roots.add("run");

    // Instantiated property symbols need not equal the declaration's Symbol.
    // The retained declaration is the identity shared by every reference.
    const referencedMethod = (node: ts.Node): string | undefined => {
        const symbol = checker.getSymbolAtLocation(node);
        for (const declaration of symbol?.declarations ?? []) {
            const name = declarations.get(declaration);
            if (name) return name;
        }
        return undefined;
    };
    for (const source of program.getSourceFiles()) {
        if (source.isDeclarationFile) continue;
        const pending: {node: ts.Node; owner?: string}[] = [{node: source}];
        while (pending.length) {
            const frame = pending.pop()!;
            const node = frame.node;
            const owner = declarations.get(node as ts.Declaration) ?? frame.owner;
            if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
                const definition = ts.isMethodDeclaration(node.parent) && node.parent.name === node;
                if (!definition) {
                    const name = referencedMethod(node);
                    if (name) {
                        if (owner) edges.get(owner)!.add(name);
                        else roots.add(name);
                    }
                }
            }
            if (ts.isElementAccessExpression(node) && !ts.isStringLiteralLike(node.argumentExpression)) {
                const receiver = checker.getTypeAtLocation(node.expression);
                const maySelectMethod = receiver.getProperties().some(symbol =>
                    (symbol.declarations ?? []).some(declaration => declarations.has(declaration)));
                if (maySelectMethod && !referencedMethod(node))
                    throw new Error("unresolved emitter method reference");
            }
            ts.forEachChild(node, child => {pending.push({node: child, owner});});
        }
    }
    const reachable = new Set<string>();
    const pending = [...roots];
    while (pending.length) {
        const name = pending.pop()!;
        if (reachable.has(name)) continue;
        reachable.add(name);
        for (const next of edges.get(name) ?? []) pending.push(next);
    }
    return {methods, roots, edges, reachable};
}
