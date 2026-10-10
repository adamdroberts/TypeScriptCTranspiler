import ts from "typescript";

export interface ClassPrivateName {
    readonly definition: ts.ClassLikeDeclaration;
    readonly description: string;
    readonly declarations: readonly ts.ClassElement[];
}
const collections = new WeakMap<ts.ClassLikeDeclaration, readonly ClassPrivateName[]>();

/** One ordered name collection supplies identity cells for each class evaluation. */
export function classPrivateNames(definition: ts.ClassLikeDeclaration): readonly ClassPrivateName[] {
    const cached = collections.get(definition);
    if (cached) return cached;
    const names = new Map<string, ts.ClassElement[]>();
    for (const member of definition.members) {
        if (!member.name || !ts.isPrivateIdentifier(member.name)) continue;
        const declarations = names.get(member.name.text);
        if (declarations) declarations.push(member);
        else names.set(member.name.text, [member]);
    }
    const result = [...names].map(([description, declarations]) => ({ definition, description, declarations }));
    collections.set(definition, result);
    return result;
}

/** A class heritage expression uses its outer private environment. */
export function resolveClassPrivateName(identifier: ts.PrivateIdentifier): ClassPrivateName | null {
    let child: ts.Node = identifier;
    for (let parent = child.parent; parent; child = parent, parent = parent.parent) {
        if (!ts.isClassLike(parent) || !parent.members.some(member => member === child)) continue;
        const name = classPrivateNames(parent).find(candidate => candidate.description === identifier.text);
        if (name) return name;
    }
    return null;
}

export interface PrivateStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

/** The same class name collection supplies both binding and early-error checks. */
export function earlyPrivateStaticSemanticsFailure(source: ts.SourceFile, allowExternalNames = false): PrivateStaticSemanticsFailure | null {
    const worklist: ts.Node[] = [source];
    const failure = (node: ts.Node): PrivateStaticSemanticsFailure => ({ node, message: "invalid private name declaration or reference" });
    while (worklist.length) {
        const node = worklist.pop()!;
        if (ts.isClassLike(node)) {
            for (const name of classPrivateNames(node)) {
                if (name.description === "#constructor") return failure(name.declarations[0]!);
                let getter = false, setter = false;
                let staticness: boolean | undefined;
                for (const declaration of name.declarations) {
                    const isStatic = ts.canHaveModifiers(declaration) && !!ts.getModifiers(declaration)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword);
                    if (staticness !== undefined && staticness !== isStatic) return failure(declaration);
                    staticness = isStatic;
                    if (ts.isGetAccessorDeclaration(declaration)) {
                        if (getter) return failure(declaration);
                        getter = true;
                    } else if (ts.isSetAccessorDeclaration(declaration)) {
                        if (setter) return failure(declaration);
                        setter = true;
                    } else if (name.declarations.length !== 1) return failure(declaration);
                }
            }
        }
        if (ts.isPrivateIdentifier(node)) {
            const parent = node.parent;
            const declaration = (ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent) ||
                ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent)) && parent.name === node;
            if (!declaration) {
                const property = ts.isPropertyAccessExpression(parent) && parent.name === node;
                const brand = ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.left === node;
                if ((!property && !brand) || !allowExternalNames && !resolveClassPrivateName(node)) return failure(node);
                if (property) {
                    if (parent.expression.kind === ts.SyntaxKind.SuperKeyword) return failure(node);
                    let reference: ts.Node = parent;
                    while (reference.parent && ts.isParenthesizedExpression(reference.parent)) reference = reference.parent;
                    if (reference.parent && ts.isDeleteExpression(reference.parent)) return failure(node);
                }
            }
        }
        node.forEachChild(child => { worklist.push(child); });
    }
    return null;
}

/** Visible lexical private bindings, with shadowing and heritage boundaries. */
export function classPrivateNamesInScope(node: ts.Node): readonly ClassPrivateName[] {
    const names = new Map<string, ClassPrivateName>();
    let child = node;
    for (let parent = child.parent; parent; child = parent, parent = parent.parent) {
        if (!ts.isClassLike(parent) || !parent.members.some(member => member === child)) continue;
        for (const name of classPrivateNames(parent)) if (!names.has(name.description)) names.set(name.description, name);
    }
    return [...names.values()];
}

/** Eval validates every external private reference before evaluating its body. */
export function externalPrivateNames(source: ts.SourceFile): readonly string[] {
    const names = new Set<string>(), worklist: ts.Node[] = [source];
    while (worklist.length) {
        const node = worklist.pop()!;
        if (ts.isPrivateIdentifier(node)) {
            const parent = node.parent;
            if ((ts.isPropertyAccessExpression(parent) && parent.name === node || ts.isBinaryExpression(parent) &&
                parent.operatorToken.kind === ts.SyntaxKind.InKeyword && parent.left === node) && !resolveClassPrivateName(node)) names.add(node.text);
        }
        node.forEachChild(child => { worklist.push(child); });
    }
    return [...names];
}
