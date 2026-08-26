import ts from "typescript";
import {
    bindingNameEntries,
    strictModeBindingIdentifierNames,
} from "./module-static-semantics";

export interface FunctionStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

function pushChildren(worklist: ts.Node[], node: ts.Node): void {
    const children: ts.Node[] = [];
    node.forEachChild((child) => { children.push(child); });
    for (let index = children.length - 1; index >= 0; index--) {
        worklist.push(children[index]!);
    }
}

function isFunctionDefinition(node: ts.Node): node is ts.FunctionLikeDeclaration {
    return ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node);
}

function parameterEntries(node: ts.FunctionLikeDeclaration): ReturnType<typeof bindingNameEntries> {
    return node.parameters.flatMap((parameter) => bindingNameEntries(parameter.name));
}

function isSimpleParameterList(node: ts.FunctionLikeDeclaration): boolean {
    return node.parameters.every((parameter) =>
        ts.isIdentifier(parameter.name) &&
        !parameter.initializer &&
        !parameter.dotDotDotToken,
    );
}

function containsUseStrict(body: ts.ConciseBody | undefined): boolean {
    if (!body || !ts.isBlock(body)) return false;
    for (const statement of body.statements) {
        if (!ts.isExpressionStatement(statement) ||
            !ts.isStringLiteral(statement.expression)) return false;
        if (statement.expression.text === "use strict") return true;
    }
    return false;
}

function sourceContainsUseStrict(sourceFile: ts.SourceFile): boolean {
    for (const statement of sourceFile.statements) {
        if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
        if (statement.expression.text === "use strict") return true;
    }
    return false;
}

function isStrictFunctionContext(node: ts.FunctionLikeDeclaration): boolean {
    for (let current: ts.Node | undefined = node; current; current = current.parent) {
        if (ts.isClassLike(current)) return true;
        if (isFunctionDefinition(current) && containsUseStrict(current.body)) return true;
        if (ts.isSourceFile(current)) {
            return sourceContainsUseStrict(current);
        }
    }
    return false;
}

function parameterContainsSuspendingExpression(
    parameter: ts.ParameterDeclaration,
): ts.AwaitExpression | ts.YieldExpression | null {
    const worklist: ts.Node[] = [parameter];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (ts.isAwaitExpression(node) || ts.isYieldExpression(node)) return node;
        if (node !== parameter && (ts.isFunctionLike(node) || ts.isClassLike(node))) continue;
        pushChildren(worklist, node);
    }
    return null;
}

function arrowHasLineTerminatorBeforeToken(node: ts.ArrowFunction): boolean {
    const sourceFile = node.getSourceFile();
    const arrowStart = node.equalsGreaterThanToken.getStart(sourceFile);
    let boundary = node.parameters.end;
    if (sourceFile.text.charCodeAt(node.getStart(sourceFile)) === 0x28) {
        const scanner = ts.createScanner(
            ts.ScriptTarget.ESNext,
            true,
            ts.LanguageVariant.Standard,
            sourceFile.text,
            undefined,
            node.parameters.end,
            arrowStart - node.parameters.end,
        );
        if (scanner.scan() !== ts.SyntaxKind.CloseParenToken) return false;
        boundary = scanner.getTextPos();
    }
    return /[\n\r\u2028\u2029]/u.test(sourceFile.text.slice(boundary, arrowStart));
}

function isJavaScriptSourceFile(sourceFile: ts.SourceFile): boolean {
    return /\.[cm]?jsx?$/iu.test(sourceFile.fileName);
}

function directBodyLexicalNames(
    body: ts.ConciseBody | undefined,
): ReturnType<typeof bindingNameEntries> {
    if (!body || !ts.isBlock(body)) return [];
    const entries: ReturnType<typeof bindingNameEntries> = [];
    for (const statement of body.statements) {
        if (ts.isVariableStatement(statement) &&
            (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) {
            for (const declaration of statement.declarationList.declarations) {
                entries.push(...bindingNameEntries(declaration.name));
            }
        } else if (ts.isClassDeclaration(statement) && statement.name) {
            entries.push({ name: statement.name.text, node: statement.name });
        }
    }
    return entries;
}

function functionLikeFailure(
    node: ts.FunctionLikeDeclaration,
): FunctionStaticSemanticsFailure | null {
    const parameters = node.parameters;
    for (let index = 0; index < parameters.length; index++) {
        const parameter = parameters[index]!;
        if (parameter.dotDotDotToken) {
            if (parameter.initializer) {
                return {
                    node: parameter.initializer,
                    message: "a rest parameter cannot have an initializer",
                };
            }
            if (index !== parameters.length - 1 || parameters.hasTrailingComma) {
                return {
                    node,
                    message: "a rest parameter must be the final parameter and cannot have a trailing comma",
                };
            }
        }
    }

    if (containsUseStrict(node.body) && !isSimpleParameterList(node)) {
        return {
            node: node.body!,
            message: "a use strict directive is not permitted with a non-simple parameter list",
        };
    }


    const entries = parameterEntries(node);
    if (isStrictFunctionContext(node)) {
        const restricted = entries.find((entry) => strictModeBindingIdentifierNames.has(entry.name));
        if (restricted) {
            return {
                node: restricted.node,
                message: `binding identifier '${restricted.name}' is not permitted in strict mode`,
            };
        }
    }

    if (!ts.isArrowFunction(node)) return null;
    if (isJavaScriptSourceFile(node.getSourceFile()) && arrowHasLineTerminatorBeforeToken(node)) {
        return {
            node: node.equalsGreaterThanToken,
            message: "a line terminator is not permitted before an arrow token",
        };
    }
    const seen = new Set<string>();
    for (const entry of entries) {
        if (seen.has(entry.name)) {
            return {
                node: entry.node,
                message: `ArrowFormalParameters BoundNames contains duplicate '${entry.name}'`,
            };
        }
        seen.add(entry.name);
    }

    const lexicalNames = new Set(directBodyLexicalNames(node.body).map((entry) => entry.name));
    for (const entry of entries) {
        if (lexicalNames.has(entry.name)) {
            return {
                node: entry.node,
                message: `arrow parameter '${entry.name}' conflicts with a body lexical declaration`,
            };
        }
    }

    for (const parameter of parameters) {
        const suspension = parameterContainsSuspendingExpression(parameter);
        if (suspension) {
            return {
                node: suspension,
                message: ts.isAwaitExpression(suspension)
                    ? "ArrowParameters contains AwaitExpression"
                    : "ArrowParameters contains YieldExpression",
            };
        }
    }
    return null;
}

/** Function-definition early errors over one explicit source-tree worklist.
 * Formal BoundNames always come from one recursive binding tree; neither
 * parameter count nor generated fixture families affect the decision. */
export function earlyFunctionStaticSemanticsFailure(
    sourceFile: ts.SourceFile,
): FunctionStaticSemanticsFailure | null {
    const worklist: ts.Node[] = [sourceFile];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (isFunctionDefinition(node) && node.body) {
            const failure = functionLikeFailure(node);
            if (failure) return failure;
        }
        pushChildren(worklist, node);
    }
    return null;
}
