import ts from "typescript";
import { createEcmaSourceFile } from "./ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "./control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "./function-static-semantics";
import { staticStringExpressionTexts } from "./module-specifiers";

/** CreateDynamicFunction's joined FormalParameters and FunctionBody. Argument
 * boundaries do not survive the specified comma join, so this is also the
 * canonical dispatch key, independent of argument or statement cardinality. */
export interface FunctionConstructorSource {
    readonly parameters: string;
    readonly body: string;
}

export interface FunctionConstructorEntry extends FunctionConstructorSource {
    /** Invalid source is retained for an actual runtime SyntaxError. */
    readonly entry: string | null;
}

export function functionConstructorSourceKey(source: FunctionConstructorSource): string {
    return JSON.stringify([source.parameters, source.body]);
}

export function functionConstructorExpressionSource(source: FunctionConstructorSource): string {
    // An anonymous expression deliberately has no named-function binding.
    // SetFunctionName("anonymous") happens after its ordinary creation.
    return `(function(${source.parameters}\n) {\n${source.body}\n});`;
}

function parseFunctionExpression(source: FunctionConstructorSource): ts.SourceFile | null {
    const text = functionConstructorExpressionSource(source);
    const file = createEcmaSourceFile("function-source.js", text, ts.ScriptTarget.ESNext,
        true, ts.ScriptKind.JS, "script");
    if ((file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics?.length) return null;
    const statement = file.statements[0];
    if (file.statements.length !== 1 || !statement || !ts.isExpressionStatement(statement) ||
        !ts.isParenthesizedExpression(statement.expression) ||
        !ts.isFunctionExpression(statement.expression.expression)) return null;
    const expression = statement.expression.expression;
    const bodyStart = `(function(${source.parameters}\n) `.length;
    if (expression.body.getStart(file) !== bodyStart || expression.end !== text.length - 2) return null;
    return file;
}

export function functionConstructorSourceIsValid(source: FunctionConstructorSource): boolean {
    // Parse parameters and body independently before the combined expression;
    // comments or delimiters in one input cannot consume the other input.
    if (!parseFunctionExpression({ parameters: source.parameters, body: "" }) ||
        !parseFunctionExpression({ parameters: "", body: source.body })) return false;
    const file = parseFunctionExpression(source);
    return !!file && !earlyControlFlowStaticSemanticsFailure(file) &&
        !earlyFunctionStaticSemanticsFailure(file);
}

function unwrap(expression: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression) ||
        ts.isSatisfiesExpression(expression)) expression = expression.expression;
    return expression;
}

export function isFunctionConstructorReference(
    expression: ts.Expression, checker: ts.TypeChecker, seen = new Set<ts.Symbol>(),
): boolean {
    expression = unwrap(expression);
    if (ts.isPropertyAccessExpression(expression) && expression.name.text === "Function") {
        const owner = unwrap(expression.expression);
        return ts.isIdentifier(owner) && owner.text === "globalThis" &&
            !(checker.getSymbolAtLocation(owner)?.declarations ?? [])
                .some(declaration => !declaration.getSourceFile().isDeclarationFile);
    }
    if (!ts.isIdentifier(expression)) return false;
    const symbol = checker.getSymbolAtLocation(expression);
    const declarations = symbol?.declarations ?? [];
    if (expression.text === "Function" && declarations.every(declaration =>
        declaration.getSourceFile().isDeclarationFile || ts.isIdentifier(declaration) ||
        ts.isPropertyAccessExpression(declaration))) return true;
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    const declaration = symbol.valueDeclaration ?? declarations[0];
    return !!declaration && ts.isVariableDeclaration(declaration) && !!declaration.initializer &&
        (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
        isFunctionConstructorReference(declaration.initializer, checker, seen);
}

function constructorArguments(node: ts.Node, checker: ts.TypeChecker): readonly ts.Expression[] | null {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return null;
    const callee = unwrap(node.expression), args = node.arguments ?? [];
    if (isFunctionConstructorReference(callee, checker)) return args;
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(callee)) return null;
    if (isFunctionConstructorReference(callee.expression, checker)) {
        if (callee.name.text === "call") return args.slice(1);
        if (callee.name.text === "apply") {
            const list = args[1] && unwrap(args[1]);
            return list && ts.isArrayLiteralExpression(list) ? list.elements.filter(ts.isExpression) : null;
        }
    }
    if (ts.isIdentifier(callee.expression) && callee.expression.text === "Reflect" &&
        (callee.name.text === "construct" || callee.name.text === "apply") &&
        args[0] && isFunctionConstructorReference(args[0], checker)) {
        const list = args[callee.name.text === "apply" ? 2 : 1];
        const unwrapped = list && unwrap(list);
        return unwrapped && ts.isArrayLiteralExpression(unwrapped)
            ? unwrapped.elements.filter(ts.isExpression) : null;
    }
    return null;
}

export function finiteFunctionConstructorSources(
    program: ts.Program, manifest: readonly FunctionConstructorSource[],
): FunctionConstructorSource[] {
    const sources = new Map(manifest.map(source => [functionConstructorSourceKey(source), source]));
    const checker = program.getTypeChecker();
    for (const file of program.getSourceFiles()) {
        if (file.isDeclarationFile) continue;
        const worklist: ts.Node[] = [file];
        while (worklist.length) {
            const node = worklist.pop()!;
            const args = constructorArguments(node, checker);
            if (args) {
                const choices = args.map(argument => ts.isSpreadElement(argument)
                    ? [] : staticStringExpressionTexts(argument));
                let tuples: string[][] = [[]];
                for (const choice of choices) {
                    tuples = tuples.flatMap(tuple => choice.map(value => [...tuple, value]));
                }
                for (const tuple of tuples) {
                    const source = { parameters: tuple.slice(0, -1).join(","), body: tuple.at(-1) ?? "" };
                    sources.set(functionConstructorSourceKey(source), source);
                }
                // A dynamic body can use the existing body-only manifest with
                // statically known parameters, through the same source graph.
                if (choices.length && choices.at(-1)!.length === 0) {
                    let parameters: string[][] = [[]];
                    for (const choice of choices.slice(0, -1)) {
                        parameters = parameters.flatMap(prefix => choice.map(value => [...prefix, value]));
                    }
                    for (const parameterTuple of parameters) for (const body of manifest) {
                        if (body.parameters !== "") continue;
                        const source = { parameters: parameterTuple.join(","), body: body.body };
                        sources.set(functionConstructorSourceKey(source), source);
                    }
                }
            }
            node.forEachChild(child => { worklist.push(child); });
        }
    }
    return [...sources.values()];
}
