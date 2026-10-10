import ts from "typescript";

function unwrapExpression(expression:ts.Expression):ts.Expression{
    while(ts.isParenthesizedExpression(expression)||ts.isAsExpression(expression)||
        ts.isTypeAssertionExpression(expression)||ts.isNonNullExpression(expression)||ts.isSatisfiesExpression(expression))
        expression=expression.expression;
    return expression;
}

/** Project assignment syntax onto the same BindingName tree used by all
 * initialization consumers. Property References remain attached to their
 * leaf identities; there is no pattern width/depth admission or second tree
 * lowering algorithm. Original expression nodes retain checker identity. */
export function normalizeAssignmentTarget(
    expression: ts.Expression,
    assignmentTargets: Map<ts.Identifier, ts.Expression>,
): ts.BindingName | null {
    const targetExpression = unwrapExpression(expression);
    if (ts.isIdentifier(targetExpression)) return targetExpression;
    if (ts.isPropertyAccessExpression(targetExpression) || ts.isElementAccessExpression(targetExpression)) {
        const placeholder = ts.factory.createIdentifier(
            `__tsc_assignment_target_${assignmentTargets.size}`,
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
                const name = normalizeAssignmentTarget(element.expression, assignmentTargets);
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
            const name = normalizeAssignmentTarget(
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
                const name = normalizeAssignmentTarget(property.expression, assignmentTargets);
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
            const name = normalizeAssignmentTarget(
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
}
