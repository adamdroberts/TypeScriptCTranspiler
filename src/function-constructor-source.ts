import ts from "typescript";
import { createEcmaSourceFile } from "./ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "./control-static-semantics";
import { earlyFunctionStaticSemanticsFailure } from "./function-static-semantics";
import { staticStringExpressionTexts } from "./module-specifiers";

/** CreateDynamicFunction's joined FormalParameters and FunctionBody. Argument
 * boundaries do not survive the specified comma join, so this is also the
 * canonical dispatch key, independent of argument or statement cardinality. */
export interface FunctionConstructorSource {
    readonly kind?: DynamicFunctionKind;
    readonly parameters: string;
    readonly body: string;
}

export type DynamicFunctionKind = "ordinary" | "generator" | "async" | "async-generator";
const functionPrefixes: Record<DynamicFunctionKind, string> = {
    ordinary: "function", generator: "function*", async: "async function", "async-generator": "async function*",
};
export function functionConstructorRuntimeKind(kind: DynamicFunctionKind = "ordinary"): string {
    return `TSC_DYNAMIC_FUNCTION_${kind.toUpperCase().replaceAll("-", "_")}`;
}
export function functionKindForDeclaration(node: ts.Node): DynamicFunctionKind {
    const asynchronous = (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [])
        .some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
    const generator = "asteriskToken" in node && !!node.asteriskToken;
    return generator ? asynchronous ? "async-generator" : "generator" : asynchronous ? "async" : "ordinary";
}

export interface FunctionConstructorEntry extends FunctionConstructorSource {
    /** Invalid source is retained for an actual runtime SyntaxError. */
    readonly entry: string | null;
}

export function functionConstructorSourceKey(source: FunctionConstructorSource): string {
    return JSON.stringify([source.kind ?? "ordinary", source.parameters, source.body]);
}

export function functionConstructorExpressionSource(source: FunctionConstructorSource): string {
    // An anonymous expression deliberately has no named-function binding.
    // SetFunctionName("anonymous") happens after its ordinary creation.
    return `(${functionPrefixes[source.kind ?? "ordinary"]}(${source.parameters}\n) {\n${source.body}\n});`;
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
    const bodyStart = `(${functionPrefixes[source.kind ?? "ordinary"]}(${source.parameters}\n) `.length;
    if (expression.body.getStart(file) !== bodyStart || expression.end !== text.length - 2) return null;
    return file;
}

export function functionConstructorSourceIsValid(source: FunctionConstructorSource): boolean {
    // Parse parameters and body independently before the combined expression;
    // comments or delimiters in one input cannot consume the other input.
    if (!parseFunctionExpression({ kind: source.kind, parameters: source.parameters, body: "" }) ||
        !parseFunctionExpression({ kind: source.kind, parameters: "", body: source.body })) return false;
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

type SourceDomain = "callable" | "prototype" | "constructor" | "instance";
type SourceFact = `${SourceDomain}:${DynamicFunctionKind}`;
interface SourceFactNode {
    readonly expression: ts.Expression;
    readonly dependencies: SourceFactNode[];
    readonly parents: Set<SourceFactNode>;
    readonly facts: Set<SourceFact>;
}
function ambientReference(expression: ts.Expression, name: string, checker: ts.TypeChecker): boolean {
    expression = unwrap(expression);
    while (ts.isPropertyAccessExpression(expression) && expression.name.text === name) {
        expression = unwrap(expression.expression); name = "globalThis";
    }
    return ts.isIdentifier(expression) && expression.text === name &&
        (checker.getSymbolAtLocation(expression)?.declarations ?? []).every(declaration =>
            declaration.getSourceFile().isDeclarationFile || ts.isIdentifier(declaration) || ts.isPropertyAccessExpression(declaration));
}
function propertyName(expression: ts.Expression): string | null {
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
    if (ts.isElementAccessExpression(expression) && expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression))
        return expression.argumentExpression.text;
    return null;
}

/** One monotone value-fact graph closes alias and prototype dependencies.
 * Source discovery is an over-approximation; actual mutable lookup and kind
 * selection still occur at the runtime call boundary. */
class ConstructorSourceFacts {
    private readonly nodes = new Map<ts.Expression, SourceFactNode>();
    private readonly definitions = new Map<ts.Symbol, Set<ts.Expression>>();
    private readonly checker: ts.TypeChecker;
    constructor(program: ts.Program) {
        this.checker = program.getTypeChecker();
        for (const file of program.getSourceFiles()) {
            if (file.isDeclarationFile) continue;
            const worklist: ts.Node[] = [file];
            while (worklist.length) {
                const node = worklist.pop()!;
                const target = ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer ? node.name :
                    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) ? node.left : null;
                const value = ts.isVariableDeclaration(node) ? node.initializer : ts.isBinaryExpression(node) ? node.right : undefined;
                const symbol = target && this.checker.getSymbolAtLocation(target);
                if (symbol && value) {
                    let definitions = this.definitions.get(symbol);
                    if (!definitions) { definitions = new Set(); this.definitions.set(symbol, definitions); }
                    definitions.add(value);
                }
                node.forEachChild(child => { worklist.push(child); });
            }
        }
    }
    private dependencies(expression: ts.Expression): ts.Expression[] {
        if (ts.isIdentifier(expression)) {
            let symbol = this.checker.getSymbolAtLocation(expression);
            if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker.getAliasedSymbol(symbol);
            return symbol ? [...this.definitions.get(symbol) ?? []] : [];
        }
        if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) return [expression.expression];
        if (ts.isConditionalExpression(expression)) return [expression.whenTrue, expression.whenFalse];
        if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.CommaToken, ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind))
            return expression.operatorToken.kind === ts.SyntaxKind.CommaToken ? [expression.right] : [expression.left, expression.right];
        if (ts.isCallExpression(expression) && propertyName(expression.expression) === "getPrototypeOf") {
            const target = expression.expression;
            if ((ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) &&
                ["Object", "Reflect"].some(name => ambientReference(target.expression, name, this.checker)))
                return expression.arguments[0] ? [expression.arguments[0]] : [];
        }
        return [];
    }
    private derived(node: SourceFactNode): SourceFact[] {
        const expression = node.expression;
        const result: SourceFact[] = ambientReference(expression, "Function", this.checker) ? ["constructor:ordinary"] : [];
        let declaration: ts.Node | undefined = expression;
        if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
            let symbol = this.checker.getSymbolAtLocation(expression);
            if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker.getAliasedSymbol(symbol);
            declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
        }
        if (declaration && (ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration) ||
            ts.isArrowFunction(declaration) || ts.isMethodDeclaration(declaration)))
            result.push(`callable:${functionKindForDeclaration(declaration)}`);
        const input = node.dependencies.flatMap(dependency => [...dependency.facts]);
        const name = propertyName(expression);
        for (const fact of input) {
            const [domain, kind] = fact.split(":") as [SourceDomain, DynamicFunctionKind];
            if (name === "constructor") {
                if (domain === "callable" || domain === "prototype") result.push(`constructor:${kind}`);
                if (domain === "instance") result.push(`${kind === "ordinary" ? "callable" : "prototype"}:${kind}`);
            } else if (name === "prototype") {
                if (domain === "constructor") result.push(`prototype:${kind}`);
                else if ((domain === "callable" && kind !== "async") || (domain === "prototype" && kind.includes("generator"))) result.push(`instance:${kind}`);
            } else if (ts.isCallExpression(expression)) {
                if (domain === "callable") result.push(`prototype:${kind}`);
                else if (domain === "constructor") result.push(kind === "ordinary" ? "prototype:ordinary" : "constructor:ordinary");
                else if (domain === "prototype" && kind !== "ordinary") result.push("prototype:ordinary");
            } else if (name === null && !ts.isCallExpression(expression) &&
                !ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) result.push(fact);
        }
        return result;
    }
    kinds(expression: ts.Expression): DynamicFunctionKind[] {
        expression = unwrap(expression);
        const pending = [expression], added: SourceFactNode[] = [];
        while (pending.length) {
            const current = unwrap(pending.pop()!);
            if (this.nodes.has(current)) continue;
            const node: SourceFactNode = { expression: current, dependencies: [], parents: new Set(), facts: new Set() };
            this.nodes.set(current, node); added.push(node); pending.push(...this.dependencies(current));
        }
        for (const node of added) for (const dependency of this.dependencies(node.expression)) {
            const child = this.nodes.get(unwrap(dependency))!;
            node.dependencies.push(child); child.parents.add(node);
        }
        const worklist = [...added], queued = new Set(worklist);
        while (worklist.length) {
            const node = worklist.pop()!; queued.delete(node);
            let changed = false;
            for (const fact of this.derived(node)) if (!node.facts.has(fact)) { node.facts.add(fact); changed = true; }
            if (changed) for (const parent of node.parents) if (!queued.has(parent)) { queued.add(parent); worklist.push(parent); }
        }
        return [...this.nodes.get(expression)!.facts].filter(fact => fact.startsWith("constructor:"))
            .map(fact => fact.slice("constructor:".length) as DynamicFunctionKind);
    }
}

function constructorCall(node: ts.Node, facts: ConstructorSourceFacts): { kinds: DynamicFunctionKind[]; args: readonly ts.Expression[] } | null {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return null;
    const callee = unwrap(node.expression), args = node.arguments ?? [];
    let kinds = facts.kinds(callee);
    if (kinds.length) return { kinds, args };
    if (!ts.isCallExpression(node) || (!ts.isPropertyAccessExpression(callee) && !ts.isElementAccessExpression(callee))) return null;
    const name = propertyName(callee);
    kinds = facts.kinds(callee.expression);
    if (kinds.length) {
        if (name === "call") return { kinds, args: args.slice(1) };
        if (name === "apply") {
            const list = args[1] && unwrap(args[1]);
            return list && ts.isArrayLiteralExpression(list) ? { kinds, args: list.elements.filter(ts.isExpression) } : null;
        }
    }
    if (ts.isIdentifier(callee.expression) && callee.expression.text === "Reflect" && (name === "construct" || name === "apply") && args[0]) {
        kinds = facts.kinds(args[0]);
        const list = args[name === "apply" ? 2 : 1], unwrapped = list && unwrap(list);
        return kinds.length && unwrapped && ts.isArrayLiteralExpression(unwrapped) ? { kinds, args: unwrapped.elements.filter(ts.isExpression) } : null;
    }
    return null;
}

export function finiteFunctionConstructorSources(
    program: ts.Program, manifest: readonly FunctionConstructorSource[],
): FunctionConstructorSource[] {
    const sources = new Map(manifest.map(source => [functionConstructorSourceKey(source), source]));
    const facts = new ConstructorSourceFacts(program);
    for (const file of program.getSourceFiles()) {
        if (file.isDeclarationFile) continue;
        const worklist: ts.Node[] = [file];
        while (worklist.length) {
            const node = worklist.pop()!;
            const call = constructorCall(node, facts);
            if (call) {
                const { args, kinds } = call;
                const choices = args.map(argument => ts.isSpreadElement(argument)
                    ? [] : staticStringExpressionTexts(argument));
                let tuples: string[][] = [[]];
                for (const choice of choices) {
                    tuples = tuples.flatMap(tuple => choice.map(value => [...tuple, value]));
                }
                for (const kind of kinds) for (const tuple of tuples) {
                    const source = { kind, parameters: tuple.slice(0, -1).join(","), body: tuple.at(-1) ?? "" };
                    sources.set(functionConstructorSourceKey(source), source);
                }
                // A dynamic body can use the existing body-only manifest with
                // statically known parameters, through the same source graph.
                if (choices.length && choices.at(-1)!.length === 0) {
                    let parameters: string[][] = [[]];
                    for (const choice of choices.slice(0, -1)) {
                        parameters = parameters.flatMap(prefix => choice.map(value => [...prefix, value]));
                    }
                    for (const kind of kinds) for (const parameterTuple of parameters) for (const body of manifest) {
                        if (body.parameters !== "" || body.kind && body.kind !== kind) continue;
                        const source = { kind, parameters: parameterTuple.join(","), body: body.body };
                        sources.set(functionConstructorSourceKey(source), source);
                    }
                }
            }
            node.forEachChild(child => { worklist.push(child); });
        }
    }
    return [...sources.values()];
}
