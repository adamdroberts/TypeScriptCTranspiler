import ts from "typescript";
import { isStrictCodeContext } from "./function-static-semantics";

/** Follow one source-tree path. Pending evaluation and completion obligations
 * are barriers; neither argument arity nor expression/statement depth matters. */
export function isTailPositionCall(node: ts.Node): node is ts.CallExpression | ts.TaggedTemplateExpression {
    if ((!ts.isCallExpression(node) && !ts.isTaggedTemplateExpression(node)) || !isStrictCodeContext(node)) return false;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.SuperKeyword ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword)) return false;
    let current: ts.Node = node;
    let returned = false;
    for (let parent = current.parent; parent; current = parent, parent = parent.parent) {
        if (!returned) {
            if (ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) ||
                ts.isTypeAssertionExpression(parent) || ts.isNonNullExpression(parent) || ts.isSatisfiesExpression(parent)) continue;
            if (ts.isConditionalExpression(parent) && current !== parent.condition) continue;
            if (ts.isBinaryExpression(parent) && current === parent.right &&
                [ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken,
                    ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)) continue;
            if (ts.isReturnStatement(parent) && current === parent.expression) { returned = true; continue; }
            if (!ts.isArrowFunction(parent) || current !== parent.body) return false;
        }
        if (ts.isFunctionLike(parent)) {
            return "body" in parent && !!parent.body &&
                !("asteriskToken" in parent && parent.asteriskToken) &&
                !ts.getModifiers(parent)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
        }
        if (ts.isForOfStatement(parent)) return false;
        if (ts.isTryStatement(parent) && current !== (parent.finallyBlock ?? parent.catchClause)) return false;
        if (ts.isTryStatement(parent) && parent.finallyBlock && current === parent.catchClause) return false;
        if (ts.isBlock(parent) && parent.statements.some(statement => ts.isVariableStatement(statement) &&
            !!(statement.declarationList.flags & ts.NodeFlags.Using))) return false;
        if (ts.isClassLike(parent) || ts.isSourceFile(parent)) return false;
    }
    return false;
}
