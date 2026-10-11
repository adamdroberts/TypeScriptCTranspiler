import ts from "typescript";

/** A var initializer uses assignment References, while lexical declarations
 * initialize cells. Project its BindingName grammar onto the existing
 * assignment tree; the shared expression graph owns all actual lowering. */
export function assignmentTargetFromBinding(binding: ts.BindingName): ts.Expression {
    const targets = new Map<ts.BindingName, ts.Expression>();
    const worklist: {node:ts.BindingName;complete:boolean}[]=[{node:binding,complete:false}];
    while(worklist.length){
        const {node,complete}=worklist.pop()!;
        if(ts.isIdentifier(node)){targets.set(node,node);continue;}
        if(!complete){
            worklist.push({node,complete:true});
            for(const element of node.elements)if(ts.isBindingElement(element))worklist.push({node:element.name,complete:false});
            continue;
        }
        const value=(element:ts.BindingElement)=>element.initializer
            ? ts.factory.createBinaryExpression(targets.get(element.name)!,ts.SyntaxKind.EqualsToken,element.initializer)
            : targets.get(element.name)!;
        const target=ts.isArrayBindingPattern(node)
            ? ts.factory.createArrayLiteralExpression(node.elements.map(element=>ts.isOmittedExpression(element)?element:
                element.dotDotDotToken?ts.factory.createSpreadElement(value(element)):value(element)))
            : ts.factory.createObjectLiteralExpression(node.elements.map(element=>element.dotDotDotToken
                ? ts.factory.createSpreadAssignment(value(element))
                : ts.factory.createPropertyAssignment(element.propertyName??element.name as ts.Identifier,value(element))));
        ts.setTextRange(target,node);Object.assign(target,{parent:node.parent});targets.set(node,target);
    }
    return targets.get(binding)!;
}

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
