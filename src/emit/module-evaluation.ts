import ts from "typescript";
import { classDefinitionEvaluationExpressions } from "./class-definition";

/** Source children executed while evaluating a definition, excluding retained bodies. */
export function definitionEvaluationChildren(node: ts.Node): readonly ts.Node[] {
    if (ts.isClassLike(node)) return classDefinitionEvaluationExpressions(node);
    if (ts.isFunctionLike(node))
        return node.name && ts.isComputedPropertyName(node.name) ? [node.name.expression] : [];
    const children: ts.Node[] = [];
    ts.forEachChild(node, child => { children.push(child); });
    return children;
}

/** HasTLA is a property of definition-time evaluation, not nested bodies. */
export function moduleHasTopLevelAwait(source: ts.SourceFile): boolean {
    const pending: ts.Node[] = [source];
    while (pending.length) {
        const node = pending.pop()!;
        if (ts.isAwaitExpression(node) || ts.isForOfStatement(node) && !!node.awaitModifier ||
            ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing)
            return true;
        for (const child of definitionEvaluationChildren(node)) pending.push(child);
    }
    return false;
}
