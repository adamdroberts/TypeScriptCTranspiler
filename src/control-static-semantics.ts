import ts from "typescript";
import { bindingNameEntries, statementListLexicallyDeclaredNames, statementListVarDeclaredNames, strictModeBindingIdentifierNames } from "./module-static-semantics";
import { ecmaDirectivePrologueHasUseStrict, ecmaParseGoal, isStatementBody } from "./ecmascript-source";
import { isContextualGrammarIdentifier } from "./function-static-semantics";

export interface ControlStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

interface ControlContext {
    readonly strict: boolean;
    readonly allowReturn: boolean;
    readonly allowAwait: boolean;
    readonly breakableDepth: number;
    readonly iterationDepth: number;
    readonly labels: ReadonlyMap<string, boolean>;
    readonly lexicalIterationNames: ReadonlySet<string>;
    readonly catchPatternNames: ReadonlySet<string>;
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
        strict: ecmaParseGoal(sourceFile) === "module" || ecmaDirectivePrologueHasUseStrict(sourceFile.statements, sourceFile),
        allowReturn: false,
        allowAwait: false,
        breakableDepth: 0,
        iterationDepth: 0,
        labels: new Map(),
        lexicalIterationNames: new Set(),
        catchPatternNames: new Set(),
    };
    const functionBodies = new Set<ts.Block>();
    const declarationConflict = (statements: readonly ts.Statement[], functionsAreLexical: boolean, strict: boolean, label: string): ControlStaticSemanticsFailure | null => {
        const lexicalNames = new Map<string, ts.Declaration | undefined>();
        const ordinaryFunction = (declaration: ts.Declaration | undefined): boolean =>
            !!declaration && ts.isFunctionDeclaration(declaration) && !declaration.asteriskToken &&
            !(ts.getModifiers(declaration)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false);
        for (const entry of statementListLexicallyDeclaredNames(statements, functionsAreLexical)) {
            const previous = lexicalNames.get(entry.name);
            if (lexicalNames.has(entry.name) && (strict || !functionsAreLexical || !ordinaryFunction(previous) || !ordinaryFunction(entry.declaration)))
                return {node: entry.node, message: `${label} LexicallyDeclaredNames contains duplicate '${entry.name}'`};
            lexicalNames.set(entry.name, entry.declaration);
        }
        if (!lexicalNames.size) return null;
        for (const entry of statementListVarDeclaredNames(statements, !functionsAreLexical))
            if (lexicalNames.has(entry.name)) return {node: entry.node, message: `${label} LexicallyDeclaredNames and VarDeclaredNames both contain '${entry.name}'`};
        return null;
    };
    const worklist: Array<{ readonly node: ts.Node; readonly context: ControlContext }> = [
        { node: sourceFile, context: { ...rootContext, allowAwait: ecmaParseGoal(sourceFile) === "module" } },
    ];
    while (worklist.length > 0) {
        const entry = worklist.pop()!;
        const node = entry.node;
        const body = ts.isFunctionLike(node) ? (node as ts.SignatureDeclaration & {body?:ts.ConciseBody}).body : undefined;
        const strict = entry.context.strict || ts.isClassLike(node) || !!body && ts.isBlock(body) && ecmaDirectivePrologueHasUseStrict(body.statements, sourceFile);
        const context = strict === entry.context.strict ? entry.context : {...entry.context, strict};
        if (ts.isTaggedTemplateExpression(node) && ((node.flags | node.tag.flags) & ts.NodeFlags.OptionalChain))
            return { node, message: "optional chain is not permitted as a template tag" };
        if (ts.isNewExpression(node) && (node.expression.flags & ts.NodeFlags.OptionalChain))
            return { node, message: "optional chain is not permitted as a constructor target" };
        if (ts.isDeleteExpression(node) && context.strict) {
            let target: ts.Expression = node.expression;
            while (ts.isParenthesizedExpression(target)) target = target.expression;
            if (ts.isIdentifier(target))
                return { node, message: "delete of an identifier is not permitted in strict mode" };
        }
        if (ts.isArrayBindingPattern(node) || ts.isObjectBindingPattern(node)) {
            for (let index = 0; index < node.elements.length; index++) {
                const element = node.elements[index]!;
                if (ts.isOmittedExpression(element) || !element.dotDotDotToken) continue;
                if (element.initializer || index !== node.elements.length - 1 || node.elements.hasTrailingComma ||
                    ts.isObjectBindingPattern(node) && (!ts.isIdentifier(element.name) || element.propertyName))
                    return { node: element, message: "invalid rest binding grammar" };
            }
        }
        if (ts.isParameter(node) && node.dotDotDotToken) {
            const parameters = (node.parent as ts.SignatureDeclaration).parameters;
            if (node.initializer || parameters[parameters.length - 1] !== node || parameters.hasTrailingComma)
                return { node, message: "invalid rest binding grammar" };
        }
        const declarationName=ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node) ? node.name : undefined;
        if(declarationName && context.strict) {
            const restricted=bindingNameEntries(declarationName).find(entry=>strictModeBindingIdentifierNames.has(entry.name));
            if(restricted)return {node:restricted.node,message:`binding identifier '${restricted.name}' is not permitted in strict mode`};
        }
        if (ts.isIdentifier(node) && /(?:\.[cm]?js|\.jsx)$/iu.test(node.getSourceFile().fileName) &&
            node.text !== "eval" && node.text !== "arguments" &&
            strictModeBindingIdentifierNames.has(node.text) && context.strict && isContextualGrammarIdentifier(node))
            return {node, message:`identifier '${node.text}' is not permitted in strict mode`};
        if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.BlockScoped) &&
            node.parent && isStatementBody(node.parent, node))
            return {node, message:"lexical declaration is not permitted as a Statement"};
        if (ts.isWithStatement(node) && context.strict)
            return {node, message:"with statement is not permitted in strict mode"};
        if(ts.isCatchClause(node)){
            const parameter=node.variableDeclaration?.name;
            const names=new Set<string>();
            if(parameter)for(const entry of bindingNameEntries(parameter)){
                if(names.has(entry.name)||context.strict&&strictModeBindingIdentifierNames.has(entry.name))
                    return {node:entry.node,message:"catch binding has invalid or duplicate BoundNames"};
                names.add(entry.name);
            }
            for(const statement of node.block.statements){
                const entries=ts.isVariableStatement(statement)&&(statement.declarationList.flags&ts.NodeFlags.BlockScoped)
                    ? statement.declarationList.declarations.flatMap(declaration=>bindingNameEntries(declaration.name)) :
                    (ts.isFunctionDeclaration(statement)||ts.isClassDeclaration(statement))&&statement.name
                        ? [{name:statement.name.text,node:statement.name}] : [];
                for(const entry of entries)if(names.has(entry.name))
                    return {node:entry.node,message:`catch binding '${entry.name}' conflicts with a block lexical declaration`};
            }
            const catchPatternNames=new Set(context.catchPatternNames);
            if(parameter&&!ts.isIdentifier(parameter))for(const name of names)catchPatternNames.add(name);
            worklist.push({node:node.block,context:{...context,catchPatternNames}});
            if(node.variableDeclaration)worklist.push({node:node.variableDeclaration,context});
            continue;
        }
        if (ts.isWithStatement(node)) {
            let body=node.statement;
            while(ts.isLabeledStatement(body))body=body.statement;
            if (ts.isFunctionDeclaration(body) || ts.isClassDeclaration(body))
                return {node:body, message:"with body must be a Statement"};
        }
        if (ts.isFunctionLike(node)) {
            const body = (node as ts.SignatureDeclaration & { body?: ts.ConciseBody }).body;
            if (body) {
                if (ts.isBlock(body)) functionBodies.add(body);
                worklist.push({
                    node: body,
                    context: {
                        strict: context.strict,
                        allowReturn: true,
                        allowAwait: ts.canHaveModifiers(node) &&
                            (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false),
                        breakableDepth: 0,
                        iterationDepth: 0,
                        labels: new Map(),
                        lexicalIterationNames: new Set(),
                        catchPatternNames: new Set(),
                    },
                });
            }
            for (const parameter of (node as ts.SignatureDeclaration).parameters)
                worklist.push({ node: parameter, context: {...rootContext, strict:context.strict} });
            const name = (node as ts.SignatureDeclaration & { name?: ts.PropertyName }).name;
            if (name && ts.isComputedPropertyName(name)) worklist.push({ node: name.expression, context });
            continue;
        }
        if (ts.isClassStaticBlockDeclaration(node)) {
            worklist.push({ node: node.body, context: {...rootContext, strict:true} });
            continue;
        }
        if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Using) !== 0) {
            const asynchronous = (node.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing;
            const owner = node.parent;
            const statement = ts.isVariableStatement(owner) ? owner : null;
            const container = statement?.parent;
            const iteration = ts.isForOfStatement(owner);
            if (asynchronous && !context.allowAwait ||
                ts.isForInStatement(owner) ||
                statement && (
                    ts.canHaveModifiers(statement) && (ts.getModifiers(statement)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false) ||
                    !container || !(ts.isBlock(container) || ts.isSourceFile(container)) ||
                    ts.isSourceFile(container) && ecmaParseGoal(sourceFile) === "script"
                ) || !statement && !iteration && !ts.isForStatement(owner)) {
                return { node, message: "resource declaration is not valid in this grammar context" };
            }
            // Literal grammar terminals forbid Unicode escapes, and both
            // boundaries in AwaitUsingDeclaration forbid LineTerminators.
            const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, ts.LanguageVariant.Standard,
                sourceFile.text, undefined, node.getStart(sourceFile));
            let previousEnd = node.getStart(sourceFile);
            for (const keyword of asynchronous ? ["await", "using"] : ["using"]) {
                scanner.scan();
                if (scanner.getTokenText() !== keyword || /[\r\n\u2028\u2029]/u.test(sourceFile.text.slice(previousEnd, scanner.getTokenPos())))
                    return { node, message: "resource declaration is not valid in this grammar context" };
                previousEnd = scanner.getTextPos();
            }
            scanner.scan();
            if (/[\r\n\u2028\u2029]/u.test(sourceFile.text.slice(previousEnd, scanner.getTokenPos())))
                return { node, message: "resource declaration is not valid in this grammar context" };
            if (iteration && (node.declarations.length !== 1 || !asynchronous &&
                ts.isIdentifier(node.declarations[0]!.name) && node.declarations[0]!.name.text === "of"))
                return { node, message: "resource declaration is not valid in this grammar context" };
            const names = new Set<string>();
            for (const declaration of node.declarations) {
                if (!ts.isIdentifier(declaration.name) || (iteration ? !!declaration.initializer : !declaration.initializer))
                    return { node: declaration, message: "resource declaration requires an initialized identifier binding" };
                const name = declaration.name.text;
                if (name === "let" || names.has(name) ||
                    strictModeBindingIdentifierNames.has(name) && context.strict)
                    return { node: declaration.name, message: "resource declaration has invalid or duplicate BoundNames" };
                names.add(name);
            }
        }
        if (ts.isVariableDeclarationList(node) &&
            (node.flags & ts.NodeFlags.BlockScoped) === 0) {
            for (const declaration of node.declarations) {
                for (const entry of bindingNameEntries(declaration.name)) {
                    if (context.lexicalIterationNames.has(entry.name)) {
                        return { node: entry.node,
                            message: `lexical iteration binding '${entry.name}' conflicts with a body var declaration` };
                    }
                    if(context.catchPatternNames.has(entry.name))
                        return {node:entry.node,message:`catch pattern binding '${entry.name}' conflicts with a body var declaration`};
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
        if (ts.isCaseBlock(node)) {
            let defaultClause: ts.DefaultClause | undefined;
            for (const clause of node.clauses) {
                if (!ts.isDefaultClause(clause)) continue;
                if (defaultClause) return {node: clause, message: "switch CaseBlock contains more than one default clause"};
                defaultClause = clause;
            }
            const statements = node.clauses.flatMap(clause => Array.from(clause.statements));
            const failure = declarationConflict(statements, true, context.strict, "CaseBlock");
            if (failure) return failure;
        }
        if (ts.isBlock(node) || ts.isSourceFile(node) && ecmaParseGoal(sourceFile) === "script") {
            const topLevel = ts.isSourceFile(node) || functionBodies.has(node);
            const failure = declarationConflict(node.statements, !topLevel, context.strict, topLevel ? "Body" : "Block");
            if (failure) return failure;
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
