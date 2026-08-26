import ts from "typescript";

export interface ControlStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

interface ControlContext {
    readonly allowReturn: boolean;
    readonly breakableDepth: number;
    readonly iterationDepth: number;
    readonly labels: ReadonlyMap<string, boolean>;
}

/** Contextual control-flow early errors over one explicit source-tree
 * worklist. Function bodies begin independent control/label environments;
 * arbitrary branch, label, and statement depth does not change the lowering. */
export function earlyControlFlowStaticSemanticsFailure(
    sourceFile: ts.SourceFile,
): ControlStaticSemanticsFailure | null {
    const labelsIteration = (statement: ts.Statement): boolean => {
        let target = statement;
        while (ts.isLabeledStatement(target)) target = target.statement;
        return ts.isForStatement(target) ||
            ts.isForInStatement(target) ||
            ts.isForOfStatement(target) ||
            ts.isWhileStatement(target) ||
            ts.isDoStatement(target);
    };
    const simpleAssignmentTarget = (expression: ts.Expression): boolean => {
        while (
            ts.isParenthesizedExpression(expression) ||
            ts.isAsExpression(expression) ||
            ts.isTypeAssertionExpression(expression) ||
            ts.isSatisfiesExpression(expression)
        ) {
            expression = expression.expression;
        }
        return ts.isIdentifier(expression) ||
            ts.isPropertyAccessExpression(expression) ||
            ts.isElementAccessExpression(expression);
    };
    const rootContext: ControlContext = {
        allowReturn: false,
        breakableDepth: 0,
        iterationDepth: 0,
        labels: new Map(),
    };
    const worklist: Array<{ readonly node: ts.Node; readonly context: ControlContext }> = [
        { node: sourceFile, context: rootContext },
    ];
    while (worklist.length > 0) {
        const { node, context } = worklist.pop()!;
        if (ts.isFunctionLike(node)) {
            const body = (node as ts.SignatureDeclaration & { body?: ts.ConciseBody }).body;
            if (body) {
                worklist.push({
                    node: body,
                    context: {
                        allowReturn: true,
                        breakableDepth: 0,
                        iterationDepth: 0,
                        labels: new Map(),
                    },
                });
            }
            continue;
        }
        if (ts.isReturnStatement(node) && !context.allowReturn) {
            return { node, message: "return statement is not contained in a function body" };
        }
        if (ts.isBreakStatement(node)) {
            if (!node.label && context.breakableDepth === 0) {
                return {
                    node,
                    message: "break statement is not contained in an iteration or switch statement",
                };
            }
            if (node.label && !context.labels.has(node.label.text)) {
                return { node, message: `break target '${node.label.text}' is not an active label` };
            }
        }
        if (ts.isContinueStatement(node)) {
            if (!node.label && context.iterationDepth === 0) {
                return { node, message: "continue statement is not contained in an iteration statement" };
            }
            if (node.label && context.labels.get(node.label.text) !== true) {
                return {
                    node,
                    message: `continue target '${node.label.text}' is not an active iteration label`,
                };
            }
        }
        if (
            (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) &&
            (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
            !simpleAssignmentTarget(node.operand)
        ) {
            return { node: node.operand, message: "update expression operand is not a valid assignment target" };
        }
        if (ts.isLabeledStatement(node)) {
            if (context.labels.has(node.label.text)) {
                return { node: node.label, message: `duplicate active label '${node.label.text}'` };
            }
            const labels = new Map(context.labels);
            labels.set(node.label.text, labelsIteration(node.statement));
            worklist.push({ node: node.statement, context: { ...context, labels } });
            continue;
        }
        const iteration = ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isWhileStatement(node) ||
            ts.isDoStatement(node);
        const breakable = iteration || ts.isSwitchStatement(node);
        const childContext = iteration || breakable
            ? {
                ...context,
                breakableDepth: context.breakableDepth + (breakable ? 1 : 0),
                iterationDepth: context.iterationDepth + (iteration ? 1 : 0),
            }
            : context;
        const children: ts.Node[] = [];
        node.forEachChild((child) => { children.push(child); });
        for (let index = children.length - 1; index >= 0; index--) {
            worklist.push({ node: children[index]!, context: childContext });
        }
    }
    return null;
}

/** Stable diagnostic formatting retained for host/protocol consumers. */
export function earlyControlFlowFailure(sourceFile: ts.SourceFile): string | null {
    const failure = earlyControlFlowStaticSemanticsFailure(sourceFile);
    if (!failure) return null;
    const start = sourceFile.getLineAndCharacterOfPosition(failure.node.getStart(sourceFile));
    return `${sourceFile.fileName}:${start.line + 1}:${start.character + 1}: ${failure.message}\n`;
}
