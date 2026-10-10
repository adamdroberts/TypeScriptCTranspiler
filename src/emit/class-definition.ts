import ts from "typescript";

export type ClassDefinitionStage =
    | { readonly kind: "begin"; readonly definition: ts.ClassLikeDeclaration }
    | { readonly kind: "heritage"; readonly expression: ts.Expression }
    | { readonly kind: "element"; readonly member: ts.ClassElement; readonly key: ts.Expression | null }
    | { readonly kind: "complete"; readonly definition: ts.ClassLikeDeclaration };

/** Definition-time evaluations are separate from retained constructor,
 * method and initializer bodies. All consumers walk this ordered plan. */
export function classDefinitionPlan(definition: ts.ClassLikeDeclaration): readonly ClassDefinitionStage[] {
    const stages: ClassDefinitionStage[] = [{ kind: "begin", definition }];
    for (const clause of definition.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        for (const heritage of clause.types) stages.push({ kind: "heritage", expression: heritage.expression });
    }
    for (const member of definition.members) {
        if (ts.isConstructorDeclaration(member) || member.kind === ts.SyntaxKind.SemicolonClassElement) continue;
        stages.push({ kind: "element", member,
            key: member.name && ts.isComputedPropertyName(member.name) ? member.name.expression : null });
    }
    stages.push({ kind: "complete", definition });
    return stages;
}

export function classDefinitionEvaluationExpressions(definition: ts.ClassLikeDeclaration): readonly ts.Expression[] {
    return classDefinitionPlan(definition).flatMap(stage =>
        stage.kind === "heritage" ? [stage.expression] : stage.kind === "element" && stage.key ? [stage.key] : []);
}

export function classExpressionFromDeclaration(declaration: ts.ClassDeclaration): ts.ClassExpression {
    const expression = ts.factory.createClassExpression(declaration.modifiers, declaration.name,
        declaration.typeParameters, declaration.heritageClauses, declaration.members);
    ts.setOriginalNode(expression, declaration);
    ts.setTextRange(expression, declaration);
    Object.assign(expression, { parent: declaration.parent });
    return expression;
}

export function sourceClassDefinition(expression: ts.ClassExpression): ts.ClassLikeDeclaration {
    const original = ts.getOriginalNode(expression);
    return ts.isClassDeclaration(original) ? original : expression;
}
