import ts from "typescript";
import { bindingNameEntries } from "./module-static-semantics";

export interface ControlStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

interface ControlContext {
    readonly allowReturn: boolean;
    readonly breakableDepth: number;
    readonly iterationDepth: number;
    readonly labels: ReadonlyMap<string, boolean>;
    readonly lexicalIterationNames: ReadonlySet<string>;
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
            ts.isSatisfiesExpression(expression) || ts.isNonNullExpression(expression)
        ) {
            expression = expression.expression;
        }
        return ts.isIdentifier(expression) ||
            ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
                !(expression.flags & ts.NodeFlags.OptionalChain));
    };
    const assignmentTarget = (root: ts.Expression): boolean => {
        const targets: ts.Expression[] = [root];
        while (targets.length > 0) {
            const target = targets.pop()!;
            if (simpleAssignmentTarget(target)) continue;
            if (ts.isArrayLiteralExpression(target)) {
                for (let index = 0; index < target.elements.length; ++index) {
                    const element = target.elements[index]!;
                    if (ts.isOmittedExpression(element)) continue;
                    if (ts.isSpreadElement(element)) {
                        if (index !== target.elements.length - 1 || target.elements.hasTrailingComma) return false;
                        targets.push(element.expression);
                    } else targets.push(ts.isBinaryExpression(element) && element.operatorToken.kind === ts.SyntaxKind.EqualsToken
                        ? element.left : element);
                }
                continue;
            }
            if (ts.isObjectLiteralExpression(target)) {
                for (let index = 0; index < target.properties.length; ++index) {
                    const property = target.properties[index]!;
                    if (ts.isShorthandPropertyAssignment(property)) targets.push(property.name);
                    else if (ts.isPropertyAssignment(property)) {
                        const value = property.initializer;
                        targets.push(ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsToken ? value.left : value);
                    } else if (ts.isSpreadAssignment(property)) {
                        if (index !== target.properties.length - 1 || target.properties.hasTrailingComma || !simpleAssignmentTarget(property.expression)) return false;
                    } else return false;
                }
                continue;
            }
            return false;
        }
        return true;
    };
    const rootContext: ControlContext = {
        allowReturn: false,
        breakableDepth: 0,
        iterationDepth: 0,
        labels: new Map(),
        lexicalIterationNames: new Set(),
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
                        lexicalIterationNames: new Set(),
                    },
                });
            }
            for (const parameter of (node as ts.SignatureDeclaration).parameters)
                worklist.push({ node: parameter, context: rootContext });
            continue;
        }
        if (ts.isClassStaticBlockDeclaration(node)) {
            worklist.push({ node: node.body, context: rootContext });
            continue;
        }
        if (ts.isVariableDeclarationList(node) &&
            (node.flags & ts.NodeFlags.BlockScoped) === 0) {
            for (const declaration of node.declarations) {
                for (const entry of bindingNameEntries(declaration.name)) {
                    if (context.lexicalIterationNames.has(entry.name)) {
                        return { node: entry.node,
                            message: `lexical iteration binding '${entry.name}' conflicts with a body var declaration` };
                    }
                }
            }
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
        if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
            !(node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? assignmentTarget(node.left) : simpleAssignmentTarget(node.left))) {
            return { node: node.left, message: "assignment expression left-hand side is not a valid assignment target" };
        }
        if ((ts.isForInStatement(node) || ts.isForOfStatement(node)) && !ts.isVariableDeclarationList(node.initializer) &&
            !assignmentTarget(node.initializer)) {
            return { node: node.initializer, message: "iteration expression left-hand side is not a valid assignment target" };
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
        let lexicalIterationNames = context.lexicalIterationNames;
        if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
            const list = node.initializer && ts.isVariableDeclarationList(node.initializer)
                ? node.initializer : null;
            if (list) {
                if (ts.isForStatement(node)) {
                    for (const declaration of list.declarations) {
                        if (!declaration.initializer &&
                            (!ts.isIdentifier(declaration.name) || (list.flags & ts.NodeFlags.Const) !== 0)) {
                            return { node: declaration,
                                message: "for binding pattern or const declaration requires an initializer" };
                        }
                    }
                }
                if ((list.flags & ts.NodeFlags.BlockScoped) !== 0) {
                    const headNames = new Set<string>();
                    for (const declaration of list.declarations) {
                        for (const entry of bindingNameEntries(declaration.name)) {
                            if (entry.name === "let") {
                                return { node: entry.node, message: "lexical iteration binding cannot be named 'let'" };
                            }
                            if (headNames.has(entry.name)) {
                                return { node: entry.node, message: `duplicate lexical iteration binding '${entry.name}'` };
                            }
                            headNames.add(entry.name);
                        }
                    }
                    lexicalIterationNames = new Set([...lexicalIterationNames, ...headNames]);
                }
            }
        }
        const childContext = iteration || breakable
            ? {
                ...context,
                breakableDepth: context.breakableDepth + (breakable ? 1 : 0),
                iterationDepth: context.iterationDepth + (iteration ? 1 : 0),
                lexicalIterationNames,
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
