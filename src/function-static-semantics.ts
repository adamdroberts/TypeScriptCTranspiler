import ts from "typescript";
import { ecmaParseGoal, ecmaDirectivePrologueHasUseStrict } from "./ecmascript-source";
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
    return !!body && ts.isBlock(body) && ecmaDirectivePrologueHasUseStrict(body.statements);
}

export function isStrictCodeContext(node: ts.Node): boolean {
    for (let current: ts.Node | undefined = node; current; current = current.parent) {
        if (ts.isClassLike(current)) return true;
        if (isFunctionDefinition(current) && containsUseStrict(current.body)) return true;
        if (ts.isSourceFile(current)) {
            return ecmaParseGoal(current) === "module" || ecmaDirectivePrologueHasUseStrict(current.statements);
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
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
        // Ordinary function definitions have no HomeObject. Arrows retain
        // this lexical restriction; nested non-arrow definitions establish
        // their own context and are visited separately by the source walk.
        const worklist: ts.Node[] = [...node.parameters, ...(node.body ? [node.body] : [])];
        while (worklist.length) {
            const current = worklist.pop()!;
            if (current.kind === ts.SyntaxKind.SuperKeyword) {
                return { node: current, message: "super is not permitted in an ordinary function definition" };
            }
            if (ts.isFunctionLike(current) && !ts.isArrowFunction(current) ||
                ts.isClassStaticBlockDeclaration(current) || ts.isPropertyDeclaration(current)) continue;
            pushChildren(worklist, current);
        }
    }
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
    const strict = isStrictCodeContext(node);
    if (strict) {
        const restricted = entries.find((entry) => strictModeBindingIdentifierNames.has(entry.name));
        if (restricted) {
            return {
                node: restricted.node,
                message: `binding identifier '${restricted.name}' is not permitted in strict mode`,
            };
        }
    }

    const uniqueParameters = strict || !isSimpleParameterList(node) ||
        !(ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node));
    const seen = new Set<string>();
    for (const entry of entries) {
        if (uniqueParameters && seen.has(entry.name)) {
            return {
                node: entry.node,
                message: `${ts.isArrowFunction(node) ? "ArrowFormalParameters" : "FormalParameters"} BoundNames contains duplicate '${entry.name}'`,
            };
        }
        seen.add(entry.name);
    }

    const lexicalNames = new Set(directBodyLexicalNames(node.body).map((entry) => entry.name));
    for (const entry of entries) {
        if (lexicalNames.has(entry.name)) {
            return {
                node: entry.node,
                message: `${ts.isArrowFunction(node) ? "arrow" : "function"} parameter '${entry.name}' conflicts with a body lexical declaration`,
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
    const module = ecmaParseGoal(sourceFile) === "module";
    const javascript = isJavaScriptSourceFile(sourceFile);
    const worklist: Array<{ node: ts.Node; allowAwait: boolean; allowYield: boolean }> = [
        { node: sourceFile, allowAwait: module, allowYield: false },
    ];
    while (worklist.length > 0) {
        const { node, allowAwait, allowYield } = worklist.pop()!;
        // The TypeScript AST also calls a JavaScript class's `extends` operand
        // a TypeNode. Its expression is ordinary ECMAScript syntax; only an
        // attached type-argument List belongs to the TypeScript grammar.
        const classHeritageExpression = ts.isExpressionWithTypeArguments(node) &&
            ts.isHeritageClause(node.parent) && node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
            ts.isClassLike(node.parent.parent) && !node.typeArguments;
        if (javascript && (ts.isTypeNode(node) && !classHeritageExpression || ts.isTypeParameterDeclaration(node) ||
            ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) ||
            ts.isNonNullExpression(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node) || ts.isImportEqualsDeclaration(node) ||
            ts.isParameter(node) && !!node.questionToken)) {
            return { node, message: "TypeScript syntax is not permitted in ECMAScript source" };
        }
        if (ts.isIdentifier(node) && node.text === "await" &&
            (module || ((node.flags & ts.NodeFlags.AwaitContext) &&
                !(ts.isFunctionExpression(node.parent) && node.parent.name === node))) && isContextualGrammarIdentifier(node)) {
            return { node, message: "identifier 'await' is not permitted in this grammar context" };
        }
        if (ts.isIdentifier(node) && node.text === "yield" && (node.flags & ts.NodeFlags.YieldContext) && isContextualGrammarIdentifier(node))
            return { node, message: "identifier 'yield' is not permitted in this grammar context" };
        if (ts.isAwaitExpression(node) && !allowAwait)
            return { node, message: "AwaitExpression is not permitted in this grammar context" };
        if (ts.isYieldExpression(node) && !allowYield)
            return { node, message: "YieldExpression is not permitted in this grammar context" };
        if (isFunctionDefinition(node) && node.body) {
            const failure = functionLikeFailure(node);
            if (failure) return failure;
            const async = !!ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
            const children: ts.Node[] = [];
            node.forEachChild(child => { children.push(child); });
            for (let index = children.length - 1; index >= 0; --index) {
                const child = children[index]!;
                worklist.push({ node: child, allowAwait: child === node.body ? async :
                    ts.isParameter(child) ? false : allowAwait,
                    allowYield: child === node.body ? !!("asteriskToken" in node && node.asteriskToken) :
                        ts.isParameter(child) ? false : allowYield });
            }
            continue;
        }
        const children: ts.Node[] = [];
        node.forEachChild(child => { children.push(child); });
        for (let index = children.length - 1; index >= 0; --index)
            worklist.push({ node: children[index]!, allowAwait: ts.isClassStaticBlockDeclaration(node) ? false : allowAwait,
                allowYield: ts.isClassStaticBlockDeclaration(node) ? false : allowYield });
    }
    return null;
}

/** IdentifierName property positions do not consume the contextual
 * BindingIdentifier/IdentifierReference grammar parameters. */
export function isContextualGrammarIdentifier(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
    if ((ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isMethodSignature(parent) ||
        ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent) || ts.isEnumMember(parent) ||
        ts.isNamedTupleMember(parent) || ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent)) && parent.name === node)
        return false;
    if (ts.isJsxAttribute(parent) && parent.name === node || ts.isJsxNamespacedName(parent)) return false;
    if ((ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxClosingElement(parent)) && parent.tagName === node)
        return false;
    if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
    if (ts.isImportAttribute(parent) && parent.name === node) return false;
    if (ts.isImportSpecifier(parent) && parent.propertyName === node) return false;
    if (ts.isExportSpecifier(parent)) {
        const declaration = parent.parent.parent;
        if (declaration.moduleSpecifier || (parent.name === node && parent.propertyName)) return false;
    }
    return true;
}
