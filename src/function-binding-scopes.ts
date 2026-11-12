import ts from "typescript";
import { annexBBlockFunctions, bindingIdentifiers, lexicalLoopHeadContainsName, type NamedFunctionDeclaration } from "./annex-b-functions";
import { ecmaParseGoal } from "./ecmascript-source";
import { isStrictCodeContext } from "./function-static-semantics";

/* ECMAScript scoping for a name a FunctionDeclaration binds. The checker's
 * symbols do not follow it there: a sloppy block's function declarations
 * are hoisted into the enclosing function's symbol and merged with every
 * other block's, a var and a function of one var scope get separate
 * symbols, and only the first of several function declarations is the
 * symbol's value. ECMAScript gives each block its own lexical binding for
 * the functions it declares (the last one is its value), and each var scope
 * one binding shared by its parameters, var declarations, top-level function
 * declarations (the last one is its initial value) and, in sloppy code, the
 * B.3.2.1 block functions, which store their block's binding into it when
 * they are evaluated. This module answers one static question for a
 * reference: which of those bindings it denotes. Every other declaration (a
 * let, const or class, a catch parameter, a lexical loop head, a function or
 * class expression's own name, a TypeScript namespace) keeps the checker's
 * symbol. */

export type FunctionVarScope = ts.SourceFile | ts.FunctionLikeDeclaration | ts.ClassStaticBlockDeclaration;
export type FunctionBindingScope =
    | {
        readonly kind: "lexical";
        /** A Block, a CaseBlock, or (B.3.3) the FunctionDeclaration an if clause holds. */
        readonly scope: ts.Node;
        readonly name: string;
        readonly functions: readonly NamedFunctionDeclaration[];
    }
    | {
        readonly kind: "var";
        readonly scope: FunctionVarScope;
        readonly name: string;
        readonly parameters: readonly ts.Identifier[];
        readonly variables: readonly ts.Identifier[];
        readonly functions: readonly NamedFunctionDeclaration[];
        readonly annexB: readonly NamedFunctionDeclaration[];
    };

interface VarScopeIndex {
    readonly parameters: Map<string, ts.Identifier[]>;
    readonly variables: Map<string, ts.Identifier[]>;
    readonly functions: Map<string, NamedFunctionDeclaration[]>;
    readonly lexical: Set<string>;
    readonly annexB: Map<string, NamedFunctionDeclaration[]>;
}
interface BlockIndex {
    readonly functions: Map<string, NamedFunctionDeclaration[]>;
    readonly other: Set<string>;
}

function push<T>(map: Map<string, T[]>, name: string, value: T): void {
    const values = map.get(name);
    if (values) values.push(value); else map.set(name, [value]);
}

function unlabeled(statement: ts.Statement): ts.Statement {
    while (ts.isLabeledStatement(statement)) statement = statement.statement;
    return statement;
}

function namedFunction(node: ts.Node): node is NamedFunctionDeclaration {
    return ts.isFunctionDeclaration(node) && !!node.name && !!node.body;
}

function isVarScope(node: ts.Node): node is FunctionVarScope {
    return ts.isSourceFile(node) || ts.isClassStaticBlockDeclaration(node) || ts.isFunctionLike(node) && "body" in node && !!node.body;
}

function varScopeBody(scope: FunctionVarScope): ts.Node | undefined {
    return ts.isSourceFile(scope) ? scope : scope.body;
}

const varScopeIndexes = new WeakMap<ts.Node, VarScopeIndex>();
function varScopeIndex(scope: FunctionVarScope): VarScopeIndex {
    const cached = varScopeIndexes.get(scope);
    if (cached) return cached;
    const index: VarScopeIndex = { parameters: new Map(), variables: new Map(), functions: new Map(), lexical: new Set(), annexB: new Map() };
    if (!ts.isSourceFile(scope) && !ts.isClassStaticBlockDeclaration(scope))
        for (const parameter of scope.parameters) for (const name of bindingIdentifiers(parameter.name)) push(index.parameters, name.text, name);
    const body = varScopeBody(scope);
    if (body && (ts.isSourceFile(body) || ts.isBlock(body))) {
        for (const source of body.statements) {
            const statement = unlabeled(source);
            if (namedFunction(statement)) push(index.functions, statement.name.text, statement);
            else if (ts.isClassDeclaration(statement) && statement.name) index.lexical.add(statement.name.text);
            else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped)
                for (const declaration of statement.declarationList.declarations)
                    for (const name of bindingIdentifiers(declaration.name)) index.lexical.add(name.text);
        }
        // VarDeclaredNames: every var of the body outside nested functions and classes.
        const worklist: ts.Node[] = [...body.statements];
        while (worklist.length) {
            const current = worklist.pop()!;
            if (ts.isFunctionLike(current) || ts.isClassLike(current) || ts.isClassStaticBlockDeclaration(current)) continue;
            if (ts.isVariableDeclarationList(current) && !(current.flags & ts.NodeFlags.BlockScoped))
                for (const declaration of current.declarations)
                    for (const name of bindingIdentifiers(declaration.name)) push(index.variables, name.text, name);
            ts.forEachChild(current, child => { worklist.push(child); });
        }
        const sloppy = !isStrictCodeContext(ts.isSourceFile(scope) ? scope : body) && !(ts.isSourceFile(scope) && ecmaParseGoal(scope) !== "script");
        if (sloppy && !ts.isClassStaticBlockDeclaration(scope))
            for (const declaration of annexBBlockFunctions(scope)) push(index.annexB, declaration.name.text, declaration);
    }
    varScopeIndexes.set(scope, index);
    return index;
}

const blockIndexes = new WeakMap<ts.Node, BlockIndex>();
function blockIndex(scope: ts.Block | ts.CaseBlock): BlockIndex {
    const cached = blockIndexes.get(scope);
    if (cached) return cached;
    const index: BlockIndex = { functions: new Map(), other: new Set() };
    const statements = ts.isBlock(scope) ? scope.statements : scope.clauses.flatMap(clause => [...clause.statements]);
    for (const source of statements) {
        const statement = unlabeled(source);
        if (namedFunction(statement)) push(index.functions, statement.name.text, statement);
        else if (ts.isClassDeclaration(statement) && statement.name) index.other.add(statement.name.text);
        else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped)
            for (const declaration of statement.declarationList.declarations)
                for (const name of bindingIdentifiers(declaration.name)) index.other.add(name.text);
    }
    blockIndexes.set(scope, index);
    return index;
}

/** The binding a var scope gives `name`, when a function declaration takes
 * part in it; null when the scope's binding is another kind (the checker's
 * symbol); undefined when the scope does not declare the name. Parameter
 * expressions see only the parameters. */
export function functionVarBinding(scope: FunctionVarScope, name: string, parametersOnly = false): FunctionBindingScope | null | undefined {
    const index = varScopeIndex(scope);
    const parameters = index.parameters.get(name) ?? [];
    if (parametersOnly) return parameters.length ? functionVarBinding(scope, name) : undefined;
    if (index.lexical.has(name)) return null;
    const variables = index.variables.get(name) ?? [], functions = index.functions.get(name) ?? [], annexB = index.annexB.get(name) ?? [];
    if (!parameters.length && !variables.length && !functions.length && !annexB.length) return undefined;
    if (!functions.length && !annexB.length) return null;
    return { kind: "var", scope, name, parameters, variables, functions, annexB };
}

const bindingNames = new WeakMap<ts.SourceFile, ReadonlySet<string>>();
/** Names whose binding the checker's symbols may not follow: a block-level
 * function declaration's, a top-level one's that its var scope also
 * declares by another function, a var or a parameter, or one in a function
 * whose parameter expressions cannot see it. */
export function functionBindingNames(file: ts.SourceFile): ReadonlySet<string> {
    const cached = bindingNames.get(file);
    if (cached) return cached;
    const names = new Set<string>();
    const worklist: ts.Node[] = [file];
    while (worklist.length) {
        const current = worklist.pop()!;
        if (namedFunction(current)) {
            const parent = current.parent;
            const scope = ts.isSourceFile(parent) ? parent : ts.isBlock(parent) && isVarScope(parent.parent) && varScopeBody(parent.parent) === parent ? parent.parent : undefined;
            if (!scope) names.add(current.name.text);
            else {
                const index = varScopeIndex(scope), name = current.name.text;
                const count = (index.functions.get(name)?.length ?? 0) + (index.variables.get(name)?.length ?? 0) + (index.parameters.get(name)?.length ?? 0);
                const parameterExpressions = !ts.isSourceFile(scope) && !ts.isClassStaticBlockDeclaration(scope) &&
                    scope.parameters.some(parameter => !!parameter.initializer || !ts.isIdentifier(parameter.name));
                if (count > 1 || parameterExpressions) names.add(name);
            }
        }
        ts.forEachChild(current, child => { worklist.push(child); });
    }
    bindingNames.set(file, names);
    return names;
}

/** An identifier that names a property, member, label or import/export
 * name rather than referencing a binding. */
function nonReference(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (!parent) return true;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node || ts.isQualifiedName(parent) && parent.right === node) return true;
    if ((ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) ||
        ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent) || ts.isPropertySignature(parent) ||
        ts.isMethodSignature(parent) || ts.isEnumMember(parent) || ts.isMetaProperty(parent)) && parent.name === node) return true;
    if ((ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent)) && parent.label === node) return true;
    if ((ts.isBindingElement(parent) || ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) && parent.propertyName === node) return true;
    return false;
}

/** The binding a reference to `node` denotes when a function declaration
 * takes part in it, or null when the checker's symbol is that binding. */
export function functionBindingScope(node: ts.Identifier): FunctionBindingScope | null {
    const name = node.text;
    if (!functionBindingNames(node.getSourceFile()).has(name) || nonReference(node)) return null;
    let child: ts.Node = node;
    for (let scope: ts.Node | undefined = node.parent; scope; child = scope, scope = scope.parent) {
        if (ts.isModuleBlock(scope) || ts.isModuleDeclaration(scope)) return null;
        if (isVarScope(scope)) {
            // A declaration's own name is bound outside it; a function
            // expression's own name is bound between it and its body.
            if (ts.isFunctionDeclaration(scope) && child === scope.name) continue;
            if (ts.isFunctionExpression(scope) && child === scope.name) return null;
            const found = functionVarBinding(scope, name, ts.isParameter(child));
            if (found !== undefined) return found;
            if (ts.isFunctionExpression(scope) && scope.name?.text === name) return null;
            if (ts.isSourceFile(scope)) return null;
            continue;
        }
        if (ts.isClassLike(scope)) { if (scope.name?.text === name && child !== scope.name) return null; continue; }
        if (ts.isCatchClause(scope)) {
            if (scope.variableDeclaration && bindingIdentifiers(scope.variableDeclaration.name).some(bound => bound.text === name)) return null;
            continue;
        }
        if (lexicalLoopHeadContainsName(scope, name)) return null;
        if (ts.isIfStatement(scope) && (child === scope.thenStatement || child === scope.elseStatement) && namedFunction(child) && child.name.text === name)
            return { kind: "lexical", scope: child, name, functions: [child] };
        if (ts.isBlock(scope) && !(isVarScope(scope.parent) && varScopeBody(scope.parent) === scope) || ts.isCaseBlock(scope)) {
            const index = blockIndex(scope);
            if (index.other.has(name)) return null;
            const functions = index.functions.get(name);
            if (functions) return { kind: "lexical", scope, name, functions };
        }
    }
    return null;
}
