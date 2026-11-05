import ts from "typescript";
import { EVAL_CONTEXT_FIELD_INITIALIZER, EVAL_CONTEXT_SUPER_CALL, EVAL_CONTEXT_SUPER_PROPERTY, classHasHeritage, evalSourceContext } from "./eval-context";
import { ecmaParseGoal, ecmaDirectivePrologueHasUseStrict } from "./ecmascript-source";
import {
    bindingNameEntries,
    statementListLexicallyDeclaredNames,
    strictModeBindingIdentifierNames,
} from "./module-static-semantics";

export interface FunctionStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

/** ExpectedArgumentCount uses the canonical ordered parameter collection.
 * TypeScript's erased this parameter does not contribute to ECMAScript length. */
export function expectedArgumentCount(node: ts.FunctionLikeDeclaration): number {
    let length = 0;
    for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name) && parameter.name.text === "this") continue;
        if (parameter.initializer || parameter.dotDotDotToken) break;
        length++;
    }
    return length;
}

type CompletionValue = ts.Expression | null | "undefined" | "unknown";
type BodyCompletion = {
    readonly kind: "normal" | "throw" | "return" | "break" | "continue";
    readonly value: CompletionValue;
    readonly label: string | null;
};
export interface FunctionBodyCompletions {
    readonly normal: boolean;
    readonly returns: readonly (ts.Expression | null)[];
    readonly reachable: ReadonlySet<ts.Node>;
    readonly complete: boolean;
}
export interface StatementBodyCompletions extends FunctionBodyCompletions {
    readonly normalValues: readonly (ts.Expression | "undefined" | "unknown")[];
    readonly analyzed: ReadonlySet<ts.Node>;
}
/** These productions apply UpdateEmpty(result, undefined), independently of
 * the preceding StatementList value. Blocks and labels retain empty values. */
export function statementCompletionStartsUndefined(node:ts.Node):boolean {
    return ts.isIfStatement(node)||ts.isIterationStatement(node,false)||ts.isSwitchStatement(node)||ts.isTryStatement(node)||ts.isWithStatement(node);
}
/** One statement tree and iterative completion worklist. Interned records
 * retain kind, value and target; UpdateEmpty composes sequences and exits. */
export function statementBodyCompletions(body: ts.Statement | ts.SourceFile): StatementBodyCompletions {
    const records = new Map<string, BodyCompletion>(), expressions = new Map<ts.Expression, number>();
    const record = (kind: BodyCompletion["kind"], value: CompletionValue = null, label: string | null = null): BodyCompletion => {
        let key: string;
        if (typeof value === "object" && value) {
            let index = expressions.get(value);
            if (index === undefined) {
                index = expressions.size;
                expressions.set(value, index);
            }
            key = "expression:" + index;
        }
        else
            key = value ?? "empty";
        const identity = JSON.stringify([kind, key, label]);
        let result = records.get(identity);
        if (!result) {
            result = { kind, value, label };
            records.set(identity, result);
        }
        return result;
    };
    const normal = record("normal"), thrown = record("throw", "unknown");
    const literalValue=(input:ts.Expression):boolean=>{
        let expression=input;
        while(ts.isParenthesizedExpression(expression)||ts.isAsExpression(expression)||ts.isTypeAssertionExpression(expression)||ts.isNonNullExpression(expression)||ts.isSatisfiesExpression(expression))expression=expression.expression;
        return ts.isStringLiteralLike(expression)||ts.isNumericLiteral(expression)||ts.isBigIntLiteral(expression)||expression.kind===ts.SyntaxKind.TrueKeyword||expression.kind===ts.SyntaxKind.FalseKeyword||expression.kind===ts.SyntaxKind.NullKeyword;
    };
    const updateEmpty = (value: BodyCompletion, prior: CompletionValue): BodyCompletion => value.value === null ? record(value.kind, prior, value.label) : value;
    type Summary = {
        flow: Set<BodyCompletion>;
        live: ts.Node[];
    };
    const summaries = new Map<ts.Node, Summary>();
    let complete = true;
    const truth = (input: ts.Expression | undefined): boolean | undefined => {
        if (!input)
            return true;
        let expression = input;
        while (ts.isParenthesizedExpression(expression))
            expression = expression.expression;
        if (expression.kind === ts.SyntaxKind.TrueKeyword)
            return true;
        if (expression.kind === ts.SyntaxKind.FalseKeyword || expression.kind === ts.SyntaxKind.NullKeyword)
            return false;
        if (ts.isNumericLiteral(expression))
            return Number(expression.text) !== 0;
        if (ts.isStringLiteralLike(expression))
            return expression.text.length > 0;
        return undefined;
    };
    const compose = (left: Set<BodyCompletion>, right: Set<BodyCompletion>): Set<BodyCompletion> => {
        const result = new Set<BodyCompletion>();
        for (const value of left) {
            if (value.kind !== "normal")
                result.add(value);
            else
                for (const next of right)
                    result.add(updateEmpty(next, value.value));
        }
        return result;
    };
    const children = (node: ts.Node): ts.Node[] => {
        if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node))
            return [...node.statements];
        if (ts.isIfStatement(node))
            return [node.thenStatement, ...node.elseStatement ? [node.elseStatement] : []];
        if (ts.isTryStatement(node))
            return [node.tryBlock, ...node.catchClause ? [node.catchClause.block] : [], ...node.finallyBlock ? [node.finallyBlock] : []];
        if (ts.isSwitchStatement(node))
            return [...node.caseBlock.clauses];
        if (ts.isIterationStatement(node, false) || ts.isLabeledStatement(node) || ts.isWithStatement(node))
            return [node.statement];
        return [];
    };
    const worklist = [{ node: body as ts.Node, finish: false }];
    while (worklist.length) {
        const { node, finish } = worklist.pop()!;
        if (!finish) {
            worklist.push({ node, finish: true });
            for (const child of children(node))
                worklist.push({ node: child, finish: false });
            continue;
        }
        const nodes = children(node), live = [...nodes];
        let flow = new Set<BodyCompletion>();
        const child = (node: ts.Node) => summaries.get(node)!.flow;
        if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
            flow.add(normal);
            live.length = 0;
            for (const statement of nodes) {
                if ([...flow].some(value => value.kind === "normal") || ts.isFunctionDeclaration(statement))
                    live.push(statement);
                flow = compose(flow, child(statement));
            }
        }
        else if (ts.isReturnStatement(node)) {
            flow.add(record("return", node.expression ?? "undefined"));
            if (node.expression&&!literalValue(node.expression))
                flow.add(thrown);
        }
        else if (ts.isThrowStatement(node)) {
            flow.add(record("throw", node.expression));
            if(!literalValue(node.expression))flow.add(thrown);
        }
        else if (ts.isBreakStatement(node) || ts.isContinueStatement(node))
            flow.add(record(ts.isBreakStatement(node) ? "break" : "continue", null, node.label?.text ?? null));
        else if (ts.isIfStatement(node)) {
            const condition = truth(node.expression);
            live.length = 0;
            if (condition !== false) {
                live.push(node.thenStatement);
                for (const value of child(node.thenStatement))
                    flow.add(value);
            }
            if (condition !== true) {
                if (node.elseStatement) {
                    live.push(node.elseStatement);
                    for (const value of child(node.elseStatement))
                        flow.add(value);
                }
                else
                    flow.add(record("normal", "undefined"));
            }
            if (condition === undefined)
                flow.add(thrown);
        }
        else if (ts.isIterationStatement(node, false)) {
            const iterable = ts.isForInStatement(node) || ts.isForOfStatement(node);
            const condition = iterable ? undefined : ts.isForStatement(node) ? truth(node.condition) : ts.isWhileStatement(node) || ts.isDoStatement(node) ? truth(node.expression) : undefined;
            const executes = ts.isDoStatement(node) || condition !== false;
            if (!executes)
                live.length = 0;
            const labels = new Set<string>();
            let labeled: ts.Node = node;
            while (labeled.parent && ts.isLabeledStatement(labeled.parent) && labeled.parent.statement === labeled) {
                labels.add(labeled.parent.label.text);
                labeled = labeled.parent;
            }
            const carried = new Set<CompletionValue>(["undefined"]);
            if (executes)
                for (const value of child(node.statement))
                    if (value.value !== null && (value.kind === "normal" || value.kind === "continue" && (value.label === null || labels.has(value.label))))
                        carried.add(value.value);
            const exits = new Set<CompletionValue>();
            if (executes)
                for (const value of child(node.statement)) {
                    if (value.kind === "normal" || value.kind === "continue" && (value.label === null || labels.has(value.label))) {
                        if(value.value===null)for(const prior of carried)exits.add(prior);
                        else exits.add(value.value);
                    }
                    else
                        for (const prior of carried) {
                            const updated = updateEmpty(value, prior);
                            flow.add(value.kind === "break" && value.label === null ? record("normal", updated.value) : updated);
                        }
                }
            if (!ts.isDoStatement(node) && condition !== true)flow.add(record("normal","undefined"));
            if (condition !== true)
                for (const value of exits)
                    flow.add(record("normal", value));
            if (condition === undefined || iterable || ts.isForStatement(node) && node.initializer)
                flow.add(thrown);
        }
        else if (ts.isLabeledStatement(node)) {
            for (const value of child(node.statement))
                flow.add(value.kind === "break" && value.label === node.label.text ? record("normal", value.value) : value);
        }
        else if (ts.isSwitchStatement(node)) {
            let suffix = new Set<BodyCompletion>([normal]);
            for (let index = nodes.length - 1; index >= 0; index--) {
                suffix = compose(child(nodes[index]!), suffix);
                for (const value of suffix) {
                    flow.add(value.kind === "break" && value.label === null ? record("normal", value.value) : value);
                }
            }
            if (!node.caseBlock.clauses.some(ts.isDefaultClause))
                flow.add(record("normal", "undefined"));
            flow.add(thrown);
        }
        else if (ts.isTryStatement(node)) {
            const tried = child(node.tryBlock);
            live.length = 0;
            live.push(node.tryBlock);
            flow = new Set([...tried].filter(value => value.kind !== "throw" || !node.catchClause));
            if (node.catchClause && [...tried].some(value => value.kind === "throw")) {
                live.push(node.catchClause.block);
                for (const value of child(node.catchClause.block))
                    flow.add(value);
                if (node.catchClause.variableDeclaration && !ts.isIdentifier(node.catchClause.variableDeclaration.name))
                    flow.add(thrown);
            }
            if (node.finallyBlock && flow.size) {
                live.push(node.finallyBlock);
                const final = child(node.finallyBlock);
                flow = new Set([...[...final].some(value => value.kind === "normal") ? flow : [], ...[...final].filter(value => value.kind !== "normal")]);
            }
        }
        else if (ts.isWithStatement(node)) {
            flow = new Set(child(node.statement));
            flow.add(thrown);
        }
        else if (ts.isExpressionStatement(node)) {
            flow.add(record("normal", node.expression));
            if(!literalValue(node.expression))flow.add(thrown);
        }
        else if (ts.isVariableStatement(node) || ts.isClassDeclaration(node)) {
            flow.add(normal);
            flow.add(thrown);
        }
        else if (ts.isEmptyStatement(node) || ts.isDebuggerStatement(node) || ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
            flow.add(normal);
        else {
            complete = false;
            flow.add(record("normal", "undefined"));
            flow.add(thrown);
        }
        if(statementCompletionStartsUndefined(node))flow=new Set([...flow].map(value=>updateEmpty(value,"undefined")));
        summaries.set(node, { flow, live });
    }
    const reachable = new Set<ts.Node>(), pending: ts.Node[] = [body];
    while (pending.length) {
        const node = pending.pop()!;
        if (reachable.has(node))
            continue;
        reachable.add(node);
        if (ts.isBlock(node) && node.parent && ts.isCatchClause(node.parent))
            reachable.add(node.parent);
        pending.push(...summaries.get(node)!.live);
    }
    const flow = summaries.get(body)!.flow;
    return { normal: [...flow].some(value => value.kind === "normal"), normalValues: [...new Set([...flow].filter(value => value.kind === "normal").map(value => value.value ?? "undefined"))], returns: [...flow].filter(value => value.kind === "return").map(value => typeof value.value === "object" ? value.value : null), reachable, analyzed: new Set(summaries.keys()), complete };
}
export function functionBodyCompletions(body: ts.Block): StatementBodyCompletions { return statementBodyCompletions(body); }

/** Assignment productions that perform NamedEvaluation for an identifier reference. */
export const NAME_EVALUATING_ASSIGNMENTS: ReadonlySet<ts.SyntaxKind> = new Set([
    ts.SyntaxKind.EqualsToken, ts.SyntaxKind.BarBarEqualsToken,
    ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

export interface CallableNameInput {
    readonly key: string | ts.PropertyName;
    readonly definition?: ts.Node;
    readonly prefix?: "get" | "set";
}

/** Canonical SetFunctionName input before property-key projection. */
export function callableNameInput(
    node: ts.Node,
    declarationFor?: (name: ts.Identifier) => ts.Declaration | undefined,
): CallableNameInput {
    const transparent = (node: ts.Node): node is ts.ParenthesizedExpression | ts.AsExpression |
        ts.TypeAssertion | ts.SatisfiesExpression | ts.NonNullExpression =>
        ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node);
    let current = node;
    while (transparent(current)) current = current.expression;
    const isDefault = (node: ts.Node): boolean => !!(ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword));
    if (ts.isIdentifier(current)) {
        const declaration = declarationFor?.(current);
        if (declaration && (ts.isFunctionDeclaration(declaration) || ts.isClassDeclaration(declaration)))
            return {key: declaration.name?.text ?? (isDefault(declaration) ? "default" : current.text)};
        if (declaration && ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
            let initializer: ts.Node | undefined = declaration.initializer;
            while (initializer && transparent(initializer)) initializer = initializer.expression;
            return {key: initializer && (ts.isFunctionExpression(initializer) || ts.isClassExpression(initializer)) && initializer.name
                ? initializer.name.text : declaration.name.text};
        }
        return {key: declaration && ts.isExportAssignment(declaration) ? "default" : current.text};
    }
    if (ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current))
        return {key: current.name?.text ?? (isDefault(current) ? "default" : "")};
    if ((ts.isFunctionExpression(current) || ts.isClassExpression(current)) && current.name) return {key: current.name.text};
    if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current)) {
        return {key: current.name, definition: current,
            prefix: ts.isGetAccessorDeclaration(current) ? "get" : ts.isSetAccessorDeclaration(current) ? "set" : undefined};
    }
    if (ts.isFunctionExpression(current) || ts.isArrowFunction(current) || ts.isClassExpression(current)) {
        let parent = current.parent;
        while (parent && transparent(parent)) parent = parent.parent;
        if (parent && (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) && ts.isIdentifier(parent.name)) return {key: parent.name.text};
        // `{ name = <definition> } = o`: the AssignmentProperty's Initializer names the definition.
        if (parent && ts.isShorthandPropertyAssignment(parent)) return {key: parent.name.text};
        if (parent && (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent))) return {key: parent.name, definition: parent};
        if (parent && ts.isBinaryExpression(parent) && NAME_EVALUATING_ASSIGNMENTS.has(parent.operatorToken.kind)) {
            if (ts.isIdentifier(parent.left)) return {key: parent.left.text};
        }
        if (parent && ts.isExportAssignment(parent) && !parent.isExportEquals) return {key: "default"};
    }
    return {key: ""};
}

/** Native formatting resolves the same input consumed by the source graph. */
export function callableName(
    node: ts.Node,
    propertyName: (name: ts.PropertyName, definition: ts.Node) => string | null,
    declarationFor?: (name: ts.Identifier) => ts.Declaration | undefined,
): string | null {
    const input = callableNameInput(node, declarationFor);
    const key = typeof input.key === "string" ? input.key : propertyName(input.key, input.definition!);
    return key === null ? null : input.prefix ? `${input.prefix} ${key}` : key;
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
    return statementListLexicallyDeclaredNames(body.statements, false);
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
    // A getter has no parameters and a setter exactly one FormalParameter
    // (PropertySetParameterList admits a default but no rest).
    const valueParameters = node.parameters.filter(parameter => !(ts.isIdentifier(parameter.name) && parameter.name.text === "this"));
    if (ts.isGetAccessorDeclaration(node) && valueParameters.length)
        return { node: valueParameters[0]!, message: "a getter cannot have parameters" };
    if (ts.isSetAccessorDeclaration(node) && (valueParameters.length !== 1 || valueParameters[0]!.dotDotDotToken))
        return { node: valueParameters[0] ?? node, message: "a setter must have exactly one parameter" };
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
    evalContext: number | null = evalSourceContext(sourceFile),
): FunctionStaticSemanticsFailure | null {
    const module = ecmaParseGoal(sourceFile) === "module";
    const javascript = isJavaScriptSourceFile(sourceFile);
    const worklist: Array<{ node: ts.Node; allowAwait: boolean; allowYield: boolean }> = [
        { node: sourceFile, allowAwait: module, allowYield: false },
    ];
    while (worklist.length > 0) {
        const { node, allowAwait, allowYield } = worklist.pop()!;
        if (ts.isMetaProperty(node) && node.name.getText(sourceFile) !==
            (node.keywordToken === ts.SyntaxKind.ImportKeyword ? "meta" : "target"))
            return { node, message: "MetaProperty requires its literal token spelling" };
        if (!module && ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword)
            return { node, message: "import.meta requires the Module parse goal" };
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
            ts.isParameter(node) && (!!node.questionToken || ts.isIdentifier(node.name) && node.name.text === "this"))) {
            return { node, message: "TypeScript syntax is not permitted in ECMAScript source" };
        }
        // A FunctionExpression's own BindingIdentifier is parsed with [~Yield]
        // unless it is a generator and [~Await] unless it is async.
        const expressionName = ts.isIdentifier(node) && ts.isFunctionExpression(node.parent) && node.parent.name === node ? node.parent : null;
        const asyncExpressionName = !!expressionName && (ts.getModifiers(expressionName)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false);
        if (ts.isIdentifier(node) && node.text === "await" &&
            (module || ((node.flags & ts.NodeFlags.AwaitContext) && !(expressionName && !asyncExpressionName))) && isContextualGrammarIdentifier(node)) {
            return { node, message: "identifier 'await' is not permitted in this grammar context" };
        }
        if (ts.isIdentifier(node) && node.text === "yield" && (node.flags & ts.NodeFlags.YieldContext) &&
            !(expressionName && !expressionName.asteriskToken) && isContextualGrammarIdentifier(node))
            return { node, message: "identifier 'yield' is not permitted in this grammar context" };
        // ArrowParameters inherit the enclosing [Yield]/[Await] parameters while a
        // ConciseBody resets them, so an identifier `yield`/`await` inside arrow
        // parameters answers to the first non-arrow function, class static
        // block or module around them (the parser flags only the body).
        if (ts.isIdentifier(node) && (node.text === "yield" || node.text === "await") && isContextualGrammarIdentifier(node)) {
            let inArrowParameters = false;
            let owner: ts.Node | undefined;
            for (let current: ts.Node = node, parent = node.parent; parent; current = parent, parent = parent.parent) {
                if (ts.isArrowFunction(parent)) {
                    if (parent.body === current) { owner = parent; break; }
                    inArrowParameters = true;
                    continue;
                }
                if (ts.isFunctionLike(parent) || ts.isClassStaticBlockDeclaration(parent) || ts.isSourceFile(parent)) { owner = parent; break; }
            }
            if (inArrowParameters && owner) {
                const generator = ts.isFunctionLike(owner) && !ts.isArrowFunction(owner) && !!(owner as ts.FunctionLikeDeclaration).asteriskToken;
                const asyncOwner = ts.isFunctionLike(owner) && ts.canHaveModifiers(owner) &&
                    (ts.getModifiers(owner)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false);
                if (node.text === "yield" && generator)
                    return { node, message: "identifier 'yield' is not permitted in this grammar context" };
                if (node.text === "await" && (asyncOwner || ts.isClassStaticBlockDeclaration(owner) || (ts.isSourceFile(owner) && module)))
                    return { node, message: "identifier 'await' is not permitted in this grammar context" };
            }
        }
        // ContainsArguments: a class static block body and a class field
        // initializer must not contain an IdentifierReference named
        // `arguments`. The walk does not enter a non-arrow function except
        // through its ClassElementName, and a class's own computed key is
        // evaluated outside the class (sec-class-definitions-static-semantics-early-errors).
        if (ts.isIdentifier(node) && node.text === "arguments" && isContextualGrammarIdentifier(node) && !isDeclaredName(node)) {
            for (let current: ts.Node = node, parent = node.parent; parent; current = parent, parent = parent.parent) {
                if (ts.isClassStaticBlockDeclaration(parent))
                    return { node, message: "'arguments' is not permitted in a class static block" };
                if (ts.isPropertyDeclaration(parent)) {
                    if (parent.initializer === current) return { node, message: "'arguments' is not permitted in a class field initializer" };
                    continue;
                }
                if (ts.isFunctionLike(parent) && !ts.isArrowFunction(parent)) {
                    if ("name" in parent && parent.name === current) continue;
                    break;
                }
                if (ts.isSourceFile(parent)) {
                    if (evalContext !== null && (evalContext & EVAL_CONTEXT_FIELD_INITIALIZER))
                        return { node, message: "'arguments' is not permitted in eval code of a class field initializer or static block" };
                    break;
                }
            }
        }
        // SuperProperty needs a HomeObject (a method, accessor, constructor,
        // field initializer or static block) and SuperCall a derived class
        // constructor; a Script or Module admits neither and eval code only
        // what its PerformEval context admits. Element keys and class heritage
        // are evaluated in the enclosing scope (sec-class-definitions-static-semantics-early-errors, sec-performeval).
        if (node.kind === ts.SyntaxKind.SuperKeyword) {
            const call = ts.isCallExpression(node.parent) && node.parent.expression === node;
            let owner: ts.Node | undefined;
            for (let current: ts.Node = node, parent: ts.Node | undefined = node.parent; parent; current = parent, parent = parent.parent) {
                if (ts.isArrowFunction(parent)) continue;
                if ((ts.isFunctionLike(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertyAssignment(parent)) && "name" in parent && parent.name === current) continue;
                if (ts.isFunctionLike(parent) || ts.isClassStaticBlockDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isSourceFile(parent)) { owner = parent; break; }
            }
            let propertyAllowed = false, callAllowed = false;
            if (!owner || ts.isSourceFile(owner)) {
                propertyAllowed = evalContext !== null && (evalContext & EVAL_CONTEXT_SUPER_PROPERTY) !== 0;
                callAllowed = evalContext !== null && (evalContext & EVAL_CONTEXT_SUPER_CALL) !== 0;
            } else if (ts.isConstructorDeclaration(owner) && !hasStaticModifier(owner)) {
                propertyAllowed = true;
                callAllowed = ts.isClassLike(owner.parent) && classHasHeritage(owner.parent);
            } else if (ts.isMethodDeclaration(owner) || ts.isGetAccessorDeclaration(owner) || ts.isSetAccessorDeclaration(owner) ||
                ts.isConstructorDeclaration(owner) || ts.isClassStaticBlockDeclaration(owner) || ts.isPropertyDeclaration(owner)) {
                propertyAllowed = true;
            }
            if (call ? !callAllowed : !propertyAllowed)
                return { node, message: call ? "super() is only permitted in a derived class constructor" : "super property access requires a method, accessor, field initializer or static block" };
        }
        if (ts.isClassLike(node)) {
            const failure = classElementFailure(node);
            if (failure) return failure;
        }
        if (ts.isAwaitExpression(node) && !allowAwait)
            return { node, message: "AwaitExpression is not permitted in this grammar context" };
        if (ts.isYieldExpression(node) && !allowYield)
            return { node, message: "YieldExpression is not permitted in this grammar context" };
        // AssignmentTargetType of an IdentifierReference named eval or
        // arguments is invalid in strict code (sec-identifiers-static-semantics-assignmenttargettype).
        if (ts.isIdentifier(node) && strictModeBindingIdentifierNames.has(node.text) && isAssignmentTargetPosition(node) && isStrictCodeContext(node))
            return { node, message: `assignment to '${node.text}' is not permitted in strict mode` };
        // A parenthesized ObjectLiteral or ArrayLiteral is not an AssignmentPattern:
        // its AssignmentTargetType is invalid (sec-assignment-operators-static-semantics-early-errors,
        // sec-destructuring-assignment-static-semantics-early-errors).
        if ((ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) && ts.isParenthesizedExpression(node.parent) &&
            isAssignmentTargetPosition(node.parent))
            return { node, message: "a parenthesized object or array literal is not a valid assignment target" };
        // AssignmentRestProperty: the DestructuringAssignmentTarget must not be an ArrayLiteral or ObjectLiteral.
        if (ts.isSpreadAssignment(node) && isAssignmentTargetPosition(node.parent)) {
            let target: ts.Expression = node.expression;
            while (ts.isParenthesizedExpression(target)) target = target.expression;
            if (ts.isObjectLiteralExpression(target) || ts.isArrayLiteralExpression(target))
                return { node, message: "a rest property target must be a simple assignment target" };
        }
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

/** Whether `node` sits in an assignment-target position: the left side of
 * an assignment (plain or compound), an update operand, a for-in/of head, or
 * a destructuring assignment target reached through array elements, spread,
 * property values and shorthand members. A pattern element's default value
 * and a plain literal value are not targets. */
function isAssignmentTargetPosition(node: ts.Node): boolean {
    let current: ts.Node = node;
    for (;;) {
        const parent: ts.Node | undefined = current.parent;
        if (!parent) return false;
        if (ts.isParenthesizedExpression(parent)) { current = parent; continue; }
        if (ts.isBinaryExpression(parent))
            return parent.left === current && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
                parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
        if (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
            return current === node && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken);
        if (ts.isForInStatement(parent) || ts.isForOfStatement(parent)) return parent.initializer === current;
        if (ts.isArrayLiteralExpression(parent) || ts.isSpreadElement(parent)) { current = parent; continue; }
        if (ts.isPropertyAssignment(parent)) { if (parent.initializer !== current) return false; current = parent.parent; continue; }
        if (ts.isShorthandPropertyAssignment(parent)) { if (parent.name !== current) return false; current = parent.parent; continue; }
        if (ts.isSpreadAssignment(parent)) { current = parent.parent; continue; }
        return false;
    }
}

/** IdentifierName property positions do not consume the contextual
 * BindingIdentifier/IdentifierReference grammar parameters. */
function hasStaticModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false);
}

/** PropName of a literal element name; null for a computed or private name. */
function literalPropName(name: ts.PropertyName | undefined): string | null {
    if (!name) return null;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
}

/** ClassBody early errors: one constructor, no special-method or field
 * named constructor, no static method or field named prototype
 * (sec-class-definitions-static-semantics-early-errors). The parser calls
 * `async constructor` and `static constructor` ConstructorDeclarations. */
function classElementFailure(node: ts.ClassLikeDeclaration): FunctionStaticSemanticsFailure | null {
    let constructors = 0;
    for (const member of node.members) {
        const isStatic = hasStaticModifier(member);
        const name = literalPropName(member.name);
        if (ts.isConstructorDeclaration(member)) {
            if (isStatic) continue;
            if (ts.getModifiers(member)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword))
                return { node: member, message: "the class constructor cannot be a special method" };
            if (member.body && ++constructors > 1) return { node: member, message: "a class has at most one constructor" };
            continue;
        }
        if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
            if (!isStatic && name === "constructor")
                return { node: member.name, message: "the class constructor cannot be a special method" };
            if (isStatic && name === "prototype")
                return { node: member.name, message: "a static method cannot be named prototype" };
            continue;
        }
        if (ts.isPropertyDeclaration(member)) {
            if (name === "constructor") return { node: member.name, message: "a class field cannot be named constructor" };
            if (isStatic && name === "prototype") return { node: member.name, message: "a static field cannot be named prototype" };
        }
    }
    return null;
}

/** Whether an identifier is a BindingIdentifier or LabelIdentifier rather
 * than an IdentifierReference. */
function isDeclaredName(node: ts.Identifier): boolean {
    const parent = node.parent;
    if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent) ||
        ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isClassLike(parent)) && parent.name === node) return true;
    if (ts.isLabeledStatement(parent) && parent.label === node) return true;
    if (ts.isBreakOrContinueStatement(parent) && parent.label === node) return true;
    return false;
}

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

/** CoalesceExpression early error: `??` cannot share an operand position with
 * `||` or `&&` unless parentheses separate them (sec-binary-logical-operators;
 * the TypeScript parser accepts the mix and reports it only from the checker).
 * The first offending operator in source order fails. */
export function earlyShortCircuitMixFailure(sourceFile: ts.SourceFile): FunctionStaticSemanticsFailure | null {
    const logical = (node: ts.Node): boolean => ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken);
    const coalesce = (node: ts.Node): boolean => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken;
    const worklist: ts.Node[] = [sourceFile];
    let failure: FunctionStaticSemanticsFailure | null = null;
    while (worklist.length) {
        const node = worklist.pop()!;
        if (ts.isBinaryExpression(node)) {
            const mixed = coalesce(node) ? [node.left, node.right].find(logical) : logical(node) ? [node.left, node.right].find(coalesce) : undefined;
            if (mixed && (!failure || mixed.getStart() < failure.node.getStart())) {
                failure = { node: node.operatorToken, message: "Cannot mix '??' with '||' or '&&' without parentheses" };
            }
        }
        pushChildren(worklist, node);
    }
    return failure;
}
