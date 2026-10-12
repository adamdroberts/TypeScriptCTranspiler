import {sourceNumericOperation, type SourceNumericOperation, type SourcePrimitive} from "./source-numeric-operations";
import ts from "typescript";
import { callableSourceText } from "./callable-source-text";
import { normalizeAssignmentTarget } from "./emit/binding-tree";
import { callableNameInput, expectedArgumentCount, functionBodyCompletions, type FunctionBodyCompletions, NAME_EVALUATING_ASSIGNMENTS } from "./function-static-semantics";
import {consoleOperations} from "./console-operations";
import * as path from "node:path";
import { staticStringExpressionTexts } from "./module-specifiers";
import { functionKindForDeclaration, functionConstructorDisplaySource, type DynamicFunctionKind, type FunctionConstructorEntry } from "./function-constructor-source";

import {declarativeSourceBindingSymbol, sourceDeclarationIntroducesBinding} from "./source-bindings";
import {runtimeGlobalBindings, runtimeObjectPrototypeMethods, runtimeWellKnownSymbolDescriptions, type RuntimeGlobalBinding} from "./global-bindings";

export interface SourceValueGraphEntries {
    readonly functions?: readonly FunctionConstructorEntry[];
    readonly evaluations?: readonly { readonly source: string; readonly entry: string | null }[];
}
export interface ConstructorInvocation {
    readonly kind: DynamicFunctionKind;
    /** Null means that the actual List cannot be proved finite. The explicit
     * registry remains available; runtime selection still fails closed. */
    readonly choices: readonly (readonly string[])[] | null;
}
export interface EvaluationInvocation {
    readonly node: ts.Node;
    readonly operation: "eval" | "eval-script" | "agent-start";
    readonly direct: boolean;
    /** Eval retains non-String values; evalScript converts primitives to text.
     * Null keeps the existing unknown-source diagnostic/registry boundary. */
    readonly choices: readonly string[] | null;
}

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction |
    ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration | ts.ConstructorDeclaration;
type CallableDefinition = FunctionNode | ts.ClassDeclaration | ts.ClassExpression;
type Domain = "constructor" | "prototype" | "instance";
type Operation = "prototype" | "eval" | "eval-script" | "agent-start" | "realm" | "host-print" | "host-gc" | "call" | "apply" | "bind" | "reflect-apply" | "construct" |
    "define-property" | "define-properties" | "set-property" | "delete-property" | "own-descriptor" | "own-descriptors" | "function-text" | "symbol-for" | "symbol-key-for";
type Primitive = SourcePrimitive;
type SourcePropertyKey = string | symbol;
type PrimitiveHint = "string" | "number" | "default";
const ORDINARY_PRIMITIVE_METHODS: ReadonlyMap<PrimitiveHint, readonly string[]> = new Map([
    ["string", ["toString", "valueOf"]], ["number", ["valueOf", "toString"]], ["default", ["valueOf", "toString"]],
]);
const NUMERIC_CONVERSIONS: ReadonlyMap<string, (value: Primitive) => Primitive> = new Map([
    ["Number", (value: Primitive) => Number(value)],
    ["BigInt", (value: Primitive) => BigInt(value as string | number | bigint | boolean)],
    ["numeric", (value: Primitive) => typeof value === "bigint" ? value : Number(value)],
]);
interface PrimitiveChoiceProof {
    readonly values: readonly Primitive[];
    readonly primitiveComplete: boolean;
    readonly textComplete: boolean;
}
interface PrimitiveReadiness {pending:boolean; pendingSource:boolean; unresolved:boolean; scalarUnresolved:boolean;}
interface ListPart { readonly cell: Cell; readonly spread: boolean; }
type Atom =
    | { readonly tag: "builtin"; readonly name: string; readonly normalResult: NonNullable<RuntimeGlobalBinding["normalResult"]>; readonly fields: ObjectOwner }
    | { readonly tag: "intrinsic"; readonly domain: Domain; readonly kind: DynamicFunctionKind }
    | { readonly tag: "function"; readonly owner: FunctionOwner }
    | { readonly tag: "object"; readonly owner: ObjectOwner }
    | { readonly tag: "operation"; readonly operation: Operation }
    | { readonly tag: "bound"; readonly target: Cell; readonly receiver: Cell; readonly prefix: readonly Cell[] | null; readonly fields: ObjectOwner }
    | { readonly tag: "primitive"; readonly value: Primitive }
    | { readonly tag: "non-string" }
    | { readonly tag: "unknown-string" }
    | { readonly tag: "abrupt" }
    | { readonly tag: "pending-source" }
    | { readonly tag: "descriptor"; readonly identity: object }
    | { readonly tag: "unknown"; readonly origin?: ts.Node }
    | { readonly tag: "opaque-object" }
    | { readonly tag: "text-operation"; readonly operation: "numeric" | "template" | "bound-name" | "prefix" | "coerce"; readonly numeric?: SourceNumericOperation; readonly conversion?: string; readonly operator?: ts.PrefixUnaryOperator; readonly parts: readonly Cell[] }
    | { readonly tag: "promise"; readonly value: Cell; readonly rejection: Cell }
    | { readonly tag: "generator"; readonly owner: FunctionOwner }
    | { readonly tag: "global" } | { readonly tag: "host" } | { readonly tag: "agent" } | { readonly tag: "realm-record" };
class SourceFacts extends Set<Atom> {
    readonly sources = new Set<SourceFacts>();
    override *[Symbol.iterator](): SetIterator<Atom> {
        const pending:SourceFacts[] = [this], visited = new Set<SourceFacts>(), values = new Set<Atom>();
        while (pending.length) {
            const facts = pending.pop()!;
            if (visited.has(facts)) continue; visited.add(facts);
            for (const value of Set.prototype.values.call(facts) as SetIterator<Atom>) if (!values.has(value)) {values.add(value); yield value;}
            for (const source of facts.sources) pending.push(source);
        }
    }
    override has(atom: Atom): boolean {
        const pending:SourceFacts[] = [this], visited = new Set<SourceFacts>();
        while (pending.length) {
            const facts = pending.pop()!;
            if (visited.has(facts)) continue; visited.add(facts);
            if (Set.prototype.has.call(facts,atom)) return true;
            for (const source of facts.sources) pending.push(source);
        }
        return false;
    }
    override get size(): number {let size=0; for (const _ of this) size++; return size;}
}
interface Cell { readonly id: number; readonly values: SourceFacts; readonly users: Set<Rule>; }
interface Rule { readonly inputs: Set<Cell>; readonly run: () => void; queued: boolean; }
interface ObjectOwner { readonly fields: Map<SourcePropertyKey, Cell>; readonly accessors: Map<SourcePropertyKey|null, {get:Cell;set:Cell}>; readonly shape: Cell; computedDefinitions?: {key:Cell;defined:Cell;context:ts.Node}[]; own?: Map<SourcePropertyKey, Cell>; listLength?: Cell; listSources?: readonly Cell[]; prototype?: Cell; }
interface FunctionOwner {
    readonly definition: CallableDefinition; readonly node: FunctionNode | null; readonly kind: DynamicFunctionKind; readonly fields: ObjectOwner;
    readonly returns: Cell; readonly throws: Cell; readonly receiver: Cell; readonly active: Cell; readonly sourceText: string;
    base?: Cell;
    completion?: FunctionBodyCompletions;
}
interface EvaluationRecord {
    readonly node: ts.Node; readonly operation: "eval" | "eval-script" | "agent-start";
    readonly direct: boolean; readonly source: Cell | null; readonly unknown: boolean;
}

const BOOLEAN_BINARY_RESULTS = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.InKeyword, ts.SyntaxKind.InstanceOfKeyword,
]);
// Initial intrinsic member identities, installed on their canonical owners.
// Source lookups and later writes use the ordinary field graph.
const INITIAL_SOURCE_OPERATIONS: ReadonlyMap<string, ReadonlyMap<string, Operation>> = new Map<string, ReadonlyMap<string, Operation>>([
    ["console", new Map([...consoleOperations].map(name=>[name,"host-print" as const]))],
    ["Object", new Map([["getPrototypeOf", "prototype"], ["defineProperty", "define-property"], ["defineProperties", "define-properties"],
        ["getOwnPropertyDescriptor", "own-descriptor"], ["getOwnPropertyDescriptors", "own-descriptors"]])],
    ["Reflect", new Map([["getPrototypeOf", "prototype"], ["apply", "reflect-apply"], ["construct", "construct"],
        ["defineProperty", "define-property"], ["set", "set-property"], ["deleteProperty", "delete-property"], ["getOwnPropertyDescriptor", "own-descriptor"]])],
]);
const PROPERTY_MUTATIONS = new Set<Operation>(["define-property", "define-properties", "set-property", "delete-property"]);
const CALLABLE_FORWARDING_OPERATIONS: ReadonlyMap<string, Operation> = new Map([
    ["call", "call"], ["apply", "apply"], ["bind", "bind"],
]);

function conversionOperands(node: ts.Node): readonly ts.Expression[] | null {
    if (ts.isComputedPropertyName(node)) return [node.expression];
    if (ts.isElementAccessExpression(node)) return [node.argumentExpression];
    const operation = sourceNumericOperation(node);
    if (operation) return ts.isBinaryExpression(node) ? [node.left, node.right] : [(node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression).operand];
    if (ts.isBinaryExpression(node) && BOOLEAN_BINARY_RESULTS.has(node.operatorToken.kind) &&
        node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken && node.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken)
        return [node.left, node.right];
    return null;
}

function unwrap(node: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
        ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
    return node;
}
function functionNode(node: ts.Node): node is FunctionNode {
    return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isConstructorDeclaration(node);
}
function callableDefinition(node: ts.Node): node is CallableDefinition {
    return functionNode(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node);
}
function propertyName(node: ts.Node | undefined): string | null {
    if (!node) return null;
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
    if (ts.isComputedPropertyName(node)) {
        const choices = staticStringExpressionTexts(node.expression);
        return choices.length === 1 ? choices[0]! : null;
    }
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (ts.isElementAccessExpression(node) && node.argumentExpression) {
        if (ts.isNumericLiteral(node.argumentExpression)) return String(Number(node.argumentExpression.text));
        const choices = staticStringExpressionTexts(node.argumentExpression);
        return choices.length === 1 ? choices[0]! : null;
    }
    return null;
}

/** One context-insensitive, monotone source-value graph. Cells represent source
 * values and binding/property locations; rules represent semantic projections.
 * All atoms are interned by source owner or intrinsic identity. Calls add edges
 * to actual formals/results, so recursion and aliases close the same worklist.
 * Property discovery never asks TypeScript to infer a receiver/member type. */
class SourceValueFlow {
    private readonly cells = new Map<ts.Node, Cell>();
    private readonly normalResults = new Map<Cell, Atom>();
    private readonly exceptionHandlers = new Map<ts.Node, Cell>();
    private readonly exceptionCells = new Set<Cell>();
    private readonly bindings = new Map<ts.Symbol, Cell>();
    private readonly globals = new Map<string, Cell>();
    private readonly objects = new Map<ts.Node, ObjectOwner>();
    private readonly functions = new Map<CallableDefinition, FunctionOwner>();
    private readonly copies = new Map<Cell, Set<Cell>>();
    private readonly queue: Rule[] = [];
    private queueCursor = 0;
    private readonly initializers: Array<{ node: ts.Node; result: Cell }> = [];
    private readonly accessorDefinitions = new Map<Cell,ts.Node>();
    private readonly accessorCallees = new Map<Cell,Cell>();
    private readonly accessorSlots = new Set<Cell>();
    private readonly callResults = new Map<ts.Node,Map<string,Cell>>();
    private readonly invocations = new Map<Rule, Map<string, { kind: DynamicFunctionKind; args: readonly Cell[] | null }>>();
    private readonly evaluationInvocations = new Map<Rule, Map<string, EvaluationRecord>>();
    private readonly intrinsicAtoms = new Map<string, Atom>();
    private readonly operations = new Map<Operation, Atom>();
    private readonly primitives = new Map<string, Atom>();
    private readonly symbolPrimitives = new Map<symbol, Atom>();
    private readonly symbolIdentities = new Map<symbol, number>();
    private readonly freshSymbols = new Set<symbol>();
    private readonly symbolAllocations = new Map<ts.Node, Map<string | undefined, symbol>>();
    private readonly symbolDescriptionInputs = new Map<Cell, Cell>();
    private readonly symbolRegistry = new Map<string, symbol>();
    private readonly wellKnownSymbols = new Map([...runtimeWellKnownSymbolDescriptions].map(([name, description]) => [name, Symbol(description)]));
    private readonly nonString: Atom = { tag: "non-string" };
    private readonly unknown: Atom = { tag: "unknown" };
    private readonly opaqueObject: Atom = { tag: "opaque-object" };
    private readonly abrupt: Atom = {tag:"abrupt"};
    private readonly pendingSource: Atom = {tag:"pending-source"};
    private readonly evaluations = new Map<string, Cell[]>();
    private readonly dynamicSourceTexts = new Map<FunctionNode, string>();
    private readonly callablePrototypes = new Map<DynamicFunctionKind, Cell>();
    private ordinaryObjectPrototype?: Cell;
    private globalOwner?: ObjectOwner;
    private readonly generated = new Map<DynamicFunctionKind, Cell[]>();
    private readonly global: Atom = { tag: "global" };
    private readonly host: Atom = { tag: "host" };
    private readonly agent: Atom = { tag: "agent" };
    private readonly realm: Atom = { tag: "realm-record" };
    private nextCell = 0;
    private readonly booleanResult = this.newCell();
    private readonly unknownString: Atom = {tag:"unknown-string"};
    private readonly opaqueMutation = this.newCell();
    private readonly opaqueEffects = new Map<ts.Node, Atom>();
    private readonly readCaptures = new Map<Cell, Map<ts.Node | undefined, Map<boolean, Cell>>>();
    private readonly empty = this.newCell();
    private readonly globalMutation = this.newCell();
    private readonly globalReceiver = this.newCell();
    private readonly propertyWrites = new Set<string>();
    private readonly hintPrimitives = new Map<Cell, Map<ts.Node | undefined, Map<PrimitiveHint, Cell>>>();
    private readonly stringConversions = new Map<Cell, Map<ts.Node, Map<boolean, Cell>>>();
    private readonly orderedConversions = new Map<ts.Node, Map<string, readonly Cell[]>>();
    private readonly numericConversions = new Map<Cell, Map<ts.Node, Map<string, Cell>>>();
    private readonly numericWrites = new Map<ts.Node, Cell>();
    private readonly primitiveProofCache = new Map<Cell, PrimitiveChoiceProof>();
    private readonly primitiveProofParents = new Map<Cell, Set<Cell>>();
    private readonly primitiveReadyCache = new Map<Cell, PrimitiveReadiness>();
    private readonly primitiveChanges = new Set<Cell>();
    private readonly hostOwners = new Map<"host" | "agent", ObjectOwner>();
    private readonly intrinsicOwners = new Map<Atom, ObjectOwner>();
    private readonly checker: ts.TypeChecker;
    private readonly invalidEvaluations = new Set<string>();
    constructor(program: ts.Program, entries: SourceValueGraphEntries) {
        this.checker = program.getTypeChecker();
        for (const entry of entries.evaluations ?? []) {
            if (entry.entry === null) {
                this.invalidEvaluations.add(entry.source);
                const completion = this.newCell(); this.publish(completion, this.abrupt);
                const values = this.evaluations.get(entry.source) ?? [];
                values.push(completion); this.evaluations.set(entry.source, values);
                continue;
            }
            const file = entry.entry ? program.getSourceFile(path.resolve(entry.entry)) : undefined;
            if (!file) continue;
            const completion = this.newCell();
            const worklist: ts.Node[] = [...file.statements];
            while (worklist.length) {
                const node = worklist.pop()!;
                if (functionNode(node) || ts.isClassLike(node)) continue;
                if (ts.isExpressionStatement(node)) this.copy(this.cell(node.expression), completion);
                else node.forEachChild(child => { worklist.push(child); });
            }
            const values = this.evaluations.get(entry.source) ?? [];
            values.push(completion); this.evaluations.set(entry.source, values);
        }
        for (const entry of entries.functions ?? []) {
            const file = entry.entry ? program.getSourceFile(path.resolve(entry.entry)) : undefined;
            const statement = file?.statements[0];
            if (!statement || !ts.isExpressionStatement(statement)) continue;
            const values = this.generated.get(entry.kind ?? "ordinary") ?? [];
            let definition: ts.Expression = statement.expression;
            while (ts.isParenthesizedExpression(definition)) definition = definition.expression;
            if (functionNode(definition)) this.dynamicSourceTexts.set(definition, functionConstructorDisplaySource(entry));
            values.push(this.cell(statement.expression)); this.generated.set(entry.kind ?? "ordinary", values);
        }
        for (const file of program.getSourceFiles()) {
            if (file.isDeclarationFile) continue;
            const worklist: Array<{node: ts.Node; handler: Cell | null}> = [{node: file, handler: null}];
            while (worklist.length) {
                const {node, handler} = worklist.pop()!;
                if ((ts.isStatement(node) || ts.isCatchClause(node)) && !ts.isFunctionDeclaration(node)) {
                    const activation = this.enclosingActivation(node);
                    if (activation?.completion && !activation.completion.reachable.has(node)) continue;
                }
                if (handler) this.exceptionHandlers.set(node, handler);
                if (ts.isTryStatement(node)) {
                    const caught = node.catchClause ? this.exceptionCell() : handler;
                    if (node.catchClause?.variableDeclaration && (!this.enclosingActivation(node)?.completion ||
                        this.enclosingActivation(node)!.completion!.reachable.has(node.catchClause))) this.bind(node.catchClause.variableDeclaration.name, caught!);
                    worklist.push({node: node.tryBlock, handler: caught});
                    if (node.catchClause) worklist.push({node: node.catchClause, handler});
                    if (node.finallyBlock) worklist.push({node: node.finallyBlock, handler});
                    continue;
                }
                if (ts.isThrowStatement(node) && handler) this.copy(this.cell(node.expression), handler);
                const operands = handler && !sourceNumericOperation(node) && conversionOperands(node);
                if (handler && operands) {
                    const propertyKey = ts.isComputedPropertyName(node) || ts.isElementAccessExpression(node);
                    const addition = ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken);
                    const raw = operands.map(operand => this.cell(operand));
                    const inputs = propertyKey ? this.convertList(raw, node, "string")
                        : addition ? this.convertList(raw, node, "default") : raw;
                    // Primitive conversion failures are Error objects. An
                    // opaque coercion can invoke user code and throw any value;
                    // it cannot disappear beside a known explicit throw.
                    let conversionRule!: Rule;
                    conversionRule = this.rule(inputs, () => {
                        const states = inputs.map(input => this.primitiveState(input, conversionRule, !propertyKey));
                        if (states.some(state => state.proof.primitiveComplete && !state.proof.values.length)) return;
                        for (const input of inputs) {
                            const state = this.primitiveState(input, conversionRule, !propertyKey);
                            if (state.unresolved) this.publish(handler, this.unknown);
                        }
                        if (states.some(state => state.pending)) return;
                        const plus = ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken);
                        const mixedBigInt = plus && states[0]!.proof.values.some(left => states[1]!.proof.values.some(right =>
                            typeof left !== "string" && typeof right !== "string" && (typeof left === "bigint") !== (typeof right === "bigint")));
                        const symbolConversion = !propertyKey && states.some(state => state.proof.values.some(value => typeof value === "symbol"));
                        if (states.some(state => !state.proof.primitiveComplete) || mixedBigInt || symbolConversion ||
                            !propertyKey && !plus) this.publish(handler, this.opaqueObject);
                    });
                }
                if (ts.isVariableDeclaration(node) && node.initializer) this.bind(node.name, this.cell(node.initializer));
                if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
                    const value = NAME_EVALUATING_ASSIGNMENTS.has(node.operatorToken.kind) ? this.cell(node.right) : this.cell(node);
                    this.onActive(node, () => this.writeTarget(node.left, value, node));
                }
                if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) || ts.isPostfixUnaryExpression(node))
                    this.onActive(node, () => this.writeTarget(node.operand, this.updateStored(node), node));
                if (ts.isDeleteExpression(node)) {
                    const target = unwrap(node.expression);
                    if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
                        const value = this.newCell(); this.publish(value, this.primitive(undefined));
                        this.onActive(node, () => this.writeTarget(target, value, node, "delete"));
                    }
                }
                if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
                    const value = this.newCell(); this.publish(value, this.unknown);
                    this.onActive(node, () => {
                        if (ts.isVariableDeclarationList(node.initializer)) for (const declaration of node.initializer.declarations) this.bind(declaration.name, value);
                        else this.writeTarget(node.initializer, value, node);
                    });
                }
                if (functionNode(node)) {
                    const owner = this.function(node);
                    // Computed method names execute in the defining context;
                    // formals and bodies execute in the function activation.
                    node.forEachChild(child => { worklist.push({node: child,
                        handler: child === node.body || ts.isParameter(child) ? owner.throws : handler}); });
                    continue;
                }
                if (ts.isCallExpression(node) || ts.isNewExpression(node) ||
                    ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isAwaitExpression(node) ||
                    ts.isTemplateExpression(node) || ts.isExpression(node) && conversionOperands(node)) this.cell(node);
                node.forEachChild(child => { worklist.push({node: child, handler}); });
            }
        }
    }
    private newCell(): Cell { return { id: this.nextCell++, values: new SourceFacts(), users: new Set() }; }
    private updateStored(node: ts.Node): Cell {
        let value = this.numericWrites.get(node);
        if (!value) {value = this.newCell(); this.numericWrites.set(node,value);}
        return value;
    }
    private primitiveTuples(parts: readonly (readonly Primitive[])[]): Primitive[][] {
        let tuples: Primitive[][] = [[]];
        for (const values of parts) tuples = tuples.flatMap(prefix => values.map(value => [...prefix,value]));
        return tuples;
    }
    private exceptionCell(): Cell {const cell = this.newCell(); this.exceptionCells.add(cell); return cell;}
    private enclosingActivation(node: ts.Node): FunctionOwner | null {
        let child = node, parent = node.parent;
        while (parent) {
            if (functionNode(parent) && (child === parent.body || ts.isParameter(child))) return this.function(parent);
            if (ts.isPropertyDeclaration(parent) && child === parent.initializer && ts.isClassLike(parent.parent) &&
                !(ts.getModifiers(parent)??[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword)) return this.function(parent.parent);
            child = parent;parent = parent.parent;
        }
        return null;
    }
    private onActive(node: ts.Node, action: () => void): void {
        const owner = this.enclosingActivation(node);
        if (!owner) action();
        else this.rule([owner.active],()=>{if(owner.active.values.size)action();});
    }
    private publish(cell: Cell, atom: Atom): void {
        if (cell.values.has(atom)) return;
        if (atom.tag === "text-operation") for (const part of atom.parts) {
            let parents = this.primitiveProofParents.get(part);
            if (!parents) {parents = new Set(); this.primitiveProofParents.set(part,parents);}
            parents.add(cell);
        }
        cell.values.add(atom);
        this.primitiveChanges.add(cell);
        for (const user of cell.users) this.schedule(user);
    }
    private flushPrimitiveChanges(): void {
        if (!this.primitiveChanges.size) return;
        const pending = [...this.primitiveChanges], visited = new Set<Cell>();
        this.primitiveChanges.clear();
        while (pending.length) {
            const value = pending.pop()!;
            if (visited.has(value)) continue; visited.add(value);
            this.primitiveProofCache.delete(value);
            this.primitiveReadyCache.delete(value);
            for (const user of value.users) this.schedule(user);
            for (const parent of this.primitiveProofParents.get(value) ?? []) pending.push(parent);
        }
    }
    private schedule(rule: Rule): void { if (!rule.queued) { rule.queued = true; this.queue.push(rule); } }
    private rule(inputs: readonly Cell[], run: () => void): Rule {
        const rule: Rule = { inputs: new Set(), run, queued: false };
        for (const input of inputs) this.watch(rule, input);
        this.schedule(rule); return rule;
    }
    private watch(rule: Rule, cell: Cell): void {
        if (rule.inputs.has(cell)) return;
        rule.inputs.add(cell); cell.users.add(rule); this.schedule(rule);
    }
    private copy(from: Cell, into: Cell): void {
        let destinations = this.copies.get(from);
        if (!destinations) { destinations = new Set(); this.copies.set(from, destinations); }
        if (destinations.has(into)) return;
        destinations.add(into);
        into.values.sources.add(from.values);
        let parents = this.primitiveProofParents.get(from);
        if (!parents) {parents = new Set(); this.primitiveProofParents.set(from,parents);}
        parents.add(into);
        this.primitiveChanges.add(into);
        for (const user of into.users) this.schedule(user);
    }
    private opaqueEffect(context?: ts.Node): void {
        if (!context) {this.publish(this.opaqueMutation, this.unknown); return;}
        let effect = this.opaqueEffects.get(context);
        if (!effect) {effect = {tag: "unknown", origin: context}; this.opaqueEffects.set(context, effect);}
        this.publish(this.opaqueMutation, effect);
    }
    private effectVisible(atom: Atom, context?: ts.Node, argumentsRead = false): boolean {
        if (atom.tag !== "unknown" || !atom.origin || !context) return true;
        const effect = atom.origin;
        if (effect.getSourceFile() !== context.getSourceFile()) return true;
        // Source order proves capture only in an acyclic top-level activation.
        // A later spelling in a function or loop may run before this read.
        for (const node of [effect, context]) for (let parent: ts.Node | undefined = node; parent; parent = parent.parent)
            if (ts.isFunctionLike(parent) || ts.isIterationStatement(parent, false)) return true;
        if (context.getEnd() <= effect.getStart()) return false;
        if (argumentsRead && effect === context) return false;
        if (ts.isCallExpression(effect) || ts.isNewExpression(effect)) {
            for (let parent: ts.Node | undefined = context; parent; parent = parent.parent) {
                if (parent === effect.expression) return false;
                if (parent === effect) break;
            }
        }
        return true;
    }
    private opaqueShape(owner: ObjectOwner, context?: ts.Node, argumentsRead = false): boolean {
        return [...owner.shape.values].some(atom => atom.tag === "unknown" && this.effectVisible(atom, context, argumentsRead));
    }
    private copyRead(from: Cell, into: Cell, context?: ts.Node, argumentsRead = false): void {
        this.copy(this.captureRead(from,context,argumentsRead),into);
    }
    private captureRead(from: Cell, context?: ts.Node, argumentsRead = false): Cell {
        let contexts = this.readCaptures.get(from);
        if (!contexts) {contexts = new Map(); this.readCaptures.set(from,contexts);}
        let phases = contexts.get(context);
        if (!phases) {phases = new Map(); contexts.set(context,phases);}
        const previous = phases.get(argumentsRead); if (previous) return previous;
        const captured = this.newCell(); phases.set(argumentsRead,captured);
        this.rule([from], () => {for (const value of from.values) if (this.effectVisible(value, context, argumentsRead)) this.publish(captured, value);});
        return captured;
    }
    private bindingSymbol(node: ts.Identifier): ts.Symbol | undefined {
        // Ordinary checker lookup stops at with. Resolve the declarative
        // fallback separately; object-record candidates remain graph edges.
        let symbol = declarativeSourceBindingSymbol(this.checker, node);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker.getAliasedSymbol(symbol);
        return symbol;
    }
    private binding(node: ts.Identifier): Cell {
        const symbol = this.bindingSymbol(node);
        if (!symbol || !(symbol.declarations ?? []).some(sourceDeclarationIntroducesBinding)) return this.globalBinding(node.text);
        let cell = this.bindings.get(symbol);
        if (!cell) {
            cell = this.newCell(); this.bindings.set(symbol, cell);
            const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
            if (declaration && callableDefinition(declaration)) this.copy(this.cell(declaration), cell);
        }
        return cell;
    }
    private bindingMayBeUninitialized(node: ts.Identifier): boolean {
        for (const value of this.bindingSymbol(node)?.declarations ?? []) {
            if (value.getSourceFile().isDeclarationFile || !sourceDeclarationIntroducesBinding(value)) continue;
            let declaration: ts.Node | undefined = value;
            while (declaration && !ts.isVariableDeclaration(declaration) && !ts.isSourceFile(declaration) && !ts.isFunctionLike(declaration)) declaration = declaration.parent;
            if (!declaration || !ts.isVariableDeclaration(declaration) || !ts.isVariableDeclarationList(declaration.parent) ||
                declaration.parent.flags & ts.NodeFlags.BlockScoped) continue;
            if (!declaration.initializer || declaration.getSourceFile() !== node.getSourceFile() ||
                this.enclosingActivation(declaration) !== this.enclosingActivation(node) || node.getStart() <= declaration.initializer.getEnd()) return true;
            for (let parent: ts.Node | undefined = declaration.parent; parent && !ts.isSourceFile(parent) && !ts.isFunctionLike(parent); parent = parent.parent)
                if (!ts.isVariableDeclarationList(parent) && !ts.isVariableStatement(parent) && !ts.isBlock(parent)) return true;
        }
        return false;
    }
    private withBindingObjects(node: ts.Identifier): Cell[] {
        const symbol = this.bindingSymbol(node);
        let declaration = symbol?.valueDeclaration && sourceDeclarationIntroducesBinding(symbol.valueDeclaration)
            ? symbol.valueDeclaration : symbol?.declarations?.find(sourceDeclarationIntroducesBinding);
        while (declaration && ts.isBindingElement(declaration)) declaration = declaration.parent.parent as ts.Declaration;
        let owner: ts.Node | undefined;
        if (declaration && ts.isParameter(declaration)) owner = declaration.parent;
        else if (declaration && (ts.isFunctionExpression(declaration) || ts.isClassExpression(declaration))) owner = declaration;
        else if (declaration && ts.isVariableDeclaration(declaration) && ts.isCatchClause(declaration.parent)) owner = declaration.parent;
        else if (declaration) {
            const variableList = ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent)
                ? declaration.parent : undefined;
            const functionScoped = !!variableList && !(variableList.flags & ts.NodeFlags.BlockScoped);
            for (let current: ts.Node | undefined = declaration.parent; current; current = current.parent) {
                if (ts.isSourceFile(current) || ts.isFunctionLike(current) || !functionScoped &&
                    (ts.isBlock(current) || ts.isCaseBlock(current) || ts.isForStatement(current) ||
                        ts.isForOfStatement(current) || ts.isForInStatement(current))) { owner = current; break; }
            }
        }
        const objects: Cell[] = [];
        let child: ts.Node = node;
        for (let current: ts.Node | undefined = node.parent; current && current !== owner; current = current.parent) {
            if (ts.isWithStatement(current) && current.statement === child) objects.push(this.cell(current.expression));
            child = current;
        }
        return objects;
    }
    private writeBinding(node: ts.Identifier, value: Cell): void {
        this.copy(value, this.binding(node));
        if(this.isAmbientIdentifier(node)){
            this.publish(this.globalReceiver,this.global);
            this.writeProperty(this.globalReceiver,node.text,value,true,"set",node);
        }
        // Presence and unscopables can change during execution. Keep both
        // object-record and declarative destinations in this may-flow graph;
        // runtime Reference capture makes the actual selection.
        for (const base of this.withBindingObjects(node)) this.rule([base], () => {
            for (const atom of base.values) {
                const owner = this.ordinaryOwner(atom);
                if (owner) this.copy(value, this.field(owner, node.text));
            }
        });
    }
    private intrinsic(domain: Domain, kind: DynamicFunctionKind): Atom {
        const key = domain + ":" + kind;
        let atom = this.intrinsicAtoms.get(key);
        if (!atom) { atom = { tag: "intrinsic", domain, kind }; this.intrinsicAtoms.set(key, atom); }
        return atom;
    }
    private operation(operation: Operation): Atom {
        let atom = this.operations.get(operation);
        if (!atom) { atom = { tag: "operation", operation }; this.operations.set(operation, atom); }
        return atom;
    }
    private text(text: string): Atom {
        return this.primitive(text);
    }
    private primitive(value: Primitive): Atom {
        if (typeof value === "symbol") {
            let atom = this.symbolPrimitives.get(value);
            if (!atom) {atom = {tag: "primitive", value}; this.symbolPrimitives.set(value, atom);}
            return atom;
        }
        const key = typeof value + ":" + (typeof value === "number" && Object.is(value,-0) ? "-0" : String(value));
        let atom = this.primitives.get(key);
        if (!atom) { atom = { tag: "primitive", value }; this.primitives.set(key, atom); }
        return atom;
    }
    private keyIdentity(key: SourcePropertyKey | null): string {
        if (typeof key !== "symbol") return JSON.stringify(key);
        let identity = this.symbolIdentities.get(key);
        if (identity === undefined) {identity = this.symbolIdentities.size; this.symbolIdentities.set(key, identity);}
        return "symbol:" + identity;
    }
    private owner(node: ts.Node): ObjectOwner {
        let owner = this.objects.get(node);
        if (!owner) { owner = { fields: new Map(), accessors: new Map(), shape: this.newCell() }; this.objects.set(node, owner); this.copy(this.opaqueMutation,owner.shape); }
        return owner;
    }
    private field(owner: ObjectOwner, key: SourcePropertyKey): Cell {
        let cell = owner.fields.get(key);
        if (!cell) {
            cell = this.newCell(); owner.fields.set(key, cell); this.publish(owner.shape, this.primitive(key));
            const target = cell;
            this.rule([owner.shape],()=>{for (const value of owner.shape.values) if (value.tag === "unknown") this.publish(target,value);});
        }
        return cell;
    }
    private presence(owner: ObjectOwner, key: SourcePropertyKey): Cell {
        owner.own ??= new Map();let cell=owner.own.get(key);
        if (!cell) {cell=this.newCell();owner.own.set(key,cell);}
        return cell;
    }
    private defineField(owner: ObjectOwner, key: SourcePropertyKey, value: Cell): void {
        if (typeof key === "symbol" && this.freshSymbols.has(key)) this.publish(this.presence(owner,key),this.primitive(false));
        this.publish(this.presence(owner,key),this.primitive(true));this.copy(value,this.field(owner,key));
    }
    private defineBooleanField(owner:ObjectOwner,key:string): void {
        this.publish(this.booleanResult,this.primitive(false));this.publish(this.booleanResult,this.primitive(true));this.defineField(owner,key,this.booleanResult);
    }
    private defineAccessor(owner:ObjectOwner,key:SourcePropertyKey|null,kind:"get"|"set",value:Cell,context:ts.Node): void {
        let accessor=owner.accessors.get(key);
        if(!accessor){accessor={get:this.newCell(),set:this.newCell()};this.accessorSlots.add(accessor.get);this.accessorSlots.add(accessor.set);owner.accessors.set(key,accessor);this.publish(owner.shape,{tag:"descriptor",identity:accessor});}
        this.accessorDefinitions.set(accessor.get,context);this.accessorDefinitions.set(accessor.set,context);
        this.copy(value,accessor[kind]);
        if(key===null)this.publish(owner.shape,this.unknown);
        else this.publish(this.presence(owner,key),this.primitive(true));
        if (typeof key === "symbol" && this.freshSymbols.has(key)) this.publish(this.presence(owner,key),this.primitive(false));
    }
    private accessorCallee(source:Cell): Cell {
        let callee=this.accessorCallees.get(source);
        if(!callee){callee=this.newCell();this.accessorCallees.set(source,callee);const target=callee;
            this.rule([source],()=>{for(const value of source.values)if(value!==this.primitive(undefined))this.publish(target,value);});}
        return callee;
    }
    private writeProperty(base: Cell, key: SourcePropertyKey | null, value: Cell, unknownGlobal = true, mode: "set"|"define"|"delete" = "set", context?: ts.Node, receiver = base): void {
        const handler=context?this.exceptionHandlers.get(context):undefined;
        if(handler)this.publish(handler,this.opaqueObject);
        const signature=base.id+":"+this.keyIdentity(key)+":"+value.id+":"+unknownGlobal+":"+mode+":"+(context?this.cell(context).id:"none")+":"+receiver.id;
        if(this.propertyWrites.has(signature))return;
        this.propertyWrites.add(signature);
        let rule!:Rule;
        rule=this.rule([base,receiver],()=>{for(const atom of base.values){
            const owner=this.ordinaryOwner(atom);
            if(owner){
                let store = mode !== "set";
                if(mode === "set"){
                    const pending=[owner],visited=new Set<ObjectOwner>();
                    while(pending.length){
                        const current=pending.pop()!;if(visited.has(current))continue;visited.add(current);
                        this.watch(rule,current.shape);
                        if(handler && this.opaqueShape(current,context))this.publish(handler,this.unknown);
                        for(const[name,accessor]of current.accessors)if(key===null || name===key || name===null)
                            this.invoke(context ?? this.accessorDefinitions.get(accessor.set)!,this.accessorCallee(accessor.set),receiver,[{cell:value,spread:false}],this.newCell());
                        const presence=key===null?null:this.presence(current,key);
                        if(presence)this.watch(rule,presence);
                        if(key!==null && current.accessors.has(key) && presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false)))continue;
                        if(presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false))){store=true;continue;}
                        if(!current.prototype){store=true;continue;}
                        this.watch(rule,current.prototype);
                        for(const prototype of current.prototype.values){
                            const inherited=this.ordinaryOwner(prototype);
                            if(inherited)pending.push(inherited);
                            else if(prototype===this.primitive(null))store=true;
                            else if(prototype.tag!=="pending-source"){this.publish(owner.shape,this.unknown);if(handler)this.publish(handler,this.unknown);store=true;}
                        }
                    }
                }
                if(!store)continue;
                const destinations=mode==="set"?[...receiver.values].map(value=>this.ordinaryOwner(value)).filter((value):value is ObjectOwner=>!!value):[owner];
                for(const owner of destinations){
                if(key===null){this.publish(owner.shape,this.unknown);for(const field of owner.fields.values())this.publish(field,this.unknown);}
                else {
                    const presence=this.presence(owner,key);
                    if(mode==="delete")this.publish(presence,this.primitive(false));
                    if (!presence.values.size) this.publish(presence,this.primitive(false));
                    this.publish(presence,this.primitive(true));
                    this.copy(value,this.field(owner,key));
                    const index = typeof key === "string" ? Number(key) : NaN;
                    if (owner.listLength && String(index) === key && Number.isInteger(index) && index >= 0 && index < 0xffffffff) {
                        const length = owner.listLength;
                        this.rule([length], () => {
                            for (const atom of [...length.values]) if (atom.tag === "primitive" && typeof atom.value === "number")
                                this.publish(length, this.primitive(Math.max(atom.value, index + 1)));
                        });
                    }
                }
                }
            }
            if(atom.tag==="global"){
                if(key===null)this.publish(this.globalMutation,this.unknown);
                else if (typeof key === "string" && !this.immutableGlobalBinding(key)) this.copy(value,this.globalBinding(key));
            }
            if(unknownGlobal&&(atom.tag==="unknown"||atom.tag==="opaque-object")){this.publish(this.globalMutation,this.unknown);if(handler)this.publish(handler,this.unknown);}
        }});
    }
    /** One hint-driven ToPrimitive worklist uses the keyed property and call
     * graph for the exotic hook and ordinary method order. */
    private primitiveConversion(source: Cell, context?: ts.Node, hint: PrimitiveHint = "string"): Cell {
        let contexts = this.hintPrimitives.get(source);
        if (!contexts) { contexts = new Map(); this.hintPrimitives.set(source, contexts); }
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(hint); if (previous) return previous;
        const result = this.newCell(); conversions.set(hint, result);
        const selected = new Set<Atom>();
        let rule!: Rule;
        rule = this.rule([source], () => {
            for (const atom of source.values) {
                if (atom.tag === "primitive" || atom.tag === "non-string" || atom.tag === "unknown-string" || atom.tag === "text-operation" || atom.tag === "abrupt" || atom.tag === "pending-source") {
                    this.publish(result, atom); continue;
                }
                const owner = this.ordinaryOwner(atom);
                if (!owner || !context) {
                    this.publish(result, this.unknown);
                    if (context) {const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown); this.onActive(context, () => this.opaqueEffect(context));}
                    continue;
                }
                const worklist = [owner], visited = new Set<ObjectOwner>();
                let ready = true, opaque = false;
                while (worklist.length) {
                    const current = worklist.pop()!;
                    if (visited.has(current)) continue; visited.add(current);
                    this.watch(rule, current.shape);
                    ready &&= this.definitionsReady(current, rule);
                    opaque ||= this.opaqueShape(current,context);
                    if (current.prototype) {
                        this.watch(rule, current.prototype);
                        ready &&= current.prototype.values.size > 0;
                        for (const prototype of current.prototype.values) {
                            const parent = this.ordinaryOwner(prototype);
                            if (parent) worklist.push(parent);
                            else if (prototype.tag === "pending-source") ready = false;
                            else if (prototype !== this.primitive(null)) opaque = true;
                        }
                    }
                }
                if (opaque) { this.publish(result, this.unknown); const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown); this.onActive(context, () => this.opaqueEffect(context)); continue; }
                if (!ready || selected.has(atom)) continue;
                selected.add(atom);
                const receiver = this.newCell(); this.publish(receiver, atom);
                const methods = ORDINARY_PRIMITIVE_METHODS.get(hint)!;
                const scheduled = new Set<number>();
                const advance = (index: number): void => {
                    if (scheduled.has(index)) return; scheduled.add(index);
                    if (index === methods.length) {
                        this.publish(result, this.abrupt);
                        const handler = this.exceptionHandlers.get(context);
                        if (handler) this.publish(handler, this.opaqueObject);
                        return;
                    }
                    const method = this.property(receiver, methods[index]!, context), callee = this.newCell(), returned = this.newCell();
                    this.invoke(context, callee, receiver, [], returned);
                    this.rule([method], () => {
                        for (const value of method.values) {
                            if (value.tag === "pending-source" || value.tag === "unknown" || value.tag === "opaque-object" || value.tag === "abrupt") this.publish(result, value);
                            else if (value.tag === "function" || value.tag === "bound" || value.tag === "operation" ||
                                value.tag === "intrinsic" || value.tag === "builtin" && value.normalResult !== "not-callable") this.publish(callee, value);
                            else advance(index + 1);
                        }
                    });
                    this.rule([returned], () => {
                        for (const value of returned.values) {
                            if (value.tag === "primitive" || value.tag === "non-string" || value.tag === "unknown-string" || value.tag === "text-operation" || value.tag === "abrupt" || value.tag === "pending-source" || value.tag === "unknown") this.publish(result, value);
                            else advance(index + 1);
                        }
                    });
                };
                const hook = this.property(receiver, this.wellKnownSymbols.get("toPrimitive")!, context);
                const callee = this.newCell(), returned = this.newCell(), hintValue = this.newCell();
                this.publish(hintValue, this.primitive(hint));
                this.invoke(context, callee, receiver, [{cell: hintValue, spread: false}], returned);
                const invalid = (): void => {
                    this.publish(result, this.abrupt);
                    const handler = this.exceptionHandlers.get(context);
                    if (handler) this.publish(handler, this.opaqueObject);
                };
                this.rule([hook], () => {
                    for (const value of hook.values) {
                        if (value === this.primitive(undefined) || value === this.primitive(null)) advance(0);
                        else if (value.tag === "function" || value.tag === "bound" || value.tag === "operation" ||
                            value.tag === "intrinsic" || value.tag === "builtin" && value.normalResult !== "not-callable") this.publish(callee, value);
                        else if (["abrupt", "pending-source", "unknown", "opaque-object"].includes(value.tag)) this.publish(result, value);
                        else invalid();
                    }
                });
                this.rule([returned], () => {
                    for (const value of returned.values) {
                        if (["primitive", "non-string", "unknown-string", "text-operation", "abrupt", "pending-source", "unknown"].includes(value.tag)) this.publish(result, value);
                        else invalid();
                    }
                });
            }
        });
        if (context) {
            let effects!: Rule;
            effects = this.rule([result], () => {
                const state = this.primitiveState(result, effects, true);
                if (state.pending || !state.unresolved) return;
                const handler = this.exceptionHandlers.get(context);
                if (handler) this.publish(handler, this.unknown);
                this.onActive(context, () => this.opaqueEffect(context));
            });
        }
        return result;
    }
    private coerceCell(source: Cell, context: ts.Node, conversion: string): Cell {
        let contexts = this.numericConversions.get(source);
        if (!contexts) {contexts = new Map(); this.numericConversions.set(source, contexts);}
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(conversion); if (previous) return previous;
        const input = this.primitiveConversion(source, context, "number"), result = this.newCell();
        conversions.set(conversion, result);
        this.publish(result, {tag: "text-operation", operation: "coerce", conversion, parts: [input]});
        let rule!: Rule;
        rule = this.rule([input], () => {
            const state = this.primitiveState(input, rule, true), handler = this.exceptionHandlers.get(context);
            if (state.pending) return;
            if (state.unresolved) {if (handler) this.publish(handler, this.unknown); this.onActive(context, () => this.opaqueEffect(context));}
            if (!handler) return;
            if (!state.proof.primitiveComplete) this.publish(handler, this.opaqueObject);
            for (const value of state.proof.values) {
                try {NUMERIC_CONVERSIONS.get(conversion)!(value);} catch {this.publish(handler, this.opaqueObject);}
            }
        });
        return result;
    }
    /** The same ordered List advances only through possible normal results.
     * An abrupt conversion suppresses every later conversion edge. */
    private convertList(args: readonly Cell[], context: ts.Node, mode: PrimitiveHint | "numeric" | "text"): readonly Cell[] {
        let conversions = this.orderedConversions.get(context);
        if (!conversions) {conversions = new Map(); this.orderedConversions.set(context, conversions);}
        const identity = mode + ":" + args.map(argument => argument.id).join(",");
        const previous = conversions.get(identity); if (previous) return previous;
        const converted: Cell[] = []; conversions.set(identity, converted);
        for (const [index, argument] of args.entries()) {
            const input = this.newCell(), result = mode === "text" ? this.stringHintCell(input, context)
                : mode === "numeric" ? this.coerceCell(input, context, "numeric") : this.primitiveConversion(input, context, mode);
            converted.push(result);
            if (index === 0) this.copy(argument, input);
            else {
                const predecessor = converted[index - 1]!;
                let rule!: Rule;
                rule = this.rule([predecessor], () => {
                    this.watchText(rule, predecessor);
                    const proof = this.primitiveChoiceProof(predecessor);
                    if (proof.primitiveComplete && !proof.values.length) this.publish(input, this.abrupt);
                    if (proof.values.length || !proof.primitiveComplete && !this.primitiveState(predecessor, rule, true).pending &&
                        [...predecessor.values].some(value => value.tag !== "abrupt" && value.tag !== "pending-source")) this.copy(argument, input);
                });
            }
        }
        return converted;
    }
    /** ToString rejects Symbol results except the String call's direct
     * Symbol argument, which uses SymbolDescriptiveString. */
    private stringHintTexts(key: Cell, rule: Rule, context?: ts.Node, descriptiveSymbols = false): readonly string[] | null | undefined {
        const input = key;
        key = this.primitiveConversion(key, context);
        const {proof, pending, unresolved} = this.primitiveState(key, rule);
        if (proof.primitiveComplete) {
            const values = proof.values.filter(value => typeof value !== "symbol" || descriptiveSymbols && input.values.has(this.primitive(value)));
            if (values.length !== proof.values.length && context) {
                const handler = this.exceptionHandlers.get(context);
                if (handler) this.publish(handler, this.opaqueObject);
            }
            return [...new Set(values.map(String))];
        }
        if (pending && !unresolved) return undefined;
        if (context) {
            const opaque = this.primitiveState(key, rule, true).unresolved;
            const handler = this.exceptionHandlers.get(context);
            if (handler) this.publish(handler, opaque ? this.unknown : this.opaqueObject);
            if (opaque) this.onActive(context, () => this.opaqueEffect(context));
        }
        return null;
    }
    private propertyKeys(key: Cell, rule: Rule, context?: ts.Node): readonly SourcePropertyKey[] | null | undefined {
        key = this.primitiveConversion(key, context);
        const {proof, pending, unresolved} = this.primitiveState(key, rule);
        if (proof.primitiveComplete) return [...new Set(proof.values.map(value => typeof value === "symbol" ? value : String(value)))];
        if (pending && !unresolved) return undefined;
        if (context) {
            const handler = this.exceptionHandlers.get(context);
            if (handler) this.publish(handler, this.unknown);
            this.onActive(context, () => this.opaqueEffect(context));
        }
        return null;
    }
    private primitiveState(root: Cell, rule: Rule, nonString = false): {proof: PrimitiveChoiceProof; pending: boolean; pendingSource: boolean; unresolved: boolean} {
        this.watchText(rule, root);
        const proof = this.primitiveChoiceProof(root);
        if (proof.primitiveComplete) return {proof, pending: false, pendingSource: false, unresolved: false};
        const state = this.primitiveReadiness(root);
        return {proof,pending:state.pending,pendingSource:state.pendingSource,unresolved:nonString ? state.scalarUnresolved : state.unresolved};
    }
    private primitiveReadiness(root: Cell): PrimitiveReadiness {
        this.flushPrimitiveChanges();
        const cached = this.primitiveReadyCache.get(root); if (cached) return cached;
        const pending = [root], states = new Map<Cell,PrimitiveReadiness>();
        while (pending.length) {
            const cell = pending.pop()!;
            if (states.has(cell) || this.primitiveReadyCache.has(cell)) continue;
            const state:PrimitiveReadiness = {pending:!cell.values.size,pendingSource:false,unresolved:false,scalarUnresolved:false};
            for (const value of cell.values) {
                if (value.tag === "text-operation") for (const part of value.parts) pending.push(part);
                else if (value.tag === "pending-source") state.pending = state.pendingSource = true;
                else if (value.tag !== "primitive" && value.tag !== "abrupt") {
                    state.unresolved = true; state.scalarUnresolved ||= value.tag !== "non-string" && value.tag !== "unknown-string";
                }
            }
            states.set(cell,state);
        }
        const worklist = [...states.keys()], queued = new Set(worklist);
        while (worklist.length) {
            const cell = worklist.pop()!; queued.delete(cell);
            const state = states.get(cell)!;
            const before = [state.pending,state.pendingSource,state.unresolved].join(":");
            for (const value of cell.values) if (value.tag === "text-operation") for (const part of value.parts) {
                const child = states.get(part) ?? this.primitiveReadyCache.get(part)!;
                state.pending ||= child.pending; state.pendingSource ||= child.pendingSource; state.unresolved ||= child.unresolved;
            }
            if (before !== [state.pending,state.pendingSource,state.unresolved].join(":"))
                for (const parent of this.primitiveProofParents.get(cell) ?? []) if (states.has(parent) && !queued.has(parent)) {queued.add(parent); worklist.push(parent);}
        }
        for (const [cell,state] of states) this.primitiveReadyCache.set(cell,state);
        return states.get(root)!;
    }
    private stringHintCell(source: Cell, context: ts.Node, descriptiveSymbols = false): Cell {
        let contexts = this.stringConversions.get(source);
        if (!contexts) { contexts = new Map(); this.stringConversions.set(source, contexts); }
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(descriptiveSymbols); if (previous) return previous;
        const result = this.newCell(); conversions.set(descriptiveSymbols, result);
        let rule!: Rule;
        rule = this.rule([source], () => {
            const choices = this.stringHintTexts(source, rule, context, descriptiveSymbols);
            if (choices === null) this.publish(result, this.unknownString);
            else if (choices?.length === 0) this.publish(result, this.abrupt);
            else if (choices === undefined && this.primitiveState(this.primitiveConversion(source, context), rule).pendingSource)
                this.publish(result, this.pendingSource);
            else for (const choice of choices ?? []) this.publish(result, this.text(choice));
        });
        return result;
    }
    private projectMemberKeys(name: string | ts.PropertyName, context: ts.Node, project: (key: SourcePropertyKey | null) => void, owner?: ObjectOwner): void {
        if (typeof name === "string") { project(name); return; }
        if (!ts.isComputedPropertyName(name)) { project(propertyName(name)); return; }
        const key = this.cell(name.expression), selected = new Set<SourcePropertyKey | null>(), defined = this.newCell();
        if (owner) (owner.computedDefinitions ??= []).push({key,defined,context});
        let rule!: Rule;
        rule = this.rule([key], () => {
            const keys = this.propertyKeys(key, rule, context);
            for (const value of keys === null ? [null] : keys ?? []) if (!selected.has(value)) {
                selected.add(value); project(value); this.publish(defined,value===null?this.unknown:this.primitive(value));
            }
        });
    }
    private definitionsReady(owner: ObjectOwner, rule: Rule | undefined): boolean {
        for (const definition of owner.computedDefinitions ?? []) {
            if (!rule) return false;
            this.watch(rule,definition.defined);
            const keys=this.propertyKeys(definition.key,rule,definition.context);
            if(keys===undefined)return false;
            if(keys===null){if(!definition.defined.values.has(this.unknown))return false;}
            else if(keys.some(key=>!definition.defined.values.has(this.primitive(key))))return false;
        }
        return true;
    }
    private computedProperty(base: Cell, key: Cell, context: ts.Node): Cell {
        const result = this.newCell(), selected = new Set<SourcePropertyKey>();
        let rule!: Rule;
        rule = this.rule([key], () => {
            const names = this.propertyKeys(key, rule, context);
            if (names === null) this.publish(result, this.unknown);
            else if (names?.length === 0) this.publish(result, this.abrupt);
            else for (const name of names ?? []) if (!selected.has(name)) {
                selected.add(name);
                this.copy(this.property(base, name, context), result);
            }
        });
        return result;
    }
    private writeTarget(raw: ts.Expression, value: Cell, context: ts.Node, mode: "set"|"delete" = "set"): void {
        const target = unwrap(raw);
        if (ts.isIdentifier(target)) { this.writeBinding(target, value); return; }
        if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
            if (ts.isPropertyAccessExpression(target) && ts.isPrivateIdentifier(target.name)) { this.opaqueEffect(context); return; }
            const base = this.cell(target.expression);
            if (ts.isElementAccessExpression(target)) this.writeComputedProperty(base, this.cell(target.argumentExpression), value, mode, context);
            else this.writeProperty(base, target.name.text, value, true, mode, context);
            return;
        }
        const references = new Map<ts.Identifier, ts.Expression>();
        const binding = normalizeAssignmentTarget(target, references);
        if (binding) this.bind(binding, value, references, context);
        else this.opaqueEffect(context);
    }
    private writeComputedProperty(base: Cell, key: Cell, value: Cell, mode: "set"|"define"|"delete" = "set", context?:ts.Node, receiver=base): void {
        let rule!: Rule;
        rule=this.rule([key],()=>{
            const names = this.propertyKeys(key, rule, context);
            if (names === null) this.writeProperty(base,null,value,true,mode,context,receiver);
            else for (const name of names ?? []) this.writeProperty(base,name,value,true,mode,context,receiver);
        });
    }
    private defineProperty(base:Cell,key:Cell,descriptor:Cell,context:ts.Node): void {
        const getter=this.property(descriptor,"get",context),setter=this.property(descriptor,"set",context),value=this.property(descriptor,"value",context);
        let rule!:Rule;
        rule=this.rule([base,key,getter,setter],()=>{
            const keys = this.propertyKeys(key, rule, context);
            if (keys === undefined) return;
            const names:readonly(SourcePropertyKey|null)[]=keys ?? [null];
            const accessor=[...getter.values,...setter.values].some(atom=>atom.tag !== "abrupt" && atom!==this.primitive(undefined));
            for(const name of names){
                if(accessor){for(const atom of base.values){const owner=this.ordinaryOwner(atom);
                    if(owner){this.defineAccessor(owner,name,"get",getter,context);this.defineAccessor(owner,name,"set",setter,context);}
                    else {this.publish(this.globalMutation,this.unknown);this.opaqueEffect(context);}
                }}else if(getter.values.size && setter.values.size)this.writeProperty(base,name,value,true,"define",context);
            }
        });
    }
    private defineProperties(base:Cell,descriptors:Cell,context:ts.Node): void {
        const selected=new Set<string>();let rule!:Rule;
        rule=this.rule([descriptors],()=>{for(const atom of descriptors.values){
            const owner=this.ordinaryOwner(atom);
            if(!owner){if(atom.tag!=="pending-source")this.writeProperty(base,null,this.empty,true,"define",context);continue;}
            this.watch(rule,owner.shape);
            if(this.opaqueShape(owner,context))this.writeProperty(base,null,this.empty,true,"define",context);
            for(const name of new Set([...owner.fields.keys(),...owner.accessors.keys()])){
                if(name===null){this.writeProperty(base,null,this.empty,true,"define",context);continue;}
                const key=owner.shape.id+":"+this.keyIdentity(name);if(selected.has(key))continue;selected.add(key);
                const propertyKey=this.newCell();this.publish(propertyKey,this.primitive(name));
                this.defineProperty(base,propertyKey,this.property(descriptors,name,context),context);
            }
        }});
    }
    private ownDescriptors(base:Cell,key:Cell|null,context:ts.Node,result:Cell): void {
        const records=new Map<ObjectOwner,Map<SourcePropertyKey,{value:Cell;owner:ObjectOwner}>>();
        const collection:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
        if(!key)this.publish(result,{tag:"object",owner:collection});
        const handler=this.exceptionHandlers.get(context);
        const incomplete=()=>{this.publish(result,this.unknown);if(handler)this.publish(handler,this.unknown);};
        let rule!:Rule;
        rule=this.rule(key?[base,key]:[base],()=>{
            const keys=key?this.propertyKeys(key,rule,context):undefined;
            if(key && keys===undefined)return;
            if(key && keys===null){incomplete();return;}
            for(const atom of base.values){
                if(atom.tag==="pending-source"){this.publish(result,atom);continue;}
                const owner=this.ordinaryOwner(atom);
                if(!owner){incomplete();if(atom.tag==="unknown"||atom.tag==="opaque-object")this.onActive(context,()=>this.opaqueEffect(context));continue;}
                this.watch(rule,owner.shape);
                if(!this.definitionsReady(owner,rule))continue;
                if(this.opaqueShape(owner,context)){incomplete();continue;}
                const names=key?keys!:[...new Set([...owner.fields.keys(),...owner.accessors.keys()])];
                // Intrinsic/function metadata and exotic own-key collections
                // stay incomplete until represented by the shared owner graph.
                if(!key && atom.tag!=="object")incomplete();
                for(const name of names){
                    if(name===null){incomplete();continue;}
                    const presence=this.presence(owner,name);this.watch(rule,presence);
                    const data=this.field(owner,name);this.watch(rule,data);
                    const accessor=owner.accessors.get(name);
                    const present=presence.values.has(this.primitive(true));
                    if(!present && !data.values.size && !accessor){
                        if(key && atom.tag==="object")this.publish(result,this.primitive(undefined));
                        continue;
                    }
                    if(key && presence.values.has(this.primitive(false)))this.publish(result,this.primitive(undefined));
                    let entries=records.get(owner);if(!entries){entries=new Map();records.set(owner,entries);}
                    let record=entries.get(name);
                    if(!record){
                        const descriptor:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
                        const value=this.newCell();this.publish(value,{tag:"object",owner:descriptor});record={value,owner:descriptor};entries.set(name,record);
                        for(const attribute of ["enumerable","configurable"])this.defineBooleanField(descriptor,attribute);
                    }
                    if(accessor){
                        for(const kind of ["get","set"] as const){this.watch(rule,accessor[kind]);this.defineField(record.owner,kind,accessor[kind]);}
                    }
                    if(data.values.size || !accessor){
                        this.defineField(record.owner,"value",data);
                        this.defineBooleanField(record.owner,"writable");
                    }
                    if(key)this.copy(record.value,result);else this.defineField(collection,name,record.value);
                }
            }
        });
    }
    private immutableGlobalBinding(key: string): boolean {
        const binding = runtimeGlobalBindings.get(key);
        return binding?.kind === "value" && !binding.writable && !binding.configurable;
    }
    private globalBinding(key: string): Cell {
        let cell = this.globals.get(key);
        if (!cell) {
            cell = this.newCell();this.globals.set(key,cell);
            if (!this.immutableGlobalBinding(key)) this.copy(this.globalMutation,cell);
            if (key === "Function") this.publish(cell,this.intrinsic("constructor","ordinary"));
            if (key === "eval") this.publish(cell,this.operation("eval"));
            if (key === "print") this.publish(cell,this.operation("host-print"));
            if (key === "$262") this.publish(cell,this.host);
            if (key === "undefined") this.publish(cell,this.primitive(undefined));
            if (key === "NaN") this.publish(cell,this.primitive(NaN));
            if (key === "Infinity") this.publish(cell,this.primitive(Infinity));
            const descriptor = runtimeGlobalBindings.get(key);
            if (descriptor?.normalResult && cell.values.size === 0) {
                const fields: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell()};this.copy(this.opaqueMutation,fields.shape);
                for (const [name, operation] of INITIAL_SOURCE_OPERATIONS.get(key) ?? []) {
                    const value = this.newCell();this.publish(value,this.operation(operation));this.defineField(fields,name,value);
                }
                if (descriptor.normalResult !== "not-callable") fields.prototype = this.callablePrototype("ordinary");
                if(key==="Object")this.defineField(fields,"prototype",this.objectPrototype());
                if(key==="Symbol") {
                    for (const [name, symbol] of this.wellKnownSymbols) {
                        const value = this.newCell(); this.publish(value, this.primitive(symbol)); this.defineField(fields, name, value);
                    }
                    for (const [name, operation] of [["for", "symbol-for"], ["keyFor", "symbol-key-for"]] as const) {
                        const value = this.newCell(); this.publish(value, this.operation(operation)); this.defineField(fields, name, value);
                    }
                }
                this.publish(cell, {tag:"builtin", name:key, normalResult:descriptor.normalResult,fields});
            }
        }
        return cell;
    }
    private isAmbientIdentifier(node: ts.Identifier): boolean {
        return !(this.bindingSymbol(node)?.declarations ?? []).some(declaration =>
            !declaration.getSourceFile().isDeclarationFile && sourceDeclarationIntroducesBinding(declaration));
    }
    private callablePrototype(kind: DynamicFunctionKind): Cell {
        let cell = this.callablePrototypes.get(kind);
        if (!cell) {
            cell = this.newCell(); this.callablePrototypes.set(kind, cell);
            this.publish(cell, this.intrinsic("prototype", kind));
        }
        return cell;
    }
    private objectPrototype(): Cell {
        if (!this.ordinaryObjectPrototype) {
            this.ordinaryObjectPrototype=this.newCell();
            const owner: ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
            this.copy(this.opaqueMutation,owner.shape);this.publish(owner.prototype!,this.primitive(null));
            this.publish(this.ordinaryObjectPrototype,{tag:"object",owner});
            this.defineField(owner,"constructor",this.globalBinding("Object"));
            for(const[name,normalResult]of runtimeObjectPrototypeMethods){
                const value=this.newCell(),fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
                this.publish(value,{tag:"builtin",name,normalResult,fields});this.defineField(owner,name,value);
            }
        }
        return this.ordinaryObjectPrototype;
    }
    private property(base: Cell, key: SourcePropertyKey, context?: ts.Node, ownOnly=false): Cell {
        const result = this.newCell();
        const rule = this.rule([base], () => { for (const atom of base.values) this.read(atom, base, key, result, context && this.exceptionHandlers.get(context), rule, context,ownOnly); });
        return result;
    }
    private ordinaryOwner(atom: Atom): ObjectOwner | null {
        if(atom.tag==="global"){
            if(!this.globalOwner){this.globalOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};this.copy(this.globalMutation,this.globalOwner.shape);}
            return this.globalOwner;
        }
        if(atom.tag === "object")return atom.owner;
        if(atom.tag === "function")return atom.owner.fields;
        if(atom.tag === "bound")return atom.fields;
        if(atom.tag === "builtin")return atom.fields;
        if(atom.tag === "intrinsic"){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.intrinsicOwners.set(atom,owner);
                if (atom.domain === "constructor") owner.prototype = atom.kind === "ordinary" ? this.callablePrototype("ordinary") : this.globalBinding("Function");
                if (atom.domain === "prototype" && atom.kind !== "ordinary") owner.prototype = this.callablePrototype("ordinary");
                if (atom.domain === "prototype" && atom.kind === "ordinary") {
                    owner.prototype = this.objectPrototype();
                    this.publish(this.field(owner, "toString"), this.operation("function-text"));this.publish(this.presence(owner,"toString"),this.primitive(true));
                    this.defineField(owner, "constructor", this.globalBinding("Function"));
                }
                this.copy(this.opaqueMutation,owner.shape);
            }
            return owner;
        }
        if(atom.tag !== "host" && atom.tag !== "realm-record" && atom.tag !== "agent")return null;
        const key=atom.tag === "agent" ? "agent" : "host";
        let owner=this.hostOwners.get(key);
        if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.hostOwners.set(key,owner);}
        return owner;
    }
    private read(atom: Atom, base: Cell, key: SourcePropertyKey, result: Cell, handler?: Cell, rule?: Rule, context?: ts.Node, ownOnly=false): void {
        if (atom.tag === "primitive" && typeof atom.value === "symbol" && key === "description") {
            this.publish(result, this.primitive(atom.value.description)); return;
        }
        if (atom.tag === "abrupt") {this.publish(result, atom); return;}
        if (atom.tag === "primitive" && (atom.value === null || atom.value === undefined)) {
            this.publish(result, this.abrupt); if (handler) this.publish(handler, this.opaqueObject); return;
        }
        if (atom.tag === "pending-source") {this.publish(result,atom);return;}
        if (atom.tag === "unknown" || atom.tag === "opaque-object") {
            this.publish(result, this.unknown);
            if (handler) this.publish(handler, this.unknown);
            return;
        }
        const firstOwner = this.ordinaryOwner(atom), worklist = firstOwner ? [firstOwner] : [];
        if(atom.tag==="global" && typeof key === "string" && !firstOwner!.accessors.has(key))this.copy(this.globalBinding(key),this.field(firstOwner!,key));
        const visited = new Set<ObjectOwner>();
        while (worklist.length) {
            const owner = worklist.pop()!;
            if (visited.has(owner)) continue;
            visited.add(owner);
            if(rule)this.watch(rule,owner.shape);
            if(!this.definitionsReady(owner,rule))continue;
            this.copyRead(this.field(owner, key), result, context);
            for (const name of [key,null]) {
                const accessor=owner.accessors.get(name);
                if(!accessor)continue;
                if(rule)this.watch(rule,accessor.get);
                if(accessor.get.values.has(this.primitive(undefined)))this.publish(result,this.primitive(undefined));
                this.invoke(context ?? this.accessorDefinitions.get(accessor.get)!,this.accessorCallee(accessor.get),base,[],result);
            }
            const presence=owner.own?.get(key);
            if (rule) this.watch(rule,this.presence(owner,key));
            // The native builtin's unrepresented own members are opaque.
            // A closed prototype chain must not turn them into known absence.
            if (owner === firstOwner && atom.tag === "builtin" && !presence?.values.has(this.primitive(true)) &&
                !(typeof key === "string" && (runtimeObjectPrototypeMethods.has(key) || key === "constructor" ||
                    atom.normalResult !== "not-callable" && CALLABLE_FORWARDING_OPERATIONS.has(key)))) {
                this.publish(result, this.unknown); if (handler) this.publish(handler, this.unknown);
            }
            if(ownOnly){if(!presence?.values.has(this.primitive(true)) || presence.values.has(this.primitive(false)))this.publish(result,this.primitive(undefined));continue;}
            if (presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false))) continue;
            if (owner.prototype) {
                if (rule) this.watch(rule, owner.prototype);
                for (const prototype of owner.prototype.values) {
                    const inherited = this.ordinaryOwner(prototype);
                    if (inherited) worklist.push(inherited);
                    else if (prototype.tag === "primitive" && prototype.value === null) this.publish(result,this.primitive(undefined));
                    else this.publish(result, prototype.tag === "pending-source" ? prototype : this.unknown);
                }
            }
        }
        if (atom.tag === "function") {
            if (key === "constructor") this.publish(result, this.intrinsic("constructor", atom.owner.kind));
            if (key === "prototype" && atom.owner.kind !== "async" && !ts.isClassLike(atom.owner.definition)) this.publish(result, this.intrinsic("instance", atom.owner.kind));
        }
        if (atom.tag === "intrinsic") {
            if (key === "constructor") {
                if (atom.domain === "prototype") this.publish(result, this.intrinsic("constructor", atom.kind));
                if (atom.domain === "constructor") this.publish(result, this.intrinsic("constructor", "ordinary"));
                if (atom.domain === "instance" && atom.kind !== "ordinary") this.publish(result, this.intrinsic("prototype", atom.kind));
            }
            if (key === "prototype" && atom.domain === "constructor") this.publish(result, this.intrinsic("prototype", atom.kind));
            if (key === "prototype" && atom.domain === "prototype" && atom.kind.includes("generator"))
                this.publish(result, this.intrinsic("instance", atom.kind));
        }
        if (atom.tag === "host" || atom.tag === "realm-record") {
            if (key === "gc") this.publish(result, this.operation("host-gc"));
            if (key === "agent") this.publish(result, this.agent);
            if (key === "createRealm") this.publish(result, this.operation("realm"));
            if (key === "evalScript") this.publish(result, this.operation("eval-script"));
            if (key === "global") this.publish(result, this.global);
        }
        if (atom.tag === "agent" && key === "start") this.publish(result, this.operation("agent-start"));
        if ((["function", "bound", "intrinsic", "operation"].includes(atom.tag) ||
            atom.tag === "builtin" && atom.normalResult !== "not-callable") && typeof key === "string" && CALLABLE_FORWARDING_OPERATIONS.has(key))
            this.publish(result, this.operation(CALLABLE_FORWARDING_OPERATIONS.get(key)!));
        if (atom.tag === "generator" && key === "constructor") this.publish(result, this.intrinsic("prototype", atom.owner.kind));
    }
    private bind(name: ts.BindingName, value: Cell, references?: ReadonlyMap<ts.Identifier, ts.Expression>, context?: ts.Node): void {
        const worklist = [{ name, value }];
        while (worklist.length) {
            const entry = worklist.pop()!;
            if (ts.isIdentifier(entry.name)) {
                const reference = references?.get(entry.name);
                if (reference) this.writeTarget(reference, entry.value, context!);
                else this.writeBinding(entry.name, entry.value);
                continue;
            }
            for (const [index, element] of entry.name.elements.entries()) {
                if (!ts.isBindingElement(element)) continue;
                const key = ts.isObjectBindingPattern(entry.name) ? propertyName(element.propertyName ?? element.name) : String(index);
                const computed = ts.isObjectBindingPattern(entry.name) && element.propertyName && ts.isComputedPropertyName(element.propertyName) ? element.propertyName.expression : null;
                const selected = element.dotDotDotToken ? references ? this.newCell() : entry.value : computed ? this.computedProperty(entry.value, this.cell(computed), context ?? entry.name) : key === null ? this.newCell() : this.property(entry.value, key, entry.name);
                if (!computed && key === null || element.dotDotDotToken && references) this.publish(selected, this.unknown);
                if (element.initializer) this.copy(this.cell(element.initializer), selected);
                worklist.push({ name: element.name, value: selected });
            }
        }
    }
    private function(node: CallableDefinition): FunctionOwner {
        let owner = this.functions.get(node);
        if (owner) return owner;
        const activation = ts.isClassLike(node) ? node.members.find(ts.isConstructorDeclaration) ?? null : node;
        const constructor = ts.isClassLike(node) && activation ? this.function(activation) : null;
        owner = { definition: node, node: activation, kind: functionKindForDeclaration(node), fields: this.owner(node),
            returns: constructor?.returns ?? this.newCell(), throws: constructor?.throws ?? this.exceptionCell(),
            receiver: constructor?.receiver ?? this.newCell(), active: constructor?.active ?? this.newCell(), sourceText: (functionNode(node) ? this.dynamicSourceTexts.get(node) : null) ?? callableSourceText(node) ?? "function () { [native code] }" };
        this.functions.set(node, owner);
        const length=this.newCell();this.publish(length,this.primitive(activation?expectedArgumentCount(activation):0));this.defineField(owner.fields,"length",length);
        const name = this.newCell(), input = callableNameInput(node);
        this.defineField(owner.fields, "name", name);
        this.projectMemberKeys(input.key, input.definition ?? node, key => {
            const text = typeof key === "symbol" ? key.description === undefined ? "" : "[" + key.description + "]" : key;
            this.publish(name, text === null ? this.unknown : this.primitive(input.prefix ? `${input.prefix} ${text}` : text));
        });
        owner.fields.prototype = this.callablePrototype(owner.kind);
        if (ts.isClassLike(node)) {
            const prototype: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
            const prototypeValue = this.field(owner.fields, "prototype");
            this.publish(prototypeValue, {tag:"object",owner:prototype});this.publish(this.presence(owner.fields,"prototype"),this.primitive(true));
            this.defineField(prototype,"constructor",this.cell(node));
            const heritage = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types[0];
            if (heritage) {
                const base = this.cell(heritage.expression), parent = this.newCell();
                owner.base=base;
                owner.fields.prototype = parent;
                this.rule([base],()=>{
                    for (const value of base.values) {
                        if (value.tag === "primitive" && value.value === null) {
                            this.copy(this.callablePrototype("ordinary"),parent);this.publish(prototype.prototype!,value);
                        } else this.publish(parent,value);
                    }
                });
                this.copy(this.property(base,"prototype"),prototype.prototype!);
            } else this.copy(this.objectPrototype(),prototype.prototype!);
            const initializers: {keys:Cell;value:Cell}[]=[];
            for (const member of node.members) {
                if (ts.isConstructorDeclaration(member) || ts.isClassStaticBlockDeclaration(member)) continue;
                const isStatic = (ts.canHaveModifiers(member) ? ts.getModifiers(member) ?? [] : []).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
                const target = isStatic ? owner.fields : prototype;
                if (member.name && ts.isPrivateIdentifier(member.name)) continue;
                if (!isStatic && ts.isPropertyDeclaration(member)) {
                    const value=member.initializer?this.cell(member.initializer):this.newCell(),keys=this.newCell();
                    if (!member.initializer)this.publish(value,this.primitive(undefined));
                    this.projectMemberKeys(member.name,member,key=>this.publish(keys,key===null?this.unknown:this.primitive(key)));
                    initializers.push({keys,value});continue;
                }
                if (!member.name) continue;
                this.projectMemberKeys(member.name,member,key=>{
                    if(key===null)this.publish(target.shape,this.unknown);
                    if(ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member))this.defineAccessor(target,key,ts.isGetAccessorDeclaration(member)?"get":"set",this.cell(member),member);
                    else if(key!==null){
                        if(ts.isMethodDeclaration(member))this.defineField(target,key,this.cell(member));
                        if(isStatic&&ts.isPropertyDeclaration(member)){
                            const value=member.initializer?this.cell(member.initializer):this.newCell();
                            if(!member.initializer)this.publish(value,this.primitive(undefined));
                            this.defineField(target,key,value);
                        }
                    }
                },target);
            }
            let fieldsRule!:Rule;
            fieldsRule=this.rule([owner.receiver,...initializers.map(field=>field.keys)],()=>{
                for(const receiver of owner.receiver.values){
                    const instance=this.ordinaryOwner(receiver);
                    if(!instance)continue;
                    for(const initializer of initializers){
                        const keys=this.propertyKeys(initializer.keys,fieldsRule);
                        if(keys===null)this.publish(instance.shape,this.unknown);
                        else for(const key of keys??[])this.defineField(instance,key,initializer.value);
                    }
                }
            });
            return owner;
        }
        if (node.body && !ts.isBlock(node.body)) this.copy(this.cell(node.body), owner.returns);
        else if (node.body) {
            const completion = owner.completion = functionBodyCompletions(node.body);
            if (!completion.complete) {this.publish(owner.returns, this.unknown); this.publish(owner.throws, this.unknown);}
            for (const value of completion.returns) {
                if (value) this.copy(this.cell(value), owner.returns);
                else this.publish(owner.returns, this.primitive(undefined));
            }
            if (completion.normal) this.publish(owner.returns, this.primitive(undefined));
            else if (!completion.returns.length) this.publish(owner.returns, this.abrupt);
        }
        return owner;
    }
    private lists(cell: Cell, context?: ts.Node): Array<readonly Cell[] | null> {
        // Every actual List projects the owner's canonical length and index
        // locations. Literal/rest initialization and mutations publish into
        // those same cells; the rule worklist closes their dependencies.
        const alternatives: Array<readonly Cell[] | null> = [];
        for (const atom of cell.values) {
            if (atom.tag !== "object" || !atom.owner.listLength) {
                alternatives.push(null);
                continue;
            }
            const owner = atom.owner;
            const proof = this.primitiveChoiceProof(owner.listLength!);
            if (!proof.primitiveComplete && this.primitiveReadiness(owner.listLength!).pending) continue;
            if (this.opaqueShape(owner,context,true) || !proof.primitiveComplete) {
                alternatives.push(null);
                continue;
            }
            for (const value of proof.values) {
                const length = typeof value === "bigint" ? NaN : Number(value);
                if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) {
                    alternatives.push(null);
                    continue;
                }
                const locations: Cell[] = [];
                for (let index = 0; index < length; index++) {
                    const key = String(index);
                    const existing = owner.fields.get(key);
                    const location = existing ?? this.field(owner, key);
                    if (!existing) this.publish(location, this.primitive(undefined));
                    locations.push(this.captureRead(location,context,true));
                }
                alternatives.push(locations);
            }
        }
        return alternatives.includes(null) ? [null] : alternatives;
    }
    private cyclicListShape(owner: ObjectOwner): boolean {
        const pending = [{ owner, finish: false }];
        const active = new Set<ObjectOwner>(), completed = new Set<ObjectOwner>();
        while (pending.length) {
            const task = pending.pop()!;
            if (task.finish) { active.delete(task.owner); completed.add(task.owner); continue; }
            if (completed.has(task.owner)) continue;
            if (active.has(task.owner)) return true;
            active.add(task.owner); pending.push({ ...task, finish: true });
            for (const source of task.owner.listSources ?? []) for (const atom of source.values)
                if (atom.tag === "object" && atom.owner.listLength) pending.push({ owner: atom.owner, finish: false });
        }
        return false;
    }
    private arguments(parts: readonly ListPart[]): Array<readonly Cell[] | null> {
        let choices: Array<readonly Cell[] | null> = [[]];
        for (const part of parts) {
            const alternatives = part.spread ? this.lists(part.cell) : [[part.cell]];
            choices = choices.flatMap(prefix => alternatives.map(tail => prefix && tail ? [...prefix, ...tail] : null));
        }
        return choices;
    }
    private cell(raw: ts.Node): Cell {
        const node = ts.isExpression(raw) ? unwrap(raw) : raw;
        let result = this.cells.get(node);
        if (!result) {
            result = this.newCell(); this.cells.set(node, result); this.initializers.push({ node, result });
        }
        return result;
    }
    private initialize(node: ts.Node, result: Cell): void {
        if (callableDefinition(node)) { this.publish(result, { tag: "function", owner: this.function(node) }); return; }
        const operation = sourceNumericOperation(node);
        if (operation) {
            const operands = ts.isBinaryExpression(node) ? [this.cell(node.left), this.cell(node.right)] : [this.cell((node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression).operand)];
            const converted = operation.form === "equality" ? operands : this.convertList(operands, node, operation.conversion as PrimitiveHint | "numeric");
            const computed = operation.form === "update" ? this.newCell() : result;
            this.publish(computed, {tag: "text-operation", operation: "numeric", numeric: operation, parts: converted});
            if (operation.form === "update") {
                this.copy(ts.isPostfixUnaryExpression(node) ? converted[0]! : computed, result);
                // A shared mutable location has no versioned scalar value.
                // Retain its numeric category after normal conversion instead
                // of feeding expression values back into the location graph.
                const stored = this.updateStored(node);
                let write!: Rule;
                write = this.rule([converted[0]!], () => {
                    const state = this.primitiveState(converted[0]!, write, true);
                    if (state.pending) return;
                    this.publish(stored, state.proof.primitiveComplete && !state.proof.values.length ? this.abrupt : this.nonString);
                });
            }
            const handler = this.exceptionHandlers.get(node);
            if (handler || operation.conversion === "equality") {
                let rule!: Rule;
                rule = this.rule(converted, () => {
                    const states = converted.map(input => this.primitiveState(input,rule,true));
                    if (states.some(state => state.pending || state.proof.primitiveComplete && !state.proof.values.length)) return;
                    if (operation.conversion === "equality" && states.some(state => state.unresolved)) this.onActive(node,()=>this.opaqueEffect(node));
                    if (!handler || operation.conversion === "none") return;
                    if (states.some(state => state.unresolved)) this.publish(handler,this.unknown);
                    if (states.some(state => !state.proof.primitiveComplete)) this.publish(handler,this.opaqueObject);
                    for (const tuple of this.primitiveTuples(states.map(state => state.proof.values))) {
                        try {operation.evaluate(tuple);} catch {this.publish(handler,this.opaqueObject);}
                    }
                });
            }
            return;
        }
        if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
            this.publish(result, {tag: "text-operation", operation: "prefix", operator: node.operator, parts: [this.cell(node.operand)]}); return;
        }
        if (ts.isDeleteExpression(node) || ts.isBinaryExpression(node) && BOOLEAN_BINARY_RESULTS.has(node.operatorToken.kind)) {
            this.publish(result, this.primitive(true)); this.publish(result, this.primitive(false)); return;
        }
        if (ts.isVoidExpression(node)) { this.publish(result, this.primitive(undefined)); return; }
        if (ts.isTypeOfExpression(node)) {
            for (const value of ["undefined", "object", "boolean", "number", "bigint", "string", "symbol", "function"])
                this.publish(result, this.text(value));
            return;
        }
        if (ts.isStringLiteralLike(node)) this.publish(result, this.text(node.text));
        else if (ts.isNumericLiteral(node)) this.publish(result, this.primitive(Number(node.text)));
        else if (ts.isBigIntLiteral(node)) this.publish(result, this.primitive(BigInt(node.text.replace(/n$/i, ""))));
        else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword)
            this.publish(result, this.primitive(node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword));
        else if (ts.isIdentifier(node)) {
            this.copy(this.binding(node), result);
            if (this.bindingMayBeUninitialized(node)) this.publish(result,this.primitive(undefined));
            for (const base of this.withBindingObjects(node)) this.copy(this.property(base, node.text, node), result);
            if (this.isAmbientIdentifier(node)) {
                if (node.text === "globalThis") this.publish(result, this.global);
                this.copy(this.globalBinding(node.text),result);
                if (node.text !== "globalThis") {
                    this.publish(this.globalReceiver,this.global);
                    const owner=this.ordinaryOwner(this.global)!;
                    let linked=false;
                    this.rule([owner.shape],()=>{
                        if(!linked && (owner.accessors.has(node.text) || owner.accessors.has(null))){
                            linked=true;this.copy(this.property(this.globalReceiver,node.text,node),result);
                        }
                    });
                }
            }
        } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
            let parent: ts.Node | undefined = node.parent;
            let member: ts.Node = node;
            while (parent && !ts.isClassLike(parent) && (!functionNode(parent) || ts.isArrowFunction(parent))) {member=parent;parent = parent.parent;}
            if (parent && functionNode(parent)) this.copy(this.function(parent).receiver, result);
            else if (parent && ts.isClassLike(parent)) {
                const isStatic = ts.isClassStaticBlockDeclaration(member) || (ts.canHaveModifiers(member) ? ts.getModifiers(member) ?? [] : []).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
                if (isStatic) this.copy(this.cell(parent),result);
                else this.copy(this.function(parent).receiver,result);
            }
            else this.publish(result, this.global);
        } else if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
            const owner = this.owner(node);
            this.publish(result, { tag: "object", owner });
            if(ts.isObjectLiteralExpression(node)){
                owner.prototype=this.newCell();
                const prototype=node.properties.find(member=>ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__") as ts.PropertyAssignment|undefined;
                if(prototype){const value=this.cell(prototype.initializer);this.rule([value],()=>{for(const atom of value.values){
                    if(this.ordinaryOwner(atom)||atom===this.primitive(null)||atom.tag==="pending-source")this.publish(owner.prototype!,atom);
                    else if(atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,this.unknown);
                    else this.copy(this.objectPrototype(),owner.prototype!);
                }});}else this.copy(this.objectPrototype(),owner.prototype);
            }
            if (ts.isArrayLiteralExpression(node)) {
                const parts = node.elements.map(element => ({ cell: this.cell(ts.isSpreadElement(element) ? element.expression : element), spread: ts.isSpreadElement(element) }));
                owner.listLength = this.field(owner, "length");
                this.publish(this.presence(owner,"length"),this.primitive(true));
                owner.listSources = parts.filter(part => part.spread).map(part => part.cell);
                const seen = new Set<string>();
                let rule: Rule;
                rule = this.rule(parts.map(part => part.cell), () => {
                    for (const part of parts) if (part.spread) this.watchList(rule, part.cell);
                    if (this.cyclicListShape(owner)) {
                        this.publish(owner.listLength!, this.unknown);
                        return;
                    }
                    for (const list of this.arguments(parts)) {
                        if (!list) continue;
                        const key = list.map(cell => cell.id).join(",");
                        if (seen.has(key)) continue;
                        seen.add(key);
                        list.forEach((value, index) => this.defineField(owner,String(index),value));
                        this.publish(owner.listLength!, this.primitive(list.length));
                    }
                });
            }
            if (ts.isObjectLiteralExpression(node)) for (const member of node.properties) {
                if(ts.isSpreadAssignment(member)){this.publish(owner.shape,this.unknown);continue;}
                if(ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__")continue;
                this.projectMemberKeys(member.name,member,key=>{
                    if(key===null)this.publish(owner.shape,this.unknown);
                    if(ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member))this.defineAccessor(owner,key,ts.isGetAccessorDeclaration(member)?"get":"set",this.cell(member),member);
                    else if(key!==null){
                        if(ts.isPropertyAssignment(member))this.defineField(owner,key,this.cell(member.initializer));
                        if(ts.isShorthandPropertyAssignment(member))this.defineField(owner,key,this.cell(member.name));
                        if(ts.isMethodDeclaration(member))this.defineField(owner,key,this.cell(member));
                    }
                },owner);
            }
        } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            if(ts.isPropertyAccessExpression(node)&&ts.isPrivateIdentifier(node.name)) {this.publish(result,this.unknown);this.onActive(node,()=>this.opaqueEffect(node));return;}
            if (ts.isElementAccessExpression(node) && node.argumentExpression)
                this.copy(this.computedProperty(this.cell(node.expression), this.cell(node.argumentExpression), node), result);
            else {
                const key = propertyName(node);
                if (key !== null) this.copy(this.property(this.cell(node.expression), key, node), result);
            }
        } else if (ts.isConditionalExpression(node)) {
            const condition = this.cell(node.condition), whenTrue = this.cell(node.whenTrue), whenFalse = this.cell(node.whenFalse);
            // The branch cells own unresolved values. Sealing this dependent
            // result with top would survive their later finite publication.
            this.normalResults.set(result,this.abrupt);
            let rule!: Rule;
            rule = this.rule([condition], () => {
                const state = this.primitiveState(condition,rule,true);
                if (state.pending && !state.unresolved) return;
                const truth = new Set(state.proof.values.map(Boolean));
                if (!state.proof.primitiveComplete) for (const value of condition.values) {
                    if (value.tag === "abrupt" || value.tag === "pending-source" || value.tag === "primitive") continue;
                    if (value.tag === "unknown" || value.tag === "non-string" || value.tag === "text-operation") {truth.add(false); truth.add(true);}
                    else truth.add(true);
                }
                if (state.proof.primitiveComplete && !state.proof.values.length) this.publish(result,this.abrupt);
                for (const value of truth) this.copy(value ? whenTrue : whenFalse,result);
            });
        } else if (ts.isBinaryExpression(node)) {
            if ([ts.SyntaxKind.CommaToken, ts.SyntaxKind.EqualsToken].includes(node.operatorToken.kind)) this.copy(this.cell(node.right), result);
            else if (NAME_EVALUATING_ASSIGNMENTS.has(node.operatorToken.kind) || [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
                this.copy(this.cell(node.left), result); this.copy(this.cell(node.right), result);
            }
        } else if (ts.isTemplateExpression(node)) {
            const parts: Cell[] = [];
            const literal = (text: string): void => { const cell = this.newCell(); this.publish(cell, this.text(text)); parts.push(cell); };
            literal(node.head.text);
            for (const span of node.templateSpans) { parts.push(this.cell(span.expression)); literal(span.literal.text); }
            this.publish(result, { tag: "text-operation", operation: "template", parts: this.convertList(parts,node,"text") });
        } else if (ts.isAwaitExpression(node)) {
            const operand = this.cell(node.expression);
            this.rule([operand], () => { for (const atom of operand.values) {
                if (atom.tag === "promise") {
                    this.copy(atom.value, result!);
                    const handler = this.exceptionHandlers.get(node);
                    if (handler) this.copy(atom.rejection, handler);
                } else {
                    this.publish(result!, atom);
                    const handler = this.exceptionHandlers.get(node);
                    if (handler && atom.tag !== "primitive" && atom.tag !== "non-string") this.publish(handler, this.unknown);
                }
            } });
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            // Successful [[Construct]] always produces an Object, even when
            // its target's implementation lies outside this source graph.
            if (ts.isNewExpression(node)) this.publish(result, {tag:"object",owner:this.owner(node)});
            const target = unwrap(node.expression);
            const activation=this.enclosingActivation(node);
            const superOwner=target.kind===ts.SyntaxKind.SuperKeyword && activation?.node && ts.isConstructorDeclaration(activation.node) && ts.isClassLike(activation.node.parent) ? this.function(activation.node.parent) : null;
            const objects = ts.isCallExpression(node) && ts.isIdentifier(target) ? this.withBindingObjects(target) : [];
            const constructedReceiver = this.newCell();
            this.publish(constructedReceiver,{tag:"object",owner:this.owner(node)});
            const receiver = superOwner ? superOwner.receiver : ts.isNewExpression(node) ? constructedReceiver : ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)
                ? this.cell(target.expression) : objects.length ? this.newCell() : this.empty;
            for (const object of objects) this.copy(object, receiver);
            const parts = (node.arguments ?? []).map(argument => ({ cell: this.cell(ts.isSpreadElement(argument) ? argument.expression : argument), spread: ts.isSpreadElement(argument) }));
            this.invoke(node,superOwner?.base ?? this.cell(target),receiver,parts,result,ts.isNewExpression(node) || !!superOwner,
                ts.isCallExpression(node) && !node.questionDotToken && ts.isIdentifier(target) && target.text === "eval");
        }
    }
    private invoke(node: ts.Node, callee: Cell, receiver: Cell, parts: readonly {cell:Cell;spread:boolean}[], result: Cell, construct = false, direct = false): void {
        const signature=callee.id+":"+receiver.id+":"+parts.map(part=>part.cell.id+":"+part.spread).join(",")+":"+construct+":"+direct;
        let calls=this.callResults.get(node);
        if(!calls){calls=new Map();this.callResults.set(node,calls);}
        const existing=calls.get(signature);
        if(existing){this.copy(existing,result);return;}
        calls.set(signature,result);
        const constructedReceiver=this.newCell();
        this.publish(constructedReceiver,{tag:"object",owner:this.owner(node)});
        const boundValues = new Map<string, Atom>();
        const omittedArgument = this.newCell(); this.publish(omittedArgument, this.primitive(undefined));
        const convertArguments = (args: readonly Cell[] | null): readonly Cell[] | null =>
            args ? this.convertList(args, node, "text") : null;
        const seen = new Map<Atom, Set<string>>();
        const handled = (atom: Atom, signature: string): boolean => {
            let signatures = seen.get(atom); if (!signatures) { signatures = new Set(); seen.set(atom, signatures); }
            if (signatures.has(signature)) return true; signatures.add(signature); return false;
        };
        let rule: Rule;
        rule = this.rule([callee, receiver, ...parts.map(part => part.cell)], () => {
            let constructors = this.invocations.get(rule);
            if (!constructors) { constructors = new Map(); this.invocations.set(rule, constructors); }
            constructors.clear();
            let evaluations = this.evaluationInvocations.get(rule);
            if (!evaluations) { evaluations = new Map(); this.evaluationInvocations.set(rule,evaluations); }
            evaluations.clear();
            for (const part of parts) if (part.spread) this.watchList(rule, part.cell);
            const worklist: Array<{ target: Cell; receiver: Cell; args: readonly Cell[] | null; boundPath: Set<Atom>; direct: boolean; construct: boolean }> = [
                ...this.arguments(parts).map(args => ({ target: callee, receiver: receiver, args, boundPath: new Set<Atom>(),
                    construct, direct }))];
            const routed = new Map<Atom, Set<string>>();
            while (worklist.length) {
                const invocation = worklist.pop()!; this.watch(rule, invocation.target);
                for (const atom of invocation.target.values) {
                    const signature = invocation.construct + ":" + invocation.receiver.id + ":" + (invocation.args?.map(cell => cell.id).join(",") ?? "unknown");
                    if (atom.tag === "abrupt") {this.publish(result!, atom); continue;}
                    if (atom.tag === "primitive" || atom.tag === "non-string" || atom.tag === "unknown-string" || atom.tag === "text-operation") {
                        this.publish(result,this.abrupt);
                        const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler,this.opaqueObject);
                        continue;
                    }
                    if (atom.tag === "pending-source") {this.publish(result!,atom);continue;}
                    if (atom.tag === "unknown" || atom.tag === "opaque-object") {
                        this.publish(result!, invocation.construct ? this.opaqueObject : this.unknown);
                        const handler = this.exceptionHandlers.get(node);
                        if (handler) this.publish(handler, this.unknown);
                        // Provenance distinguishes captured reads. After an
                        // opaque callee is selected its invocation effects
                        // share one signature, independent of origin count.
                        if (!handled(this.unknown,signature)) this.onActive(node,()=>{
                            this.opaqueEffect(node);
                            this.writeProperty(invocation.receiver,null,this.empty,false);
                            for(const argument of invocation.args ?? [])this.writeProperty(argument,null,this.empty,false);
                        });
                        continue;
                    }
                    const argv = invocation.args;
                    if (atom.tag === "operation" && PROPERTY_MUTATIONS.has(atom.operation)) {
                        const activation = this.enclosingActivation(node);
                        if (activation) {this.watch(rule,activation.active);if(!activation.active.values.size)continue;}
                    }
                    if (atom.tag === "bound") {
                        if (invocation.boundPath.has(atom)) continue;
                        const boundPath = new Set(invocation.boundPath); boundPath.add(atom);
                        worklist.push({ ...invocation, target: atom.target, args: argv && atom.prefix ? [...atom.prefix, ...argv] : null, direct: false,
                            receiver: invocation.construct ? invocation.receiver : atom.receiver, boundPath }); continue;
                    }
                    if (atom.tag === "operation" && ["call", "apply", "reflect-apply", "construct"].includes(atom.operation)) {
                        const previous = routed.get(atom) ?? new Set<string>();
                        if (previous.has(signature)) continue; previous.add(signature); routed.set(atom, previous);
                        const target = atom.operation === "reflect-apply" || atom.operation === "construct" ? argv?.[0] : invocation.receiver;
                        const listIndex = atom.operation === "reflect-apply" ? 2 : 1;
                        if (argv?.[listIndex]) this.watchList(rule, argv[listIndex]!);
                        const actual = atom.operation === "call" ? [argv?.slice(1) ?? null] : argv?.[listIndex] ? this.lists(argv[listIndex]!,node) : [null];
                        if (target) for (const args of actual) worklist.push({ ...invocation, target, direct: false,
                            construct: atom.operation === "construct",
                            receiver: atom.operation === "call" || atom.operation === "apply" ? argv?.[0] ?? this.empty : atom.operation === "reflect-apply" ? argv?.[1] ?? this.empty : constructedReceiver, args });
                        continue;
                    }
                    const constructorArguments = atom.tag === "intrinsic" && atom.domain === "constructor" ? convertArguments(argv) : undefined;
                    if (atom.tag === "intrinsic" && atom.domain === "constructor") {
                        for (const argument of constructorArguments ?? []) this.watchText(rule, argument);
                        constructors.set(atom.kind + ":" + signature, { kind: atom.kind, args: constructorArguments ?? null });
                    }
                    const noArguments = (constructorArguments === undefined ? argv : constructorArguments)?.some(argument => {
                        const proof = this.primitiveChoiceProof(argument);
                        return proof.primitiveComplete && !proof.values.length;
                    });
                    if (noArguments && !(atom.tag === "operation" && ["eval", "eval-script", "agent-start"].includes(atom.operation))) {
                        this.publish(result!, this.abrupt); continue;
                    }
                    if (constructorArguments?.some(argument => !this.primitiveChoiceProof(argument).primitiveComplete)) continue;
                    // Delegation remains an evolving graph edge: its
                    // target may acquire facts after this call is handled.
                    if (atom.tag === "function" && invocation.construct && ts.isClassLike(atom.owner.definition) && !atom.owner.node && atom.owner.base && !invocation.boundPath.has(atom)) {
                        const path = new Set(invocation.boundPath); path.add(atom);
                        worklist.push({...invocation, target:atom.owner.base, direct:false, boundPath:path});
                    }
                    if (invocation.construct) this.publish(result!,{tag:"object",owner:this.owner(node)});
                    const evolvingPrimitiveResult = constructorArguments !== undefined || atom.tag === "builtin" && (atom.normalResult === "primitive-string" || atom.name === "Symbol" || NUMERIC_CONVERSIONS.has(atom.name));
                    if (!evolvingPrimitiveResult && (atom.tag !== "operation" || PROPERTY_MUTATIONS.has(atom.operation)) && handled(atom, signature)) continue;
                    if (atom.tag === "intrinsic" && atom.domain === "constructor") {
                        const generated = this.generated.get(atom.kind);
                        if (!generated) this.publish(result!,this.pendingSource);
                        for (const value of generated ?? []) this.copy(value, result!);
                    } else if (atom.tag === "builtin") {
                        if (NUMERIC_CONVERSIONS.has(atom.name)) {
                            const handler = this.exceptionHandlers.get(node);
                            if (!argv) {this.publish(result, invocation.construct ? this.opaqueObject : this.nonString); if (handler) this.publish(handler, this.unknown); this.onActive(node, () => this.opaqueEffect(node)); continue;}
                            if (atom.name === "Number" && argv.length === 0) {if (!invocation.construct) this.publish(result, this.primitive(0)); continue;}
                            const converted = this.coerceCell(argv[0] ?? omittedArgument, node, atom.name); this.watchText(rule, converted);
                            if (!invocation.construct) this.copy(converted, result);
                            continue;
                        }
                        if (atom.name === "Symbol") {
                            const handler = this.exceptionHandlers.get(node);
                            if (invocation.construct) {this.publish(result, this.abrupt); if (handler) this.publish(handler, this.opaqueObject); continue;}
                            this.normalResults.set(result, this.nonString);
                            if (!argv) {this.publish(result, this.nonString); if (handler) this.publish(handler, this.unknown); this.onActive(node, () => this.opaqueEffect(node)); continue;}
                            let allocations = this.symbolAllocations.get(node);
                            if (!allocations) {allocations = new Map(); this.symbolAllocations.set(node, allocations);}
                            const descriptions: (string | undefined)[] = [];
                            if (!argv[0] || argv[0].values.has(this.primitive(undefined))) descriptions.push(undefined);
                            if (argv[0]) {
                                let input = this.symbolDescriptionInputs.get(argv[0]);
                                if (!input) {
                                    input = this.newCell(); this.symbolDescriptionInputs.set(argv[0], input);
                                    const description = input, argument = argv[0];
                                    this.rule([argument], () => {for (const value of argument.values) if (value !== this.primitive(undefined)) this.publish(description, value);});
                                }
                                const converted = this.stringHintCell(input, node); this.watchText(rule, converted);
                                const proof = this.primitiveChoiceProof(converted);
                                if (!proof.primitiveComplete) {for (const value of converted.values) if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value.tag === "unknown" ? this.nonString : value);}
                                else descriptions.push(...proof.values.map(String));
                                if (proof.primitiveComplete && !proof.values.length) this.publish(result, this.abrupt);
                            }
                            for (const description of descriptions) {
                                let symbol = allocations.get(description);
                                if (!symbol) {symbol = Symbol(description); allocations.set(description, symbol); this.freshSymbols.add(symbol);}
                                this.publish(result, this.primitive(symbol));
                            }
                            continue;
                        }
                        const stringValue = atom.normalResult === "primitive-string" && argv?.[0]
                            ? this.stringHintCell(argv[0], node, !invocation.construct) : undefined;
                        if (stringValue && !invocation.construct) this.normalResults.set(result,this.abrupt);
                        if (stringValue) this.watch(rule, stringValue);
                        if (!invocation.construct) {
                            if (atom.normalResult === "primitive-string") {
                                if (argv === null) this.publish(result!, this.unknownString);
                                else if (argv.length === 0) this.publish(result!, this.primitive(""));
                                else {
                                    this.copy(stringValue!, result!);
                                }
                            } else if (atom.normalResult === "boolean") {
                                this.publish(result!, this.primitive(false));
                                this.publish(result!, this.primitive(true));
                            } else this.publish(result!, atom.normalResult === "non-string" ? this.nonString :
                                atom.normalResult === "object" ? this.opaqueObject : this.unknown);
                        }
                        const handler = this.exceptionHandlers.get(node);
                        if (handler) {
                            if (atom.normalResult !== "primitive-string" || invocation.construct) this.publish(handler, this.opaqueObject);
                            // Coercion can call arbitrary user code. A
                            // result category cannot erase its exceptions.
                            if (atom.normalResult === "unknown" || argv === null || atom.normalResult !== "primitive-string" && argv.some(argument =>
                                [...argument.values].some(value => value.tag !== "primitive" && value.tag !== "non-string")))
                                this.publish(handler, this.unknown);
                        }
                    } else if (atom.tag === "function") {
                        if (ts.isClassLike(atom.owner.definition) && !invocation.construct) {
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.publish(handler,this.opaqueObject);
                            // This target always throws; it has no String
                            // normal completion for source admission.
                            this.publish(result!,this.abrupt);
                            continue;
                        }
                        this.onActive(node,()=>this.publish(atom.owner.active,this.primitive(true)));
                        if (invocation.construct) {
                            const instance = this.owner(node);
                            instance.prototype ??= this.newCell();
                            this.copy(this.property(invocation.target,"prototype"),instance.prototype);
                        }
                        this.copy(invocation.receiver, atom.owner.receiver);
                        if(invocation.construct && ts.isClassLike(atom.owner.definition) && !atom.owner.node && atom.owner.base){
                            continue;
                        }
                        for (const [index, parameter] of (atom.owner.node?.parameters ?? []).filter(parameter => !ts.isIdentifier(parameter.name) || parameter.name.text !== "this").entries()) {
                            if (parameter.dotDotDotToken) {
                                const rest: Cell = this.newCell();
                                const restOwner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell()};
                                restOwner.listLength = this.field(restOwner, "length");
                                if (argv) this.publish(restOwner.listLength, this.primitive(Math.max(0, argv.length - index)));
                                else this.publish(restOwner.listLength, this.unknown);
                                for(const [offset,value] of (argv?.slice(index) ?? []).entries())this.copy(value,this.field(restOwner,String(offset)));
                                this.publish(rest, {tag:"object",owner:restOwner});
                                this.bind(parameter.name, rest);
                            } else if (argv?.[index]) this.bind(parameter.name, argv[index]!);
                            if (parameter.initializer) this.bind(parameter.name, this.cell(parameter.initializer));
                        }
                        if (atom.owner.kind.includes("generator")) this.publish(result!, { tag: "generator", owner: atom.owner });
                        else if (atom.owner.kind === "async") this.publish(result!, { tag: "promise", value: atom.owner.returns, rejection: atom.owner.throws });
                        else {
                            if (invocation.construct) {
                                this.rule([atom.owner.returns],()=>{
                                    for (const value of atom.owner.returns.values)
                                        if (value.tag !== "primitive" && value.tag !== "non-string" && value.tag !== "text-operation" && value.tag !== "abrupt") this.publish(result!,value);
                                });
                            } else this.copy(atom.owner.returns, result!);
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.copy(atom.owner.throws, handler);
                        }
                    } else if (atom.tag === "operation") {
                        if (atom.operation === "symbol-for") {
                            this.normalResults.set(result, this.nonString);
                            if (!argv) {this.publish(result, this.nonString); const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler, this.unknown); this.onActive(node, () => this.opaqueEffect(node)); continue;}
                            const key = this.stringHintCell(argv[0] ?? omittedArgument, node); this.watchText(rule, key);
                            const proof = this.primitiveChoiceProof(key);
                            if (!proof.primitiveComplete) {for (const value of key.values) if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value.tag === "unknown" ? this.nonString : value);}
                            else if (!proof.values.length) this.publish(result, this.abrupt);
                            for (const value of proof.values) {
                                const text = String(value); let symbol = this.symbolRegistry.get(text);
                                if (!symbol) {symbol = Symbol(text); this.symbolRegistry.set(text, symbol);}
                                this.publish(result, this.primitive(symbol));
                            }
                            continue;
                        }
                        if (atom.operation === "symbol-key-for") {
                            if (!argv) {this.publish(result, this.unknown); continue;}
                            const input = argv[0] ?? omittedArgument; this.watch(rule, input);
                            for (const value of input.values) {
                                if (value.tag === "primitive" && typeof value.value === "symbol")
                                    this.publish(result, this.primitive([...this.symbolRegistry].find(([, symbol]) => symbol === value.value)?.[0]));
                                else if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value);
                                else {this.publish(result, this.abrupt); const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler, this.opaqueObject);}
                            }
                            continue;
                        }
                        if(atom.operation==="own-descriptor"||atom.operation==="own-descriptors"){
                            if(argv?.[0]){
                                const key=atom.operation==="own-descriptor"?argv?.[1]??this.newCell():null;
                                if(key && !argv?.[1])this.publish(key,this.primitive(undefined));
                                this.ownDescriptors(argv[0],key,node,result!);
                            }else this.publish(result!,this.unknown);
                            continue;
                        }
                        if(atom.operation==="host-gc")this.publish(result!,this.primitive(undefined));
                        if(atom.operation==="host-print"){
                            this.publish(result!,this.primitive(undefined));
                            const handler=this.exceptionHandlers.get(node);
                            if (argv === null) {if (handler) this.publish(handler, this.unknown);}
                            else for (const argument of argv) {
                                const converted = this.primitiveConversion(argument, node);
                                if (handler && this.primitiveState(converted, rule, true).unresolved) this.publish(handler, this.unknown);
                                else this.watchText(rule, converted);
                            }
                        }
                        if(PROPERTY_MUTATIONS.has(atom.operation)){
                            const handler=this.exceptionHandlers.get(node);
                            if(handler)this.publish(handler,this.unknown);
                            const target=argv?.[0],key=argv?.[1];
                            if(!target){this.publish(this.globalMutation,this.unknown);continue;}
                            if(atom.operation==="define-properties" && argv?.[1])this.defineProperties(target,argv[1],node);
                            else if(atom.operation==="define-property" && key && argv?.[2])this.defineProperty(target,key,argv[2],node);
                            else if(key){const value=atom.operation==="set-property" && argv?.[2]?argv[2]:this.newCell();
                                if(atom.operation==="delete-property")this.publish(value,this.unknown);
                                this.writeComputedProperty(target,key,value,atom.operation==="delete-property"?"delete":"set",node,atom.operation==="set-property"?argv?.[3]??target:target);
                            }else this.writeProperty(target,null,this.empty,true,"define",node);
                            if(atom.operation==="define-property"||atom.operation==="define-properties")this.copy(target,result!);
                            else {this.publish(result!,this.primitive(false));this.publish(result!,this.primitive(true));}
                            continue;
                        }
                        if (atom.operation === "bind") {
                            let value = boundValues.get(signature);
                            if (!value) {
                                const fields: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
                                this.copy(this.opaqueMutation,fields.shape);
                                value = { tag: "bound", target: invocation.receiver, receiver: argv?.[0] ?? this.empty, prefix: argv?.slice(1) ?? null, fields }; boundValues.set(signature, value);
                                const length=this.property(invocation.receiver,"length",node,true),boundLength=this.newCell();
                                const name = this.property(invocation.receiver, "name", node), boundName = this.newCell();
                                this.defineField(fields, "name", boundName);
                                const primitiveName = this.newCell();
                                const derivedName: Atom = {tag:"text-operation",operation:"bound-name",parts:[primitiveName]};
                                this.rule([name], () => {
                                    for (const spelling of name.values) {
                                        if (spelling.tag === "primitive" || spelling.tag === "text-operation") {
                                            this.publish(primitiveName, spelling);
                                            this.publish(boundName, derivedName);
                                        } else if (spelling.tag === "unknown" || spelling.tag === "non-string") this.publish(boundName, this.unknown);
                                        else if (spelling.tag !== "pending-source" && spelling.tag !== "abrupt") this.publish(boundName, this.primitive("bound "));
                                    }
                                });
                                this.defineField(fields,"length",boundLength);
                                let lengthRule!:Rule;
                                lengthRule=this.rule([length],()=>{
                                    if(!length.values.size)return;
                                    this.watchText(lengthRule,length);
                                    const proof=this.primitiveChoiceProof(length);
                                    if(!argv || [...length.values].some(value=>value.tag==="unknown"||value.tag==="non-string"))this.publish(boundLength,this.nonString);
                                    for(const count of length.values){
                                        if(count.tag!=="primitive" && count.tag!=="text-operation" && count.tag!=="pending-source" && count.tag!=="unknown" && count.tag!=="non-string" && count.tag!=="abrupt")this.publish(boundLength,this.primitive(0));
                                    }
                                    for(const count of proof.values){
                                        const integer=typeof count==="number"?(Number.isNaN(count)?0:Math.trunc(count)):0;
                                        this.publish(boundLength,this.primitive(Math.max(integer-(argv?Math.max(argv.length-1,0):0),0)));
                                    }
                                });
                                this.rule([invocation.receiver], () => {
                                    for (const target of invocation.receiver.values) {
                                        if(target.tag==="unknown"||target.tag==="opaque-object")this.onActive(node,()=>this.opaqueEffect(node));
                                        const owner = this.ordinaryOwner(target);
                                        if (owner?.prototype) this.copy(owner.prototype, fields.prototype!);
                                        else if (target.tag === "operation") this.copy(this.callablePrototype("ordinary"), fields.prototype!);
                                        else this.publish(fields.prototype!, this.unknown);
                                    }
                                });
                            }
                            this.publish(result!, value);
                        }
                        if (atom.operation === "function-text") {
                            for (const receiver of invocation.receiver.values) {
                                if (receiver.tag === "function") this.publish(result!, this.text(receiver.owner.sourceText));
                                else if (receiver.tag === "bound") this.publish(result!, this.text("function () { [native code] }"));
                                else if (receiver.tag === "builtin" && receiver.normalResult !== "not-callable")
                                    this.publish(result!, this.text(`function ${receiver.name}() { [native code] }`));
                                else if(receiver.tag==="primitive") {
                                    this.publish(result!,this.abrupt);
                                    const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.opaqueObject);
                                } else this.publish(result!, receiver.tag === "pending-source" ? receiver : this.unknown);
                            }
                            this.watch(rule, invocation.receiver);
                        }
                        if (atom.operation === "realm") this.publish(result!, this.realm);
                        if (atom.operation === "eval" || atom.operation === "eval-script" || atom.operation === "agent-start") {
                            const source = argv?.[0] ? atom.operation === "eval" ? argv[0] : this.stringHintCell(argv[0], node) : null;
                            const direct = atom.operation === "eval" && invocation.direct;
                            const key = result!.id + ":" + atom.operation + ":" + direct + ":" + (source?.id ?? (argv ? "omitted" : "unknown"));
                            evaluations.set(key, { node, operation: atom.operation, direct, source, unknown: !argv });
                            if (noArguments) {this.publish(result!, this.abrupt); continue;}
                            if (source) {
                                this.watchText(rule, source);
                                const proof = this.primitiveChoiceProof(source);
                                if (proof.primitiveComplete && !proof.values.length) this.publish(result!, this.abrupt);
                                for (const text of proof.values) {
                                    if (atom.operation === "eval" && typeof text !== "string") {
                                        this.publish(result!, this.primitive(text));
                                        continue;
                                    }
                                    const generated = this.evaluations.get(String(text));
                                    if (!generated) this.publish(result!,this.pendingSource);
                                    if (this.invalidEvaluations.has(String(text))) {
                                        const handler = this.exceptionHandlers.get(node);
                                        if (handler) this.onActive(node, () => this.publish(handler, this.opaqueObject));
                                    }
                                    for (const value of generated ?? []) this.copy(value, result!);
                                }
                                if (atom.operation === "eval") for (const value of source.values) {
                                    if (value.tag === "unknown-string") this.publish(result,this.unknown);
                                    else if ((value.tag !== "text-operation" || value.operation === "prefix" || value.operation === "numeric" && value.numeric!.conversion !== "default") && (value.tag !== "primitive" || typeof value.value !== "string")) this.publish(result!, value);
                                }
                            } else if (argv && atom.operation === "eval") this.publish(result!, this.primitive(undefined));
                        }
                        if (atom.operation === "prototype" && argv?.[0]) {
                            const input = argv[0]; this.watch(rule, input);
                            for (const value of input.values) {
                                const owner = this.ordinaryOwner(value);
                                if (owner?.prototype) {this.copy(owner.prototype,result!);this.watch(rule,owner.prototype);}
                                else if (value.tag === "generator") this.publish(result!, this.intrinsic("instance", value.owner.kind));
                                else this.publish(result!,value.tag === "pending-source" ? value : this.unknown);
                            }
                        }
                    }
                }
            }
        });
    }
    private watchList(rule: Rule, cell: Cell): void {
        const pending = [cell], visited = new Set<Cell>();
        while (pending.length) {
            const input = pending.pop()!; if (visited.has(input)) continue; visited.add(input); this.watch(rule, input);
            for (const atom of input.values) if (atom.tag === "object") {
                this.watch(rule, atom.owner.shape);
                if (atom.owner.listLength) pending.push(atom.owner.listLength);
                for (const field of atom.owner.fields.values()) pending.push(field);
            }
        }
    }
    private watchText(rule: Rule, root: Cell): void {
        // Publication walks the reverse dependency graph and wakes these
        // subscribers when any primitive part changes.
        this.watch(rule,root);
    }
    private choices(root: Cell): string[] | null {
        const proof = this.primitiveChoiceProof(root);
        return proof.primitiveComplete ? [...new Set(proof.values.map(String))] : null;
    }
    private primitiveChoiceProof(root: Cell): PrimitiveChoiceProof {
        this.flushPrimitiveChanges();
        const incomplete: PrimitiveChoiceProof = { values: [], primitiveComplete: false, textComplete: false };
        const pending = [{ cell: root, finish: false }], active = new Set<Cell>(), proofs = new Map<Cell, PrimitiveChoiceProof>();
        const path:Cell[] = [], positions = new Map<Cell,number>(), cycles = new Set<Cell>();
        while (pending.length) {
            const task = pending.pop()!;
            if (proofs.has(task.cell)) continue;
            const cached = this.primitiveProofCache.get(task.cell);
            if (cached) {proofs.set(task.cell,cached); continue;}
            if (task.finish) {
                active.delete(task.cell);
                positions.delete(task.cell); path.pop();
                const choices = new Map<Atom, Primitive>();
                const add = (value: Primitive): void => {choices.set(this.primitive(value),value);};
                let primitiveComplete = task.cell.values.size > 0, textComplete = true;
                for (const atom of task.cell.values) {
                    if (atom.tag === "primitive") add(atom.value);
                    else if (atom.tag === "abrupt") continue;
                    else if (atom.tag === "text-operation") {
                        const complete = atom.parts.every(part => proofs.get(part)?.primitiveComplete);
                        const booleanPrefix = atom.operation === "prefix" && atom.operator === ts.SyntaxKind.ExclamationToken;
                        const noNormal = atom.parts.some(part => proofs.get(part)?.primitiveComplete && !proofs.get(part)!.values.length);
                        const booleanResult = atom.operation === "numeric" && atom.numeric!.result === "boolean" && !noNormal &&
                            atom.parts.every(part => !this.primitiveReadiness(part).pending);
                        primitiveComplete &&= complete || booleanPrefix || booleanResult || noNormal;
                        textComplete &&= complete || atom.operation === "prefix" || atom.operation === "coerce" || atom.operation === "numeric" && atom.numeric!.conversion !== "default";
                        if (noNormal) continue;
                        if (!complete && booleanResult) {add(false); add(true); continue;}
                        if (!complete && booleanPrefix) { add(false); add(true); continue; }
                        // An incomplete operand cannot prove a finite result
                        // collection. Enumerating partial cyclic choices can
                        // manufacture an unbounded String language here.
                        if (!complete) continue;
                        const combinations = this.primitiveTuples(atom.parts.map(part => proofs.get(part)?.values ?? []));
                        for (const tuple of combinations) {
                            if (atom.operation === "prefix") {
                                // Primitive operators have no user callbacks. Abrupt
                                // numeric conversions contribute no normal choice.
                                add(!tuple[0]);
                            } else if (atom.operation === "numeric") {
                                try {add(atom.numeric!.evaluate(tuple));} catch {}
                            } else if (atom.operation === "coerce") {
                                try {add(NUMERIC_CONVERSIONS.get(atom.conversion!)!(tuple[0]!));} catch {}
                            } else if (atom.operation === "bound-name") add("bound " + (typeof tuple[0] === "string" ? tuple[0] : ""));
                            else if (atom.operation === "template") {if (!tuple.some(value => typeof value === "symbol")) add(tuple.map(String).join(""));}
                        }
                    } else {primitiveComplete = false; if (atom.tag === "unknown-string") textComplete = false;}
                }
                if (cycles.has(task.cell)) {
                    const booleanDomain = [...task.cell.values].every(atom => atom.tag === "abrupt" ||
                        atom.tag === "primitive" && typeof atom.value === "boolean" || atom.tag === "text-operation" &&
                        (atom.operation === "prefix" || atom.operation === "numeric" && atom.numeric!.result === "boolean"));
                    proofs.set(task.cell,{values:booleanDomain ? [false,true] : [],primitiveComplete:booleanDomain,textComplete});
                } else proofs.set(task.cell, {values: [...choices.values()], primitiveComplete, textComplete});
            } else {
                // A cyclic value edge has no finite scalar proof. Continue
                // the postorder pass so its consumer can still prove a
                // non-String result independently of the unknown magnitude.
                if (active.has(task.cell)) {
                    for (let index=positions.get(task.cell)!; index<path.length; index++) cycles.add(path[index]!);
                    continue;
                }
                active.add(task.cell); positions.set(task.cell,path.length); path.push(task.cell); pending.push({ ...task, finish: true });
                for (const atom of task.cell.values) if (atom.tag === "text-operation") for (const cell of atom.parts) pending.push({ cell, finish: false });
            }
        }
        for (const [cell,proof] of proofs) this.primitiveProofCache.set(cell,proof);
        return proofs.get(root) ?? incomplete;
    }
    solve(): { constructors: ConstructorInvocation[]; evaluations: EvaluationInvocation[] } {
        for (;;) {
            while (this.initializers.length || this.queueCursor < this.queue.length || this.primitiveChanges.size) {
                if (this.initializers.length) { const initializer = this.initializers.pop()!; this.initialize(initializer.node, initializer.result); }
                else if (this.primitiveChanges.size) this.flushPrimitiveChanges();
                else {
                    const rule = this.queue[this.queueCursor++]!; rule.queued = false; rule.run();
                    if (this.queueCursor * 2 >= this.queue.length) {this.queue.splice(0,this.queueCursor); this.queueCursor=0;}
                }
            }
            this.queue.length = 0; this.queueCursor = 0;
            // Empty expression facts mean unresolved value flow, not an
            // impossible branch. Seal them only after the known graph closes,
            // then propagate the same interned top fact through normal edges.
            let changed = false;
            for (const cell of this.exceptionCells) if (!cell.values.size) {this.publish(cell, this.abrupt); changed = true;}
            for (const cell of this.accessorSlots) if (!cell.values.size) {this.publish(cell, this.primitive(undefined)); changed = true;}
            if (changed) continue;
            for (const [node, cell] of this.cells) if (!cell.values.size) {
                const activation = this.enclosingActivation(node);
                if (activation && !activation.active.values.size) continue;
                // [[Construct]] either throws or returns an Object. Its
                // properties and conversion remain opaque, but eval retains
                // the object unchanged without needing a source-text proof.
                this.publish(cell, this.normalResults.get(cell) ?? (ts.isNewExpression(node) ? this.opaqueObject : this.unknown)); changed = true;
            }
            if (!changed) break;
        }
        return {
            constructors: [...this.invocations.values()].flatMap(records => [...records.values()]).map(invocation => {
                const choices = invocation.args?.map(cell => this.choices(cell));
                return {kind: invocation.kind, choices: choices && choices.every(value => value !== null) ? choices : null};
            }),
            evaluations: [...this.evaluationInvocations.values()].flatMap(records => [...records.values()]).map(invocation => {
                const { source, operation, unknown } = invocation;
                const proof = source ? this.primitiveChoiceProof(source) : undefined;
                const primitives = proof?.values ?? [];
                const unresolved = unknown || source && (!source.values.size ||
                    [...source.values].some(value => value.tag === "unknown" || value.tag === "pending-source") ||
                    !proof!.textComplete || operation !== "eval" && !proof!.primitiveComplete);
                const choices = unresolved ? null : source
                    ? [...new Set(primitives.filter(value => operation !== "eval" || typeof value === "string").map(String))]
                    : operation !== "eval" ? ["undefined"] : [];
                return { node: invocation.node, operation, direct: invocation.direct, choices };
            }),
        };
    }
}

export function sourceConstructorInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): ConstructorInvocation[] {
    return new SourceValueFlow(program, entries).solve().constructors;
}

export function sourceEvaluationInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): EvaluationInvocation[] {
    return new SourceValueFlow(program, entries).solve().evaluations;
}
