import {sourceNumericOperation, type SourceNumericOperation, type SourcePrimitive} from "./source-numeric-operations";
import ts from "typescript";
import { callableSourceText } from "./callable-source-text";
import { normalizeAssignmentTarget, unwrapTransparentExpression as unwrap } from "./emit/binding-tree";
import { callableNameInput, expectedArgumentCount, functionBodyCompletions, statementBodyCompletions, type FunctionBodyCompletions, type StatementBodyCompletions, NAME_EVALUATING_ASSIGNMENTS } from "./function-static-semantics";
import {consoleOperations} from "./console-operations";
import {jsonMethods, jsonOperations, type JSONSourceOperation} from "./json-methods";
import {test262AgentOperations} from "./test262-agent-operations";
import { sourceUnitBodyIncluded, sourceUnitFileName } from "./program";
import { ecmaParseGoal } from "./ecmascript-source";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { staticStringExpressionTexts } from "./module-specifiers";
import { functionKindForDeclaration, functionConstructorDisplaySource, type DynamicFunctionKind, type FunctionConstructorEntry } from "./function-constructor-source";

import {declarativeSourceBindingSymbol, isAmbientSourceDeclaration, sourceDeclarationIntroducesBinding, sourceBindingTarget} from "./source-bindings";
import {runtimeGlobalBindings, runtimeErrorKinds, runtimeIteratorMethods, runtimeObjectPrototypeMethods, runtimeWellKnownSymbolDescriptions, type RuntimeGlobalBinding} from "./global-bindings";

export interface SourceValueGraphEntries {
    readonly roots?: readonly string[];
    readonly functions?: readonly FunctionConstructorEntry[];
    readonly evaluations?: readonly { readonly source: string; readonly entry: string | null; readonly kind?: string; readonly domain?: string }[];
}
export function sourceAgentDomain(source:string):string {return "agent:"+createHash("sha256").update(source).digest("hex");}
export interface ConstructorInvocation {
    readonly domain?: string;
    readonly kind: DynamicFunctionKind;
    /** Null means that the actual List cannot be proved finite. The explicit
     * registry remains available; runtime selection still fails closed. */
    readonly choices: readonly (readonly string[])[] | null;
}
export interface EvaluationInvocation {
    readonly domain?: string;
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
    "define-property" | "define-properties" | "set-property" | "delete-property" | "own-descriptor" | "own-descriptors" | "function-text" | "symbol-for" | "symbol-key-for" | "array-join" | "array-values" | "json-stringify" | "json-parse" | "json-raw" | "json-is-raw" | "error-text" | `agent-member:${string}`;
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
    ["length", (value: Primitive) => {
        const number=+(value as number);
        return number>0?Math.min(Math.trunc(number),Number.MAX_SAFE_INTEGER):0;
    }],
]);
interface PrimitiveChoiceProof {
    readonly values: readonly Primitive[];
    readonly primitiveComplete: boolean;
    readonly textComplete: boolean;
}
interface PrimitiveReadiness {pending:boolean; pendingSource:boolean; unresolved:boolean; scalarUnresolved:boolean;}
interface ListPart { readonly cell: Cell; readonly spread: boolean; }
const KIND_UNDEFINED=1,KIND_NULL=2,KIND_BOOLEAN=4,KIND_NUMBER=8,KIND_BIGINT=16,KIND_STRING=32,KIND_SYMBOL=64,KIND_OBJECT=128,KIND_FUNCTION=256;
const KIND_PRIMITIVE=KIND_UNDEFINED|KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_BIGINT|KIND_STRING|KIND_SYMBOL;
const KIND_NUMERIC=KIND_NUMBER|KIND_BIGINT,KIND_ALL=KIND_PRIMITIVE|KIND_OBJECT|KIND_FUNCTION;
type ArgumentSequence = { readonly id: number; readonly context: ts.Node; readonly positions: Map<number, Cell> } & (
    { readonly kind: "parts"; readonly parts: readonly ListPart[] } |
    { readonly kind: "slice"; readonly source: ArgumentSequence; readonly offset: number } |
    { readonly kind: "prepend"; readonly source: ArgumentSequence; readonly prefix: readonly Cell[] });
type Atom =
    | { readonly tag: "builtin"; readonly name: string; readonly normalResult: NonNullable<RuntimeGlobalBinding["normalResult"]>; readonly fields: ObjectOwner }
    | { readonly tag: "intrinsic"; readonly domain: Domain; readonly kind: DynamicFunctionKind }
    | { readonly tag: "function"; readonly owner: FunctionOwner }
    | { readonly tag: "object"; readonly owner: ObjectOwner }
    | { readonly tag: "operation"; readonly operation: Operation }
    | { readonly tag: "bound"; readonly target: Cell; readonly receiver: Cell; readonly prefix: readonly Cell[] | null; readonly fields: ObjectOwner }
    | { readonly tag: "primitive"; readonly value: Primitive }
    | { readonly tag: "non-string"; readonly kinds?: number }
    | { readonly tag: "unknown-string" }
    | { readonly tag: "abrupt" }
    | { readonly tag: "pending-source" }
    | { readonly tag: "descriptor"; readonly identity: object }
    | { readonly tag: "unknown"; readonly origin?: ts.Node }
    | { readonly tag: "opaque-object" }
    | { readonly tag: "text-operation"; readonly operation: "numeric" | "template" | "bound-name" | "prefix" | "coerce" | "error-text"; readonly numeric?: SourceNumericOperation; readonly conversion?: string; readonly operator?: ts.PrefixUnaryOperator; readonly parts: readonly Cell[] }
    | { readonly tag: "text-operation"; readonly operation: "array-join"; readonly parts: readonly Cell[]; readonly indexedRange: {readonly length:number;readonly positions:readonly number[]} }
    | { readonly tag: "promise"; readonly value: Cell; readonly rejection: Cell }
    | { readonly tag: "generator"; readonly owner: FunctionOwner }
    | { readonly tag: "global" } | { readonly tag: "host" } | { readonly tag: "agent" } | { readonly tag: "realm-record" };
class SourceFacts extends Set<Atom> {
    readonly sources = new Set<SourceFacts>();
    private readonly memberships = new Set<Atom>();
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
        if (Set.prototype.has.call(this, atom) || this.memberships.has(atom)) return true;
        const pending:SourceFacts[] = [this], visited = new Set<SourceFacts>();
        while (pending.length) {
            const facts = pending.pop()!;
            if (visited.has(facts)) continue; visited.add(facts);
            if (Set.prototype.has.call(facts,atom) || facts.memberships.has(atom)) {
                // Facts and copy edges only grow. A positive membership proof
                // remains valid throughout this graph's monotone solution.
                this.memberships.add(atom); return true;
            }
            for (const source of facts.sources) pending.push(source);
        }
        return false;
    }
    override get size(): number {let size=0; for (const _ of this) size++; return size;}
}
interface Cell { readonly id: number; readonly values: SourceFacts; readonly users: Set<Rule>; }
interface Rule { readonly inputs: Set<Cell>; readonly run: () => void; queued: boolean; }
interface OwnPresence {
    readonly facts: Cell;
    readonly writes: Map<ts.Node,{base:Cell;receiver:Cell;mode:"set"|"define"|"delete"}>;
    readonly contexts: Map<ts.Node|undefined,Cell>;
    initial: boolean;
}
interface ObjectOwner { readonly fields: Map<SourcePropertyKey, Cell>; readonly accessors: Map<SourcePropertyKey|null, {get:Cell;set:Cell}>; readonly shape: Cell; computedDefinitions?: {key:Cell;defined:Cell;context:ts.Node}[]; own?: Map<SourcePropertyKey, OwnPresence>; listLength?: Cell; listSources?: readonly Cell[]; prototype?: Cell; closedIndices?:boolean; rawJSON?:Cell; }
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
    ["JSON", new Map([...jsonMethods.values()].map(descriptor=>[descriptor.name,descriptor.operation]))],
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
    private readonly presenceRules = new Set<Rule>();
    private presenceClosed = false;
    private readonly errorPrototypes = new Map<string,Cell>();
    private readonly nativeExceptions = new Map<ts.Node,Atom>();
    private readonly errorStrings = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly jsonSerializations = new Map<ts.Node, Map<string, Cell>>();
    private readonly rawJSONResults = new Map<ts.Node, Map<Cell, Cell>>();
    private readonly jsonParses = new Map<ts.Node, Map<string, Cell>>();
    private readonly normalResults = new Map<Cell, Atom>();
    private readonly exceptionHandlers = new Map<ts.Node, Cell>();
    private readonly exceptionCells = new Set<Cell>();
    private readonly catchGuards = new Map<ts.CatchClause, Cell>();
    private readonly bindings = new Map<ts.Symbol, Cell>();
    private readonly globals = new Map<string, Cell>();
    private readonly globalLexicals = new Map<string, Cell>();
    private readonly objects = new Map<ts.Node, ObjectOwner>();
    private readonly literalLists = new WeakMap<ObjectOwner,{node:ts.ArrayLiteralExpression;parts:readonly ListPart[];holes:ReadonlySet<Cell>}>();
    private readonly arrayLikeLengths = new Map<Cell,Map<ts.Node,Cell>>();
    private readonly indexedReads = new Map<Cell,Map<ts.Node,Map<string,Cell>>>();
    private readonly iterationMethods = new Map<Cell,Map<ts.Node|undefined,Cell>>();
    private readonly iterationRecords = new Map<Cell,Cell>();
    private readonly arrayIterators = new Map<ts.Node,Map<Cell,Cell>>();
    private ordinaryIteratorPrototype?:Cell;
    private ordinaryArrayIteratorPrototype?:Cell;
    private readonly iterationElements = new Map<Cell, Map<ts.Node, Cell>>();
    private readonly argumentValues = new Map<ArgumentSequence, Cell>();
    private readonly argumentSequences = new Map<ts.Node, Map<string, ArgumentSequence>>();
    private nextArgumentSequence = 0;
    private readonly arrayLikeObjectInputs = new Map<Cell,Cell>();
    private readonly functions = new Map<CallableDefinition, FunctionOwner>();
    private readonly ownerAtoms = new WeakMap<ObjectOwner | FunctionOwner, Map<Atom["tag"], Atom>>();
    private readonly promiseAtoms = new WeakMap<Cell, WeakMap<Cell, Atom>>();
    private readonly restLocations = new Map<ts.ParameterDeclaration, {value: Cell; owner: ObjectOwner}>();
    private readonly moduleNamespaces = new Map<ts.SourceFile, {value: Cell; owner: ObjectOwner}>();
    private readonly moduleMetadata = new Map<ts.SourceFile, Cell>();
    private readonly moduleNamespacePending: {source: ts.SourceFile; symbol: ts.Symbol; owner: ObjectOwner}[] = [];
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
    private readonly numericValues = new Map<number, Atom>();
    private readonly unknown: Atom = { tag: "unknown" };
    private readonly opaqueObject: Atom = { tag: "opaque-object" };
    private readonly abrupt: Atom = {tag:"abrupt"};
    private readonly pendingSource: Atom = {tag:"pending-source"};
    private readonly evaluations = new Map<string, Cell[]>();
    private readonly evaluationThrows = new Map<string,Cell[]>();
    private readonly scriptCompletions = new Map<ts.SourceFile,{summary:StatementBodyCompletions;throws:Cell}>();
    private readonly evaluationOrigins = new Map<string, Cell[]>();
    private readonly sourceOrigins = new Map<ts.SourceFile, Cell>();
    private readonly dynamicSourceTexts = new Map<FunctionNode, string>();
    private readonly callablePrototypes = new Map<DynamicFunctionKind, Cell>();
    private ordinaryObjectPrototype?: Cell;
    private ordinaryArrayPrototype?: Cell;
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
    private readonly originCells = new WeakMap<ts.Node, Cell>();
    private readonly unconstrainedOrigins = this.newCell();
    private readonly scriptOrder = new Map<ts.SourceFile, number>();
    private readonly dynamicContexts = new WeakMap<ts.Node, boolean>();
    private readonly sourceFiles = new WeakMap<ts.Node, ts.SourceFile>();
    private readonly sourceStarts = new WeakMap<ts.Node, number>();
    private readonly executionGuards = new WeakMap<ts.Node, readonly {condition: Cell; truthy: boolean}[]>();
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
    private readonly primitiveKindCache = new Map<Cell, number>();
    private readonly primitiveProofParents = new Map<Cell, Set<Cell>>();
    private readonly primitiveReadyCache = new Map<Cell, PrimitiveReadiness>();
    private readonly primitiveChanges = new Set<Cell>();
    private readonly hostOwners = new Map<"host" | "agent", ObjectOwner>();
    private readonly intrinsicOwners = new Map<Atom, ObjectOwner>();
    private readonly checker: ts.TypeChecker;
    private readonly invalidEvaluations = new Set<string>();
    constructor(program: ts.Program, entries: SourceValueGraphEntries, private readonly domain?:string, sources?:ReadonlySet<ts.SourceFile>) {
        this.checker = program.getTypeChecker();
        for (const [index,filename] of (entries.roots??[]).entries()) {
            const file=program.getSourceFile(sourceUnitFileName(program,path.resolve(filename),"script"));
            if(file&&ecmaParseGoal(file)==="script"&&(!sources||sources.has(file)))this.scriptOrder.set(file,index);
        }
        for (const source of this.scriptOrder.keys()) for (const statement of source.statements) {
            if (isAmbientSourceDeclaration(statement)) continue;
            if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped) {
                for (const declaration of statement.declarationList.declarations) {
                    const pending: ts.BindingName[] = [declaration.name];
                    while (pending.length) {
                        const name = pending.pop()!;
                        if (ts.isIdentifier(name)) {
                            if (!this.globalLexicals.has(name.text)) this.globalLexicals.set(name.text, this.newCell());
                        } else for (const element of name.elements) if (!ts.isOmittedExpression(element)) pending.push(element.name);
                    }
                }
            } else if (ts.isClassDeclaration(statement) && statement.name) {
                if (!this.globalLexicals.has(statement.name.text)) this.globalLexicals.set(statement.name.text, this.newCell());
                this.copy(this.cell(statement), this.globalLexicals.get(statement.name.text)!);
            } else if (ts.isFunctionDeclaration(statement) && statement.name)
                this.copy(this.cell(statement), this.globalBinding(statement.name.text));
        }
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
            if(entry.kind!=="agent"){
                let origins=this.sourceOrigins.get(file);
                if(!origins){origins=this.newCell();this.sourceOrigins.set(file,origins);}
                const callers=this.evaluationOrigins.get(entry.source)??[];
                callers.push(origins);this.evaluationOrigins.set(entry.source,callers);
            }
            const completion = this.newCell(),summary=statementBodyCompletions(file),exceptions=this.exceptionCell();
            this.scriptCompletions.set(file,{summary,throws:exceptions});
            if(!summary.complete)this.publish(completion,this.unknown);
            for(const value of summary.normalValues){
                if(value==="undefined")this.publish(completion,this.primitive(undefined));
                else if(value==="unknown")this.publish(completion,this.unknown);
                else this.copy(this.cell(value),completion);
            }
            if(!summary.normal)this.publish(completion,this.abrupt);
            const errors=this.evaluationThrows.get(entry.source)??[];
            errors.push(exceptions);this.evaluationThrows.set(entry.source,errors);
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
            if (sources && !sources.has(file)) continue;
            if (file.isDeclarationFile) continue;
            if (!sourceUnitBodyIncluded(program, file) && !(entries.evaluations ?? []).some(entry => entry.entry && path.resolve(entry.entry) === path.resolve(file.fileName)) &&
                !(entries.functions ?? []).some(entry => entry.entry && path.resolve(entry.entry) === path.resolve(file.fileName))) continue;
            const script=this.scriptCompletions.get(file);
            const worklist: Array<{node: ts.Node; handler: Cell | null}> = [{node: file, handler: script?.throws??null}];
            while (worklist.length) {
                const {node, handler} = worklist.pop()!;
                if ((ts.isStatement(node) || ts.isCatchClause(node)) && !ts.isFunctionDeclaration(node)) {
                    const activation = this.enclosingActivation(node);
                    if (activation?.completion && !activation.completion.reachable.has(node)) continue;
                    const analyzed=ts.isCatchClause(node)?node.block:node;
                    if(!activation&&script?.summary.analyzed.has(analyzed)&&!script.summary.reachable.has(node))continue;
                }
                if (handler) this.exceptionHandlers.set(node, handler);
                if (ts.isTryStatement(node)) {
                    const caught = node.catchClause ? this.exceptionCell() : handler;
                    if (node.catchClause && caught) {
                        const condition=this.catchCondition(node.catchClause);
                        this.rule([caught],()=>{for(const atom of caught.values)this.publish(condition,this.primitive(atom.tag!=="abrupt"));});
                    }
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
                            !propertyKey && !plus) this.publish(handler, this.nativeException(node));
                    });
                }
                if (ts.isVariableDeclaration(node) && node.initializer) this.onActive(node, () => this.bind(node.name, this.cell(node.initializer!)));
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
                    this.onActive(node, () => {
                        const iterable=ts.isForOfStatement(node)&&!node.awaitModifier;
                        const value=iterable?this.iteratorElements(this.cell(node.expression),node):this.newCell();
                        if(!iterable)this.publish(value,this.unknown);
                        else this.iteratorCloseEffects(value,node);
                        if (ts.isVariableDeclarationList(node.initializer)) for (const declaration of node.initializer.declarations) this.bind(declaration.name, value,undefined,node);
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
    private catchCondition(clause: ts.CatchClause): Cell {
        let condition=this.catchGuards.get(clause);
        if(!condition){condition=this.newCell();this.catchGuards.set(clause,condition);}
        return condition;
    }
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
        const guards = this.guards(node);
        if (!owner && !guards.length) action();
        else {
            let rule!: Rule;
            rule = this.rule([...(owner ? [owner.active] : []), ...guards.map(guard => guard.condition)],()=>{
                if ((!owner || owner.active.values.size) && this.guardsAllow(guards,rule)) action();
            });
        }
    }
    private guards(node: ts.Node): readonly {condition: Cell; truthy: boolean}[] {
        const previous = this.executionGuards.get(node); if (previous) return previous;
        const guards: {condition: Cell; truthy: boolean}[] = [];
        for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
            if (functionNode(parent) && (child === parent.body || ts.isParameter(child))) break;
            if (ts.isPropertyDeclaration(parent) && child === parent.initializer && !(ts.getModifiers(parent) ?? []).some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword)) break;
            if (ts.isIfStatement(parent) && child !== parent.expression)
                guards.push({condition:this.cell(parent.expression),truthy:child === parent.thenStatement});
            if (ts.isConditionalExpression(parent) && child !== parent.condition)
                guards.push({condition:this.cell(parent.condition),truthy:child === parent.whenTrue});
            if (ts.isCatchClause(parent) && child === parent.block) {
                guards.push({condition:this.catchCondition(parent),truthy:true});
            }
        }
        this.executionGuards.set(node,guards);return guards;
    }
    private guardsAllow(guards: readonly {condition: Cell; truthy: boolean}[], rule: Rule): boolean {
        for (const guard of guards) {
            this.watchText(rule,guard.condition);
            const state = this.primitiveState(guard.condition,rule);
            if (state.pending) return false;
            if (state.proof.primitiveComplete && !state.proof.values.some(value => !!value === guard.truthy)) return false;
        }
        return true;
    }
    private publish(cell: Cell, atom: Atom): void {
        if (atom.tag === "object" || atom.tag === "function" || atom.tag === "generator") {
            let values = this.ownerAtoms.get(atom.owner);
            if (!values) {values = new Map(); this.ownerAtoms.set(atom.owner, values);}
            const previous = values.get(atom.tag);
            if (previous) atom = previous;
            else values.set(atom.tag, atom);
        } else if (atom.tag === "promise") {
            let rejections = this.promiseAtoms.get(atom.value);
            if (!rejections) {rejections = new WeakMap(); this.promiseAtoms.set(atom.value, rejections);}
            const previous = rejections.get(atom.rejection);
            if (previous) atom = previous;
            else rejections.set(atom.rejection, atom);
        }
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
            this.primitiveKindCache.delete(value);
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
    /** Activation origins use the same monotone Cell graph as values. A
     * recursive call shares its caller's origins rather than growing a path. */
    private executionOrigins(context?:ts.Node):Cell {
        if(context){
            const activation=this.enclosingActivation(context);
            if(activation)return activation.active;
            const source=this.sourceOrigins.get(this.sourceFile(context));
            if(source)return source;
            if(!this.dynamicContext(context)){
                let cell=this.originCells.get(context);
                if(!cell){
                    cell=this.newCell();this.originCells.set(context,cell);
                    let effect=this.opaqueEffects.get(context);
                    if(!effect){effect={tag:"unknown",origin:context};this.opaqueEffects.set(context,effect);}
                    this.publish(cell,effect);
                }
                return cell;
            }
        }
        this.publish(this.unconstrainedOrigins,this.unknown);
        return this.unconstrainedOrigins;
    }
    private opaqueEffect(context?: ts.Node): void {
        this.copy(this.executionOrigins(context),this.opaqueMutation);
    }
    private dynamicContext(node: ts.Node): boolean {
        const pending: ts.Node[] = [];
        let current: ts.Node | undefined = node, dynamic = false;
        while (current) {
            const known = this.dynamicContexts.get(current);
            if (known !== undefined) {dynamic = known; break;}
            pending.push(current);
            if (ts.isFunctionLike(current) || ts.isIterationStatement(current, false)) {dynamic = true; break;}
            current = current.parent;
        }
        for (const visited of pending) this.dynamicContexts.set(visited, dynamic);
        return dynamic;
    }
    private sourceFile(node: ts.Node): ts.SourceFile {
        let source = this.sourceFiles.get(node);
        if (!source) {source = node.getSourceFile(); this.sourceFiles.set(node, source);}
        return source;
    }
    private effectVisible(atom: Atom, context?: ts.Node, argumentsRead = false): boolean {
        if (atom.tag !== "unknown" || !atom.origin || !context) return true;
        const effect = atom.origin;
        // Source order proves capture only in an acyclic top-level activation.
        // A later spelling in a function or loop may run before this read.
        if (this.dynamicContext(effect) || this.dynamicContext(context)) return true;
        if (this.sourceFile(effect) !== this.sourceFile(context)) {
            const before=this.scriptOrder.get(this.sourceFile(context)),after=this.scriptOrder.get(this.sourceFile(effect));
            return before===undefined||after===undefined||after<=before;
        }
        let start = this.sourceStarts.get(effect);
        if (start === undefined) {start = effect.getStart(this.sourceFile(effect)); this.sourceStarts.set(effect,start);}
        if (context.getEnd() <= start) return false;
        if (argumentsRead && effect === context) return false;
        if (ts.isCallExpression(effect) || ts.isNewExpression(effect)) {
            for (let parent: ts.Node | undefined = context; parent; parent = parent.parent) {
                if (parent === effect.expression) return false;
                if (effect.arguments?.some(argument=>argument===parent)) return false;
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
        if (!context || this.dynamicContext(context)) return from;
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
        return sourceBindingTarget(this.checker, declarativeSourceBindingSymbol(this.checker, node)).symbol;
    }
    private binding(node: ts.Identifier): Cell {
        const origin = declarativeSourceBindingSymbol(this.checker, node);
        const projected = sourceBindingTarget(this.checker, origin), symbol = projected.symbol;
        const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
        if (declaration && ts.isSourceFile(declaration)) {
            if (projected.namespace) return this.moduleNamespace(declaration, symbol!);
            if (declaration.flags & ts.NodeFlags.JsonFile) {
                const expression = declaration.statements[0];
                if (expression && ts.isExpressionStatement(expression)) return this.cell(expression.expression);
            }
        }
        if (declaration && ts.isExportAssignment(declaration)) return this.cell(declaration.expression);
        if (declaration && callableDefinition(declaration) && !sourceDeclarationIntroducesBinding(declaration)) return this.cell(declaration);
        if (declaration && isAmbientSourceDeclaration(declaration)) return this.globalLexicals.get(node.text) ?? this.globalBinding(node.text);
        if (!symbol || !(symbol.declarations ?? []).some(sourceDeclarationIntroducesBinding)) return this.globalLexicals.get(node.text) ?? this.globalBinding(node.text);
        const sourceGlobal = declaration && this.scriptDeclarationBinding(declaration, node.text);
        if (sourceGlobal) {
            if (callableDefinition(declaration!)) this.copy(this.cell(declaration!), sourceGlobal);
            this.bindings.set(symbol, sourceGlobal);
            return sourceGlobal;
        }
        let cell = this.bindings.get(symbol);
        if (!cell) {
            cell = this.newCell(); this.bindings.set(symbol, cell);
            const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
            if (declaration && callableDefinition(declaration)) this.copy(this.cell(declaration), cell);
        }
        return cell;
    }
    private scriptDeclarationBinding(declaration: ts.Node, name: string): Cell | null {
        let selected = declaration;
        while (ts.isBindingElement(selected)) selected = selected.parent.parent;
        const source = selected.getSourceFile();
        if (!this.scriptOrder.has(source) || isAmbientSourceDeclaration(selected)) return null;
        if (ts.isFunctionDeclaration(selected) && selected.parent === source) return this.globalBinding(name);
        if (ts.isClassDeclaration(selected) && selected.parent === source) return this.globalLexicals.get(name) ?? null;
        if (!ts.isVariableDeclaration(selected) || !ts.isVariableDeclarationList(selected.parent)) return null;
        if (selected.parent.flags & ts.NodeFlags.BlockScoped)
            return selected.parent.parent?.parent === source ? this.globalLexicals.get(name) ?? null : null;
        for (let owner: ts.Node | undefined = selected.parent; owner; owner = owner.parent) {
            if (ts.isFunctionLike(owner) || ts.isClassLike(owner) || ts.isModuleBlock(owner) || ts.isModuleDeclaration(owner)) return null;
            if (ts.isSourceFile(owner)) return this.globalBinding(name);
        }
        return null;
    }
    private moduleNamespace(source: ts.SourceFile, symbol: ts.Symbol): Cell {
        const existing = this.moduleNamespaces.get(source); if (existing) return existing.value;
        const owner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
        const value = this.newCell(); this.moduleNamespaces.set(source,{value,owner});
        this.publish(owner.prototype!,this.primitive(null)); this.publish(value,{tag:"object",owner});
        this.moduleNamespacePending.push({source,symbol,owner});
        return value;
    }
    private initializeModuleNamespace(source: ts.SourceFile, symbol: ts.Symbol, owner: ObjectOwner): void {
        if (source.flags & ts.NodeFlags.JsonFile) {
            const expression = source.statements[0];
            if (expression && ts.isExpressionStatement(expression)) this.defineField(owner,"default",this.cell(expression.expression));
        } else {
            for (const exported of this.checker.getExportsOfModule(symbol)) {
                const target = sourceBindingTarget(this.checker, exported);
                const declaration = target.symbol?.valueDeclaration ?? target.symbol?.declarations?.[0];
                if (!declaration) continue;
                let selected: Cell;
                if (ts.isSourceFile(declaration) && target.namespace) selected = this.moduleNamespace(declaration,target.symbol!);
                else if (ts.isSourceFile(declaration) && declaration.flags & ts.NodeFlags.JsonFile) {
                    const expression = declaration.statements[0];
                    selected = expression && ts.isExpressionStatement(expression) ? this.cell(expression.expression) : this.newCell();
                } else if (ts.isExportAssignment(declaration)) selected = this.cell(declaration.expression);
                else if (callableDefinition(declaration) && !sourceDeclarationIntroducesBinding(declaration)) selected = this.cell(declaration);
                else {
                    selected = this.bindings.get(target.symbol!) ?? this.newCell();
                    this.bindings.set(target.symbol!,selected);
                    if (callableDefinition(declaration)) this.copy(this.cell(declaration),selected);
                }
                this.defineField(owner,exported.getName(),selected);
            }
        }
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
    private ownPresence(owner:ObjectOwner,key:SourcePropertyKey):OwnPresence {
        owner.own??=new Map();let record=owner.own.get(key);
        if(!record){record={facts:this.newCell(),writes:new Map(),contexts:new Map(),initial:false};owner.own.set(key,record);}
        return record;
    }
    private presence(owner:ObjectOwner,key:SourcePropertyKey):Cell {return this.ownPresence(owner,key).facts;}
    /** Relative source-tree order is a dominance proof only within the same
     * activation and outside repeated or optional evaluation paths. */
    private writeDominates(write:ts.Node,read:ts.Node,rule:Rule):boolean {
        const before=this.enclosingActivation(write),after=this.enclosingActivation(read);
        if(before!==after)return false;
        if(this.sourceFile(write)!==this.sourceFile(read)){
            const left=this.scriptOrder.get(this.sourceFile(write)),right=this.scriptOrder.get(this.sourceFile(read));
            if(left===undefined||right===undefined||left>=right)return false;
        }else if(write.getEnd()>read.getStart())return false;
        const readAncestors=new Set<ts.Node>();
        for(let node:ts.Node|undefined=read;node;node=node.parent)readAncestors.add(node);
        for(let child=write,parent=write.parent;parent;child=parent,parent=parent.parent){
            if(ts.isFunctionLike(parent)||ts.isSourceFile(parent))break;
            if(ts.isIterationStatement(parent,false))return false;
            if(ts.isConditionalExpression(parent)||ts.isIfStatement(parent)||ts.isTryStatement(parent)||ts.isCatchClause(parent)||ts.isSwitchStatement(parent)){
                if(!readAncestors.has(child))return false;
            }
            if(ts.isBinaryExpression(parent)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)&&child===parent.right)return false;
            if((ts.isCallExpression(parent)||ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))&&parent.questionDotToken)return false;
        }
        const readGuards=this.guards(read);
        for(const guard of this.guards(write)){
            if(readGuards.some(candidate=>candidate.condition===guard.condition&&candidate.truthy===guard.truthy))continue;
            this.watchText(rule,guard.condition);
            const proof=this.primitiveChoiceProof(guard.condition);
            if(!proof.primitiveComplete||!proof.values.length||proof.values.some(value=>!!value!==guard.truthy))return false;
        }
        return true;
    }
    private propertyPresence(owner:ObjectOwner,key:SourcePropertyKey,context?:ts.Node):Cell {
        const record=this.ownPresence(owner,key),previous=record.contexts.get(context);if(previous)return previous;
        const result=this.newCell();record.contexts.set(context,result);
        let rule!:Rule;
        rule=this.rule([record.facts],()=>{
            if(record.initial&&![...record.writes.values()].some(event=>event.mode==="delete")&&!(typeof key==="symbol"&&this.freshSymbols.has(key))){this.publish(result,this.primitive(true));return;}
            const origins=context?this.executionOrigins(context):null;
            if(origins)this.watch(rule,origins);
            const points=context&&this.enclosingActivation(context)?[...(origins?.values??[])].map(atom=>atom.tag==="unknown"?atom.origin:undefined):[context];
            if(!points.length)return;
            for(const point of points){
                let present=record.initial;
                for(const [write,event]of record.writes){
                    this.watch(rule,event.base);this.watch(rule,event.receiver);
                    const singleton=(cell:Cell)=>[...cell.values].every(atom=>atom.tag==="abrupt"||this.ordinaryOwner(atom)===owner)&&[...cell.values].some(atom=>this.ordinaryOwner(atom)===owner);
                    const reference=context&&this.enclosingActivation(write)===this.enclosingActivation(context)?context:point;
                    if(event.mode==="delete"){present=false;continue;}
                    if(reference&&singleton(event.base)&&singleton(event.receiver)&&this.writeDominates(write,reference,rule))present=true;
                }
                if([...record.writes.values()].some(event=>event.mode==="delete"))present=false;
                if(typeof key==="symbol"&&this.freshSymbols.has(key))present=false;
                if(present)this.publish(result,this.primitive(true));
                else if(this.presenceClosed){this.publish(result,this.primitive(false));if(record.facts.values.has(this.primitive(true)))this.publish(result,this.primitive(true));}
            }
        });
        this.presenceRules.add(rule);return result;
    }
    private defineField(owner: ObjectOwner, key: SourcePropertyKey, value: Cell): void {
        this.ownPresence(owner,key).initial=true;
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
        else {if(ts.isGetAccessorDeclaration(context)||ts.isSetAccessorDeclaration(context))this.ownPresence(owner,key).initial=true;this.publish(this.presence(owner,key),this.primitive(true));}
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
        if(handler)this.publish(handler,this.nativeException(context!));
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
                            else if(prototype.tag!=="pending-source"){this.copy(this.executionOrigins(context),owner.shape);if(handler)this.publish(handler,this.unknown);store=true;}
                        }
                    }
                }
                if(!store)continue;
                const destinations=mode==="set"?[...receiver.values].map(value=>this.ordinaryOwner(value)).filter((value):value is ObjectOwner=>!!value):[owner];
                for(const owner of destinations){
                if(key===null){const origins=this.executionOrigins(context);this.copy(origins,owner.shape);for(const field of owner.fields.values())this.copy(origins,field);}
                else {
                    const presence=this.presence(owner,key);
                    if(context)this.ownPresence(owner,key).writes.set(context,{base,receiver,mode});
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
                if(key===null)this.copy(this.executionOrigins(context),this.globalMutation);
                else if (typeof key === "string" && !this.immutableGlobalBinding(key)) this.copy(value,this.globalBinding(key));
            }
            if(unknownGlobal&&(atom.tag==="unknown"||atom.tag==="opaque-object")){this.copy(this.executionOrigins(context),this.globalMutation);if(handler)this.publish(handler,this.unknown);}
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
                        if (handler) this.publish(handler, this.nativeException(context!));
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
                    if (handler) this.publish(handler, this.nativeException(context!));
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
            if (!state.proof.primitiveComplete && !this.primitiveNumericConversionSafe(input, conversion)) this.publish(handler, this.nativeException(context!));
            for (const value of state.proof.values) {
                try {NUMERIC_CONVERSIONS.get(conversion)!(value);} catch {this.publish(handler, this.nativeException(context!));}
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
                if (handler) this.publish(handler, this.nativeException(context!));
            }
            return [...new Set(values.map(String))];
        }
        if (pending && !unresolved) return undefined;
        if (context) {
            const opaque = this.primitiveState(key, rule, true).unresolved;
            const handler = this.exceptionHandlers.get(context);
            if (handler) {
                const kinds=this.primitiveKinds(key);
                if(opaque)this.publish(handler,this.unknown);
                else if(kinds&KIND_SYMBOL)this.publish(handler,this.nativeException(context));
            }
            if (opaque) this.onActive(context, () => this.opaqueEffect(context));
        }
        return null;
    }
    private propertyKeys(key: Cell, rule: Rule, context?: ts.Node): readonly SourcePropertyKey[] | null | undefined {
        key = this.primitiveConversion(key, context);
        const {proof, pending, unresolved} = this.primitiveState(key, rule);
        if (proof.primitiveComplete) return [...new Set(proof.values.map(value => typeof value === "symbol" ? value : String(value)))];
        if (pending && !unresolved) return undefined;
        if (context && !this.computedKeyDomain(key)) {
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
        rule = this.rule([base, key], () => {
            const names = this.propertyKeys(key, rule, context);
            const domain = names === null ? this.computedKeyDomain(key) : null;
            if (names === null && domain) {
                const keys = domain.numeric ? this.propertyDomainKeys(base, context, rule, "numeric") : [];
                if (keys === undefined) return;
                if (keys === null) this.publish(result, this.unknown);
                else {
                    // The numeric domain has unbounded cardinality. Known
                    // owner locations plus absence cover every possible key.
                    this.publish(result, this.primitive(undefined));
                    for (const name of [...keys, ...domain.keys]) if (!selected.has(name)) {
                        selected.add(name);
                        this.copy(this.property(base, name, context), result);
                    }
                }
            }
            else if (names === null) this.publish(result, this.unknown);
            else if (names?.length === 0) this.publish(result, this.abrupt);
            else for (const name of names ?? []) if (!selected.has(name)) {
                selected.add(name);
                this.copy(this.property(base, name, context), result);
            }
        });
        return result;
    }
    private computedKeyDomain(key: Cell): {numeric: boolean; keys: readonly SourcePropertyKey[]} | null {
        if (!key.values.size) return null;
        let numeric = false;
        const keys = new Set<SourcePropertyKey>();
        for (const atom of key.values) {
            if (atom.tag === "abrupt") continue;
            if (atom.tag === "primitive") {
                keys.add(typeof atom.value === "symbol" ? atom.value : String(atom.value));
                continue;
            }
            if (atom.tag === "non-string" && !!atom.kinds && !(atom.kinds & ~KIND_NUMERIC) ||
                atom.tag === "text-operation" && (atom.operation === "coerce" ||
                    atom.operation === "numeric" && atom.numeric!.result !== "boolean" && atom.numeric!.conversion !== "default")) numeric = true;
            else return null;
        }
        return {numeric, keys: [...keys]};
    }
    /** Normal-value categories are independent of concrete value extent.
     * Operand effects and Reference failures remain on their own graph edges. */
    private primitiveKinds(root: Cell): number {
        this.flushPrimitiveChanges();
        const cached=this.primitiveKindCache.get(root);if(cached!==undefined)return cached;
        const pending=[{cell:root,finish:false}],active=new Set<Cell>(),kinds=new Map<Cell,number>();
        while(pending.length){
            const task=pending.pop()!;
            if(kinds.has(task.cell))continue;
            const known=this.primitiveKindCache.get(task.cell);if(known!==undefined){kinds.set(task.cell,known);continue;}
            if(!task.finish){
                if(active.has(task.cell)){kinds.set(task.cell,KIND_ALL);continue;}
                active.add(task.cell);pending.push({...task,finish:true});
                for(const atom of task.cell.values)if(atom.tag==="text-operation")for(const part of atom.parts)pending.push({cell:part,finish:false});
                continue;
            }
            active.delete(task.cell);let mask=0;
            const numeric=(mask:number)=> (mask&KIND_BIGINT?KIND_BIGINT:0)|(mask&~(KIND_BIGINT|KIND_SYMBOL)?KIND_NUMBER:0);
            for(const atom of task.cell.values){
                if(atom.tag==="abrupt")continue;
                if(atom.tag==="primitive")mask|=atom.value===null?KIND_NULL:({undefined:KIND_UNDEFINED,boolean:KIND_BOOLEAN,number:KIND_NUMBER,bigint:KIND_BIGINT,string:KIND_STRING,symbol:KIND_SYMBOL} as Record<string,number>)[typeof atom.value]!;
                else if(atom.tag==="non-string")mask|=atom.kinds??(KIND_PRIMITIVE&~KIND_STRING);
                else if(atom.tag==="unknown-string")mask|=KIND_STRING;
                else if(atom.tag==="text-operation"){
                    const parts=atom.parts.map(part=>kinds.get(part)??KIND_ALL);
                    if(atom.operation==="prefix"||atom.operation==="numeric"&&atom.numeric!.result==="boolean")mask|=KIND_BOOLEAN;
                    else if(atom.operation==="coerce")mask|=atom.conversion==="numeric"?numeric(parts[0]!):atom.conversion==="BigInt"?KIND_BIGINT:KIND_NUMBER;
                    else if(atom.operation==="numeric"){
                        if(atom.numeric!.result==="number")mask|=KIND_NUMBER;
                        else if(atom.numeric!.conversion==="default"){
                            if(parts.some(part=>part&KIND_STRING))mask|=KIND_STRING;
                            const operands=parts.map(numeric);
                            if(operands.every(part=>part&KIND_NUMBER))mask|=KIND_NUMBER;
                            if(operands.every(part=>part&KIND_BIGINT))mask|=KIND_BIGINT;
                        }else{
                            const operands=parts.map(numeric);
                            if(operands.every(part=>part&KIND_NUMBER))mask|=KIND_NUMBER;
                            if(operands.every(part=>part&KIND_BIGINT))mask|=KIND_BIGINT;
                        }
                    }else mask|=KIND_STRING;
                }else if(atom.tag==="unknown"||atom.tag==="pending-source")mask|=KIND_ALL;
                else if(atom.tag==="function"||atom.tag==="bound"||atom.tag==="operation"||atom.tag==="intrinsic"&&(atom.domain==="constructor"||atom.domain==="prototype"&&atom.kind==="ordinary")||atom.tag==="builtin"&&atom.normalResult!=="not-callable")mask|=KIND_FUNCTION;
                else mask|=KIND_OBJECT;
            }
            kinds.set(task.cell,mask);
        }
        for(const [cell,mask]of kinds)this.primitiveKindCache.set(cell,mask);
        return kinds.get(root)??KIND_ALL;
    }
    private primitiveNumericConversionSafe(input: Cell, conversion: string): boolean {
        const kinds=this.primitiveKinds(input);
        if(!kinds||kinds&(KIND_SYMBOL|KIND_OBJECT|KIND_FUNCTION))return false;
        if(conversion==="BigInt")return !(kinds&~(KIND_BIGINT|KIND_BOOLEAN));
        return conversion!=="length"||!(kinds&KIND_BIGINT);
    }
    private numericOperationCannotThrow(operation: SourceNumericOperation, inputs: readonly Cell[]): boolean {
        if(operation.conversion==="none")return true;
        if(operation.form==="update")return false;
        const kinds=inputs.map(input=>this.primitiveKinds(input));
        if(kinds.some(kinds=>!kinds||kinds&~(KIND_UNDEFINED|KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_STRING)))return false;
        return true;
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
        // Every normal DefineProperty completion creates an own location.
        // Register that edge before descriptor absence reads settle, so the
        // worklist cannot seal a later read as absent during intake.
        let locations!:Rule;
        locations=this.rule([base,key],()=>{
            const names=this.propertyKeys(key,locations,context);
            for(const name of names??[])for(const atom of base.values){
                const owner=this.ordinaryOwner(atom);if(!owner)continue;
                const record=this.ownPresence(owner,name);
                record.writes.set(context,{base,receiver:base,mode:"define"});
                this.publish(record.facts,this.primitive(true));
            }
        });
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
                    else if(atom.tag==="unknown"||atom.tag==="opaque-object") {this.publish(this.globalMutation,this.unknown);this.opaqueEffect(context);}
                    else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source"){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context!));}
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
                if(atom.tag==="pending-source"||atom.tag==="abrupt"){this.publish(result,atom);continue;}
                if(atom.tag==="primitive"&&(atom.value===null||atom.value===undefined)){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(context!));continue;}
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
                    const presence=this.propertyPresence(owner,name,context);this.watch(rule,presence);
                    if(!presence.values.size)continue;
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
                if(key==="JSON") {
                    fields.prototype=this.objectPrototype();
                    const tag=this.wellKnownSymbols.get("toStringTag")!,value=this.newCell();
                    this.publish(value,this.primitive("JSON"));this.defineField(fields,tag,value);
                }
                if (descriptor.normalResult !== "not-callable") fields.prototype = this.callablePrototype("ordinary");
                if(runtimeErrorKinds.has(key))this.defineField(fields,"prototype",this.errorPrototype(key));
                if(key==="Object")this.defineField(fields,"prototype",this.objectPrototype());
                if(key==="Array")this.defineField(fields,"prototype",this.arrayPrototype());
                if(key==="Iterator")this.defineField(fields,"prototype",this.iteratorPrototype());
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
            !isAmbientSourceDeclaration(declaration) && sourceDeclarationIntroducesBinding(declaration));
    }
    private callablePrototype(kind: DynamicFunctionKind): Cell {
        let cell = this.callablePrototypes.get(kind);
        if (!cell) {
            cell = this.newCell(); this.callablePrototypes.set(kind, cell);
            this.publish(cell, this.intrinsic("prototype", kind));
        }
        return cell;
    }
    private errorPrototype(name:string):Cell {
        let value=this.errorPrototypes.get(name);if(value)return value;
        value=this.newCell();this.errorPrototypes.set(name,value);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:name==="Error"?this.objectPrototype():this.errorPrototype("Error")};
        this.copy(this.opaqueMutation,owner.shape);this.copy(this.globalMutation,owner.shape);this.publish(value,{tag:"object",owner});
        const spelling=this.newCell();this.publish(spelling,this.primitive(name));this.defineField(owner,"name",spelling);
        this.defineField(owner,"constructor",this.globalBinding(name));
        if(name==="Error"){
            const message=this.newCell(),method=this.newCell();this.publish(message,this.primitive(""));this.publish(method,this.operation("error-text"));
            this.defineField(owner,"message",message);this.defineField(owner,"toString",method);
        }
        return value;
    }
    /** Only language-created exceptions enter this allocation collection.
     * Unknown messages keep their String category without inventing callbacks;
     * mutable prototype properties still use the ordinary owner graph. */
    private nativeException(context:ts.Node):Atom {
        let value=this.nativeExceptions.get(context);if(value)return value;
        const prototype=this.newCell(),message=this.newCell();
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype};
        value={tag:"object",owner};this.nativeExceptions.set(context,value);
        this.copy(this.opaqueMutation,owner.shape);
        for(const name of runtimeErrorKinds.keys())this.copy(this.errorPrototype(name),prototype);
        this.publish(message,this.unknownString);this.defineField(owner,"message",message);
        return value;
    }
    private errorText(receiver:Cell,context:ts.Node):Cell {
        let receivers=this.errorStrings.get(context);if(!receivers){receivers=new Map();this.errorStrings.set(context,receivers);}
        const prior=receivers.get(receiver);if(prior)return prior;
        const result=this.newCell();receivers.set(receiver,result);
        const objects=this.newCell();
        this.rule([receiver],()=>{
            for(const atom of receiver.values){
                if(this.ordinaryOwner(atom)||atom.tag==="opaque-object"||atom.tag==="unknown")this.publish(objects,atom);
                else if(atom.tag==="pending-source"||atom.tag==="abrupt")this.publish(result,atom);
                else {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
            }
        });
        const defaulted=(input:Cell,fallback:string):Cell=>{
            const output=this.newCell();this.rule([input],()=>{for(const atom of input.values)this.publish(output,atom===this.primitive(undefined)?this.primitive(fallback):atom);});return output;
        };
        const name=this.stringHintCell(defaulted(this.property(objects,"name",context),"Error"),context);
        const messageReceiver=this.newCell();let normal!:Rule;
        normal=this.rule([name],()=>{
            const state=this.primitiveState(name,normal,true);
            if(state.pending&&!state.unresolved)return;
            if(!state.proof.primitiveComplete||state.proof.values.length)this.copy(objects,messageReceiver);
        });
        const message=this.stringHintCell(defaulted(this.property(messageReceiver,"message",context),""),context);
        this.publish(result,{tag:"text-operation",operation:"error-text",parts:[name,message]});return result;
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
    private arrayPrototype():Cell {
        if(!this.ordinaryArrayPrototype){
            const value=this.newCell();this.ordinaryArrayPrototype=value;
            const fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),closedIndices:true};
            this.copy(this.opaqueMutation,fields.shape);
            this.publish(value,{tag:"builtin",name:"Array.prototype",normalResult:"not-callable",fields});
            const join=this.newCell();this.publish(join,this.operation("array-join"));this.defineField(fields,"join",join);
            const length=this.newCell();this.publish(length,this.primitive(0));this.defineField(fields,"length",length);
            const iterator=this.newCell();this.publish(iterator,this.operation("array-values"));
            this.defineField(fields,this.wellKnownSymbols.get("iterator")!,iterator);this.defineField(fields,"values",iterator);
        }
        return this.ordinaryArrayPrototype;
    }
    private joinTextInput(value:Cell,separator:boolean):Cell {
        const normalized=this.newCell();
        this.rule([value],()=>{
            for(const atom of value.values){
                if(atom.tag==="primitive"&&(atom.value===undefined||!separator&&atom.value===null))
                    this.publish(normalized,this.primitive(separator?",":""));
                else this.publish(normalized,atom);
            }
        });
        return normalized;
    }
    private arrayLikeLength(receiver:Cell,context:ts.Node):Cell {
        let contexts=this.arrayLikeLengths.get(receiver);
        if(!contexts){contexts=new Map();this.arrayLikeLengths.set(receiver,contexts);}
        let length=contexts.get(context);
        if(!length){length=this.coerceCell(this.property(receiver,"length",context),context,"length");contexts.set(context,length);}
        return length;
    }
    private indexedRead(receiver:Cell,index:number,context:ts.Node):Cell {
        let contexts=this.indexedReads.get(receiver);
        if(!contexts){contexts=new Map();this.indexedReads.set(receiver,contexts);}
        let indices=contexts.get(context);
        if(!indices){indices=new Map();contexts.set(context,indices);}
        const key=String(index);let value=indices.get(key);
        if(!value){value=this.property(receiver,key,context);indices.set(key,value);}
        return value;
    }
    private iterationMethod(receiver:Cell,context?:ts.Node):Cell {
        let contexts=this.iterationMethods.get(receiver);
        if(!contexts){contexts=new Map();this.iterationMethods.set(receiver,contexts);}
        let method=contexts.get(context);
        if(!method){method=this.property(receiver,this.wellKnownSymbols.get("iterator")!,context);contexts.set(context,method);}
        return method;
    }
    private arrayLikeLists(receiver:Cell,context:ts.Node,rule:Rule,completion:Cell,nullable=false):Array<readonly Cell[]|null> {
        let empty:Array<readonly Cell[]>=[];
        this.watch(rule,receiver);
        if(nullable&&[...receiver.values].some(atom=>atom===this.primitive(null)||atom===this.primitive(undefined)))empty=[[]];
        if([...receiver.values].some(atom=>atom.tag==="primitive"&&(!nullable||atom.value!==null&&atom.value!==undefined)||atom.tag==="text-operation")){
            this.publish(completion,this.abrupt);
            const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
        }
        {
            let objects=this.arrayLikeObjectInputs.get(receiver);
            if(!objects){
                objects=this.newCell();this.arrayLikeObjectInputs.set(receiver,objects);
                const selected=objects,input=receiver;
                this.rule([input],()=>{for(const atom of input.values)if(atom.tag!=="primitive"&&atom.tag!=="text-operation"&&atom.tag!=="abrupt")this.publish(selected,atom);});
            }
            this.watch(rule,objects);
            receiver=objects;
            if(!receiver.values.size)return empty;
        }
        const literal=[...receiver.values].map(atom=>atom.tag==="object"?this.literalLists.get(atom.owner):undefined);
        if(literal.length===1&&literal[0]&&!literal[0].holes.size){
            let boundary:ts.Node=literal[0].node;
            while(boundary.parent&&(ts.isParenthesizedExpression(boundary.parent)||ts.isAsExpression(boundary.parent)||ts.isTypeAssertionExpression(boundary.parent)||ts.isNonNullExpression(boundary.parent)||ts.isSatisfiesExpression(boundary.parent)))boundary=boundary.parent;
            if(boundary.parent===context)return [...empty,...this.arguments(literal[0].parts,literal[0].node)];
        }
        const state=this.primitiveState(this.arrayLikeLength(receiver,context),rule,true);
        if(state.pending&&!state.unresolved)return [...empty];
        if(!state.proof.primitiveComplete)return [null];
        if(!state.proof.values.length)this.publish(completion,this.abrupt);
        const positions=this.indexedPropertyPositions(receiver,context,rule);
        if(positions===undefined)return [];
        if(positions===null)return [null];
        return [...empty,...state.proof.values.map(extent=>{
            const values:Cell[]=[];
            for(let index=0;index<(extent as number);index++)values.push(this.indexedRead(receiver,index,context));
            return values;
        })];
    }
    private indexedPropertyPositions(receiver:Cell,context:ts.Node,rule:Rule):readonly number[]|null|undefined {
        const keys=this.propertyDomainKeys(receiver,context,rule,"index");
        return keys===null||keys===undefined?keys:keys.map(Number).sort((left,right)=>left-right);
    }
    private propertyDomainKeys(receiver:Cell,context:ts.Node,rule:Rule,domain:"index"|"numeric"):readonly string[]|null|undefined {
        const keys=new Set<string>(),owners:ObjectOwner[]=[],visited=new Set<ObjectOwner>();
        const add=(key:SourcePropertyKey|null)=>{
            if(typeof key!=="string")return;
            const index=Number(key);
            if(domain==="index"){
                if(Number.isSafeInteger(index)&&index>=0&&String(index)===key)keys.add(key);
            }else if(String(index)===key)keys.add(key);
            else {
                try {if(String(BigInt(key))===key)keys.add(key);} catch {}
            }
        };
        this.watch(rule,receiver);
        for(const atom of receiver.values){
            if(atom.tag==="pending-source")return undefined;
            if(atom.tag==="abrupt"||atom.tag==="primitive"&&(atom.value===null||atom.value===undefined))continue;
            if(atom.tag==="primitive"&&typeof atom.value==="string"){
                if(domain==="numeric")return null;
                for(let index=0;index<atom.value.length;index++)keys.add(String(index));
            }else{
                const owner=this.ordinaryOwner(atom);
                if(!owner||atom.tag==="builtin"&&!owner.closedIndices)return null;
                owners.push(owner);
            }
        }
        while(owners.length){
            const owner=owners.pop()!;if(visited.has(owner))continue;visited.add(owner);
            this.watch(rule,owner.shape);
            if(!this.definitionsReady(owner,rule))return undefined;
            if(this.opaqueShape(owner,context)||owner.accessors.has(null))return null;
            for(const key of owner.fields.keys())add(key);
            for(const key of owner.accessors.keys())add(key);
            if(owner.prototype){
                this.watch(rule,owner.prototype);
                if(!owner.prototype.values.size)return undefined;
                for(const prototype of owner.prototype.values){
                    if(prototype===this.primitive(null))continue;
                    if(prototype.tag==="pending-source")return undefined;
                    const parent=this.ordinaryOwner(prototype);
                    if(!parent||prototype.tag==="builtin"&&!parent.closedIndices)return null;
                    owners.push(parent);
                }
            }
        }
        return [...keys];
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
        if(atom.tag==="operation"&&jsonOperations.has(atom.operation as JSONSourceOperation)) {
            let owner=this.intrinsicOwners.get(atom);
            if(!owner) {
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);
                this.copy(this.opaqueMutation,owner.shape);
                const descriptor=jsonOperations.get(atom.operation as JSONSourceOperation)!,name=this.newCell(),length=this.newCell();
                this.publish(name,this.primitive(descriptor.name));this.publish(length,this.primitive(descriptor.length));
                this.defineField(owner,"name",name);this.defineField(owner,"length",length);
            }
            return owner;
        }
        if(atom.tag === "operation" && (atom.operation==="agent-start"||atom.operation.startsWith("agent-member:"))){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);
                const name=atom.operation==="agent-start"?"start":atom.operation.slice("agent-member:".length),descriptor=test262AgentOperations.get(name)!;
                const named=this.newCell(),length=this.newCell();this.publish(named,this.primitive(name));this.publish(length,this.primitive(descriptor.length));this.defineField(owner,"name",named);this.defineField(owner,"length",length);
            }
            return owner;
        }
        if(atom.tag === "intrinsic"){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.intrinsicOwners.set(atom,owner);
                if (atom.domain === "constructor") owner.prototype = atom.kind === "ordinary" ? this.callablePrototype("ordinary") : this.globalBinding("Function");
                if (atom.domain === "prototype" && atom.kind !== "ordinary") owner.prototype = this.callablePrototype("ordinary");
                if (atom.domain === "prototype" && atom.kind === "ordinary") {
                    owner.prototype = this.objectPrototype();
                    this.publish(this.field(owner, "toString"), this.operation("function-text"));this.ownPresence(owner,"toString").initial=true;this.publish(this.presence(owner,"toString"),this.primitive(true));
                    this.defineField(owner, "constructor", this.globalBinding("Function"));
                }
                this.copy(this.opaqueMutation,owner.shape);
            }
            return owner;
        }
        if(atom.tag !== "host" && atom.tag !== "realm-record" && atom.tag !== "agent")return null;
        const key=atom.tag === "agent" ? "agent" : "host";
        let owner=this.hostOwners.get(key);
        if(!owner){
            owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.hostOwners.set(key,owner);
            if(key==="agent")for(const descriptor of test262AgentOperations.values()){
                if(!(descriptor.roles&(this.domain?2:1)))continue;
                const value=this.newCell();this.publish(value,this.operation(descriptor.name==="start"?"agent-start":`agent-member:${descriptor.name}`));this.defineField(owner,descriptor.name,value);
            }
        }
        return owner;
    }
    private read(atom: Atom, base: Cell, key: SourcePropertyKey, result: Cell, handler?: Cell, rule?: Rule, context?: ts.Node, ownOnly=false): void {
        if(atom.tag==="primitive"&&typeof atom.value==="string"){
            if(key==="length"){this.publish(result,this.primitive(atom.value.length));return;}
            if(typeof key==="string"){
                const index=Number(key);
                if(Number.isSafeInteger(index)&&index>=0&&String(index)===key&&index<atom.value.length){this.publish(result,this.primitive(atom.value[index]));return;}
            }
        }
        if (atom.tag === "primitive" && typeof atom.value === "symbol" && key === "description") {
            this.publish(result, this.primitive(atom.value.description)); return;
        }
        if (atom.tag === "abrupt") {this.publish(result, atom); return;}
        if (atom.tag === "primitive" && (atom.value === null || atom.value === undefined)) {
            this.publish(result, this.abrupt); if (handler) this.publish(handler, this.nativeException(context!)); return;
        }
        if (atom.tag === "pending-source") {this.publish(result,atom);return;}
        if (atom.tag === "unknown" || atom.tag === "opaque-object") {
            this.publish(result, this.unknown);
            if (handler) this.publish(handler, this.unknown);
            return;
        }
        const firstOwner = this.ordinaryOwner(atom), worklist = firstOwner ? [firstOwner] : [];
        if(atom.tag==="global" && typeof key === "string" && !firstOwner!.accessors.has(key)) {
            const binding=this.globalBinding(key);this.copy(binding,this.field(firstOwner!,key));
            if(runtimeGlobalBindings.has(key)||binding.values.size)this.ownPresence(firstOwner!,key).initial=true;
        }
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
            const presence=this.propertyPresence(owner,key,context);
            if (rule) this.watch(rule,presence);
            if(!presence.values.size)continue;
            // The native builtin's unrepresented own members are opaque.
            // A closed prototype chain must not turn them into known absence.
            const closedIndex=owner.closedIndices&&typeof key==="string"&&Number.isSafeInteger(Number(key))&&Number(key)>=0&&String(Number(key))===key;
            if (owner === firstOwner && atom.tag === "builtin" && !closedIndex && !presence?.values.has(this.primitive(true)) &&
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
            this.publish(prototypeValue, {tag:"object",owner:prototype});this.ownPresence(owner.fields,"prototype").initial=true;this.publish(this.presence(owner.fields,"prototype"),this.primitive(true));
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
                if (value) {
                    const input=this.cell(value),guards=this.guards(value);
                    if(!guards.length)this.copy(input,owner.returns);
                    else {
                        let rule!:Rule;
                        rule=this.rule([input,...guards.map(guard=>guard.condition)],()=>{
                            if(this.guardsAllow(guards,rule))this.copy(input,owner.returns);
                        });
                    }
                }
                else this.publish(owner.returns, this.primitive(undefined));
            }
            if (completion.normal) this.publish(owner.returns, this.primitive(undefined));
            else if (!completion.returns.length) this.publish(owner.returns, this.abrupt);
        }
        return owner;
    }
    private lists(cell: Cell, context?: ts.Node, argumentsRead = true): Array<readonly Cell[] | null> {
        // Every actual List projects the owner's canonical length and index
        // locations. Literal/rest initialization and mutations publish into
        // those same cells; the rule worklist closes their dependencies.
        const alternatives: Array<readonly Cell[] | null> = [];
        const method=this.iterationMethod(cell,context);
        if(!method.values.size)return alternatives;
        if([...method.values].some(value=>value.tag!=="operation"||value.operation!=="array-values"))return [null];
        for (const atom of cell.values) {
            if (atom.tag !== "object" || !atom.owner.listLength) {
                alternatives.push(null);
                continue;
            }
            const owner = atom.owner;
            const prototypes=[owner],visited=new Set<ObjectOwner>();
            while(prototypes.length){
                const current=prototypes.pop()!;if(visited.has(current))continue;visited.add(current);
                if(current.accessors.has(this.wellKnownSymbols.get("iterator")!)||current.accessors.has(null))return [null];
                for(const prototype of current.prototype?.values??[]){const parent=this.ordinaryOwner(prototype);if(parent)prototypes.push(parent);}
            }
            const proof = this.primitiveChoiceProof(owner.listLength!);
            const literal=this.literalLists.get(owner);
            if(literal&&context&&argumentsRead&&!literal.holes.size){
                let boundary:ts.Node=literal.node;
                while(boundary.parent&&(ts.isParenthesizedExpression(boundary.parent)||ts.isAsExpression(boundary.parent)||ts.isTypeAssertionExpression(boundary.parent)||ts.isNonNullExpression(boundary.parent)||ts.isSatisfiesExpression(boundary.parent)))boundary=boundary.parent;
                if(boundary.parent&&ts.isSpreadElement(boundary.parent))boundary=boundary.parent;
                // An inline allocation has not exposed its identity before
                // the actual-List read. Other-iteration opaque effects cannot
                // mutate its freshly defined own element locations.
                if(boundary.parent===context){alternatives.push(...this.arguments(literal.parts,literal.node));continue;}
            }
            if (!proof.primitiveComplete && this.primitiveReadiness(owner.listLength!).pending) continue;
            if (this.opaqueShape(owner,context,argumentsRead) || !proof.primitiveComplete) {
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
                    const location=context?this.indexedRead(cell,index,context):this.field(owner,key);
                    locations.push(context?location:this.captureRead(location,context,argumentsRead));
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
    private arguments(parts: readonly ListPart[],context?:ts.Node): Array<readonly Cell[] | null> {
        let choices: Array<readonly Cell[] | null> = [[]];
        for (const part of parts) {
            const alternatives = part.spread ? this.lists(part.cell,context) : [[part.cell]];
            choices = choices.flatMap(prefix => alternatives.map(tail => prefix && tail ? [...prefix, ...tail] : null));
        }
        return choices;
    }
    /** Materialize parsed JSON into the ordinary location graph. A single
     * object worklist supplies fields, prototypes and array extents, without
     * source-depth or container-shape cases. */
    private jsonValue(value:unknown):Atom {
        const owners=new Map<object,{atom:Atom;owner:ObjectOwner}>(),pending:object[]=[];
        const atom=(value:unknown):Atom=>{
            if(value===null||typeof value!=="object")return this.primitive(value as Primitive);
            const prior=owners.get(value);if(prior)return prior.atom;
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:Array.isArray(value)?this.arrayPrototype():this.objectPrototype()};
            this.copy(this.opaqueMutation,owner.shape);
            const result:Atom={tag:"object",owner};owners.set(value,{atom:result,owner});pending.push(value);return result;
        };
        const result=atom(value);
        while(pending.length) {
            const value=pending.pop()!,owner=owners.get(value)!.owner;
            for(const key of Object.keys(value)) {
                const field=this.newCell();this.publish(field,atom((value as Record<string,unknown>)[key]));this.defineField(owner,key,field);
            }
            if(Array.isArray(value)) {
                owner.listLength=this.field(owner,"length");
                const length=this.newCell();this.publish(length,this.primitive(value.length));this.defineField(owner,"length",length);
            }
        }
        return result;
    }
    private jsonParse(source:Cell,reviver:Cell,context:ts.Node):Cell {
        let calls=this.jsonParses.get(context);
        if(!calls){calls=new Map();this.jsonParses.set(context,calls);}
        const signature=source.id+":"+reviver.id,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell();calls.set(signature,result);
        const text=this.stringHintCell(source,context),parsed=this.newCell(),receiver=this.newCell(),key=this.newCell(),callbackValue=this.newCell(),callbackContext=this.newCell(),callee=this.newCell();
        const inputs=new Map<Atom,Cell>(),selected=new Set<string>();
        const cell=(atom:Atom)=>{let input=inputs.get(atom);if(!input){input=this.newCell();inputs.set(atom,input);this.publish(input,atom);}return input;};
        this.invoke(context,callee,receiver,[{cell:key,spread:false},{cell:callbackValue,spread:false},{cell:callbackContext,spread:false}],result);
        let parse!:Rule;
        parse=this.rule([text],()=>{
            const state=this.primitiveState(text,parse,true);
            for(const value of state.proof.values){
                const input=String(value);if(selected.has(input))continue;selected.add(input);
                try {
                    const value=JSON.parse(input),composite=value!==null&&typeof value==="object";
                    const atom=this.jsonValue(value);
                    this.publish(parsed,atom);
                    const holderOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
                    this.defineField(holderOwner,"",cell(atom));
                    this.publish(receiver,{tag:"object",owner:holderOwner});this.publish(key,this.primitive(""));
                    const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
                    if(!composite)this.defineField(owner,"source",cell(this.primitive(input.trim())));
                    this.publish(callbackContext,{tag:"object",owner});this.publish(callbackValue,atom);
                    // A composite reviver can observe or replace descendants.
                    // Its unrepresented live snapshot stays conservative while
                    // activating the actual callable through the shared graph.
                    if(composite){this.publish(receiver,this.opaqueObject);this.publish(key,this.unknownString);this.publish(callbackValue,this.unknown);this.publish(callbackContext,this.opaqueObject);}
                }catch{this.publish(parsed,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
            }
            for(const atom of text.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(parsed,atom);
            if(state.proof.primitiveComplete||state.pending&&!state.unresolved)return;
            this.publish(parsed,this.unknown);this.publish(receiver,this.opaqueObject);this.publish(key,this.unknownString);this.publish(callbackValue,this.unknown);this.publish(callbackContext,this.opaqueObject);
            const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
        });
        this.rule([reviver,parsed],()=>{
            for(const atom of parsed.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);
            if(![...parsed.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source"))return;
            for(const atom of reviver.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                const kinds=this.primitiveKinds(cell(atom));
                if(kinds&KIND_FUNCTION||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(callee,atom);
                if(!(kinds&KIND_FUNCTION)||atom.tag==="unknown"||atom.tag==="opaque-object")this.copy(parsed,result);
            }
        });
        return result;
    }
    private rawJSON(source:Cell,context:ts.Node):Cell {
        let calls=this.rawJSONResults.get(context);
        if(!calls){calls=new Map();this.rawJSONResults.set(context,calls);}
        const prior=calls.get(source);if(prior)return prior;
        const result=this.newCell(),text=this.stringHintCell(source,context),valid=this.newCell();
        calls.set(source,result);
        const prototype=this.newCell();this.publish(prototype,this.primitive(null));
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,rawJSON:valid};
        this.defineField(owner,"rawJSON",valid);
        const atom:Atom={tag:"object",owner};
        const invalid=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        let rule!:Rule;
        rule=this.rule([text],()=>{
            const state=this.primitiveState(text,rule,true);
            for(const value of state.proof.values){
                const input=String(value);
                try {
                    if(!/^[a-z0-9"-]/.test(input)||!/[a-z0-9"]/.test(input.slice(-1)))throw null;
                    JSON.parse(input);
                    this.publish(valid,this.primitive(input));this.publish(result,atom);
                }catch{invalid();}
            }
            for(const value of text.values)if(value.tag==="abrupt"||value.tag==="pending-source")this.publish(result,value);
            if(state.proof.primitiveComplete||state.pending&&!state.unresolved)return;
            this.publish(valid,this.unknownString);this.publish(result,atom);invalid();
        });
        return result;
    }
    /** Source projection follows the same root-holder/toJSON/replacer order
     * as the runtime Serialization Record. Unrepresented composite output
     * remains opaque; its callbacks and exceptions cannot become pure. */
    private jsonSerialization(value: Cell, replacer: Cell, space: Cell, context: ts.Node): Cell {
        let calls = this.jsonSerializations.get(context);
        if (!calls) {calls = new Map(); this.jsonSerializations.set(context, calls);}
        const signature = [value.id,replacer.id,space.id].join(":");
        const prior = calls.get(signature); if (prior) return prior;
        const result = this.newCell(); calls.set(signature, result);
        const prepared = this.newCell(), replaced = this.newCell(), key = this.newCell();
        this.publish(key, this.primitive(""));
        const wrapperOwner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
        const wrapper = this.newCell(); this.publish(wrapper,{tag:"object",owner:wrapperOwner});
        this.defineField(wrapperOwner,"",value);
        const opaque = () => {
            this.publish(result,this.unknownString); this.publish(result,this.primitive(undefined));
            const handler=this.exceptionHandlers.get(context); if(handler)this.publish(handler,this.unknown);
            this.onActive(context,()=>this.opaqueEffect(context));
        };
        const inputs = new Map<Atom,Cell>(), indexed = new Map<Cell,Map<SourcePropertyKey,Cell>>();
        const atomCell = (atom:Atom):Cell => {
            let input=inputs.get(atom);if(!input){input=this.newCell();inputs.set(atom,input);this.publish(input,atom);}return input;
        };
        const itemCell = (input:Cell,key:SourcePropertyKey):Cell => {
            let keys=indexed.get(input);if(!keys){keys=new Map();indexed.set(input,keys);}
            let item=keys.get(key);if(!item){item=this.property(input,key,context);keys.set(key,item);}return item;
        };
        const selected = new Set<Atom>();
        this.rule([value],()=>{
            for(const atom of value.values){
                if(selected.has(atom))continue; selected.add(atom);
                const kinds=this.primitiveKinds(atomCell(atom));
                if(!(kinds&(KIND_OBJECT|KIND_FUNCTION|KIND_BIGINT))){this.publish(prepared,atom);continue;}
                const owner=this.ordinaryOwner(atom);
                if(!owner){opaque();continue;}
                const receiver=this.newCell();this.publish(receiver,atom);
                const method=this.property(receiver,"toJSON",context),callee=this.newCell();
                this.invoke(context,callee,receiver,[{cell:key,spread:false}],prepared);
                this.rule([method],()=>{
                    for(const candidate of method.values){
                        if(candidate.tag==="abrupt"||candidate.tag==="pending-source"){this.publish(prepared,candidate);continue;}
                        const input=atomCell(candidate);
                        if(this.primitiveKinds(input)&KIND_FUNCTION||candidate.tag==="unknown"||candidate.tag==="opaque-object")this.publish(callee,candidate);
                        else this.publish(prepared,atom);
                    }
                });
            }
        });
        const replacerCallee=this.newCell();
        this.invoke(context,replacerCallee,wrapper,[{cell:key,spread:false},{cell:prepared,spread:false}],replaced);
        let options!:Rule;
        options=this.rule([replacer,space,prepared],()=>{
            for(const atom of replacer.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(replaced,atom);continue;}
                const input=atomCell(atom);
                const kinds=this.primitiveKinds(input);
                if(kinds&KIND_FUNCTION||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(replacerCallee,atom);
                else {
                    const owner=this.ordinaryOwner(atom);
                    if(owner?.listLength){
                        const length=this.arrayLikeLength(input,context),state=this.primitiveState(length,options,true);
                        if(state.pending&&!state.unresolved)continue;
                        const keys=this.propertyDomainKeys(input,context,options,"index");
                        if(keys===undefined)continue;
                        if(keys===null||!state.proof.primitiveComplete){opaque();continue;}
                        for(const name of keys){
                            const item=itemCell(input,name);this.watchText(options,item);
                            if(this.primitiveKinds(item)&(KIND_OBJECT|KIND_FUNCTION))opaque();
                        }
                    } else if(kinds&KIND_OBJECT&&!owner){opaque();continue;}
                    this.copy(prepared,replaced);
                }
            }
            for(const atom of space.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                const input=atomCell(atom);
                if(this.primitiveKinds(input)&KIND_OBJECT&&!this.ordinaryOwner(atom))opaque();
            }
        });
        const outputValues=this.newCell();
        this.rule([replaced],()=>{
            for(const atom of replaced.values){
                const raw=this.ordinaryOwner(atom)?.rawJSON;
                if(raw)this.copy(raw,result);else this.publish(outputValues,atom);
            }
        });
        let output!:Rule;
        output=this.rule([outputValues],()=>{
            const state=this.primitiveState(outputValues,output,true);
            for(const value of state.proof.values){
                try {this.publish(result,this.primitive(JSON.stringify(value)));}
                catch {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context!));}
            }
            if(state.proof.primitiveComplete)return;
            if(state.pending&&!state.unresolved)return;
            const kinds=this.primitiveKinds(outputValues);
            if(kinds&(KIND_OBJECT|KIND_BIGINT)){opaque();return;}
            if(kinds&KIND_FUNCTION)this.publish(result,this.primitive(undefined));
            if(kinds&(KIND_UNDEFINED|KIND_SYMBOL))this.publish(result,this.primitive(undefined));
            if(kinds&(KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_STRING))this.publish(result,this.unknownString);
        });
        return result;
    }
    private argumentSequence(context: ts.Node, parts: readonly ListPart[]): ArgumentSequence {
        let sequences = this.argumentSequences.get(context);
        if (!sequences) {sequences = new Map(); this.argumentSequences.set(context, sequences);}
        const key = "parts:" + parts.map(part => part.cell.id + ":" + part.spread).join(",");
        let sequence = sequences.get(key);
        if (!sequence) {
            sequence = {id: this.nextArgumentSequence++, context, positions: new Map(), kind: "parts", parts};
            sequences.set(key, sequence);
        }
        return sequence;
    }
    private transformArguments(source: ArgumentSequence, transform: {offset: number} | {prefix: readonly Cell[]}): ArgumentSequence {
        const sequences = this.argumentSequences.get(source.context)!;
        const key = source.id + ("offset" in transform ? ":slice:" + transform.offset : ":prefix:" + transform.prefix.map(cell => cell.id).join(","));
        let sequence = sequences.get(key);
        if (!sequence) {
            const common = {id: this.nextArgumentSequence++, context: source.context, positions: new Map<number, Cell>(), source};
            sequence = "offset" in transform ? {...common, kind: "slice", offset: transform.offset} : {...common, kind: "prepend", prefix: transform.prefix};
            sequences.set(key, sequence);
        }
        return sequence;
    }
    /** All possible argument values also activate every spread protocol.
     * Slice projections may retain earlier values conservatively for escape
     * effects; positional projection below retains the actual offset. */
    private allArgumentValues(sequence: ArgumentSequence): Cell {
        const prior = this.argumentValues.get(sequence); if (prior) return prior;
        const result = this.newCell(); this.argumentValues.set(sequence, result);
        const pending = [sequence], visited = new Set<ArgumentSequence>();
        while (pending.length) {
            const current = pending.pop()!;
            if (visited.has(current)) continue; visited.add(current);
            if (current.kind !== "parts") {
                if (current.kind === "prepend") for (const value of current.prefix) this.copy(value, result);
                pending.push(current.source);
                continue;
            }
            let rule!: Rule;
            rule = this.rule(current.parts.map(part => part.cell), () => {
                for (const part of current.parts) {
                    if (!part.spread) {this.copy(part.cell, result); continue;}
                    this.watchList(rule, part.cell, current.context);
                    for (const values of this.lists(part.cell, current.context)) {
                        if (values) for (const value of values) this.copy(value, result);
                        else this.copy(this.iteratorElements(part.cell, current.context), result);
                    }
                }
            });
        }
        return result;
    }
    private argumentPosition(sequence: ArgumentSequence, index: number): Cell {
        const prior = sequence.positions.get(index); if (prior) return prior;
        const result = this.newCell(); sequence.positions.set(index, result);
        // Persistent forwarding transformations are traversed iteratively.
        // No depth or argument-extent limit enters this projection.
        while (sequence.kind !== "parts") {
            if (sequence.kind === "slice") index += sequence.offset;
            else if (index < sequence.prefix.length) {this.copy(sequence.prefix[index]!, result); return result;}
            else index -= sequence.prefix.length;
            sequence = sequence.source;
            const cached = sequence.positions.get(index);
            if (cached) {this.copy(cached, result); return result;}
            sequence.positions.set(index, result);
        }
        const parts = sequence.parts;
        let rule!: Rule;
        rule = this.rule(parts.map(part => part.cell), () => {
            // ArgumentListEvaluation consumes every spread, including those
            // after the requested position. Their calls and effects belong
            // to the same invocation even when an earlier value was captured.
            for (const part of parts) if (part.spread) {
                this.watchList(rule, part.cell, sequence.context);
                this.watch(rule, this.iteratorElements(part.cell, sequence.context));
            }
            const pending: Array<{part: number; offset: number | null}> = [{part: 0, offset: index}];
            const visited = new Set<string>();
            while (pending.length) {
                const state = pending.pop()!, key = state.part + ":" + state.offset;
                if (visited.has(key)) continue; visited.add(key);
                const part = parts[state.part];
                if (!part) {this.publish(result, this.primitive(undefined)); continue;}
                const alternatives = part.spread ? this.lists(part.cell, sequence.context) : [[part.cell]];
                if (part.spread) this.watchList(rule, part.cell, sequence.context);
                for (const list of alternatives) {
                    if (list === null) {
                        const elements = this.iteratorElements(part.cell, sequence.context);
                        this.watch(rule, elements); this.copy(elements, result);
                        // Unknown extent can contain this position or end
                        // before it. Continue through the remaining sequence
                        // with a symbolic offset, without enumerating lengths.
                        pending.push({part: state.part + 1, offset: null});
                    } else if (state.offset === null) {
                        for (const value of list) this.copy(value, result);
                        pending.push({part: state.part + 1, offset: null});
                    } else if (state.offset < list.length) this.copy(list[state.offset]!, result);
                    else pending.push({part: state.part + 1, offset: state.offset - list.length});
                }
            }
        });
        return result;
    }
    private iteratorPrototype():Cell {
        if(!this.ordinaryIteratorPrototype) {
            const value=this.newCell();this.ordinaryIteratorPrototype=value;
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
            this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
            for(const key of [...runtimeIteratorMethods,this.wellKnownSymbols.get("iterator")!]) {
                const field=this.newCell();this.publish(field,this.unknown);this.defineField(owner,key,field);
            }
            for(const key of ["constructor",this.wellKnownSymbols.get("toStringTag")!]) {
                const accessor={get:this.newCell(),set:this.newCell()};
                this.publish(accessor.get,this.unknown);this.publish(accessor.set,this.unknown);
                this.accessorSlots.add(accessor.get);this.accessorSlots.add(accessor.set);owner.accessors.set(key,accessor);
                this.ownPresence(owner,key).initial=true;this.publish(this.presence(owner,key),this.primitive(true));
            }
        }
        return this.ordinaryIteratorPrototype;
    }
    private arrayIterator(receiver:Cell,context:ts.Node):Cell {
        let calls=this.arrayIterators.get(context);if(!calls){calls=new Map();this.arrayIterators.set(context,calls);}
        const prior=calls.get(receiver);if(prior)return prior;
        const result=this.newCell();calls.set(receiver,result);
        if(!this.ordinaryArrayIteratorPrototype) {
            const value=this.newCell();this.ordinaryArrayIteratorPrototype=value;
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.iteratorPrototype()};
            this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
            const next=this.newCell();this.publish(next,this.unknown);this.defineField(owner,"next",next);
            const tag=this.newCell();this.publish(tag,this.primitive("Array Iterator"));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag);
        }
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.ordinaryArrayIteratorPrototype};
        this.copy(this.opaqueMutation,owner.shape);const iterator:Atom={tag:"object",owner};
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null)) {
                this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
            }else this.publish(result,iterator);
        }});
        return result;
    }
    private iteratorCloseEffects(elements:Cell,context:ts.Node):void {
        const iterator=this.iterationRecords.get(elements);if(!iterator)return;
        const methods=this.property(iterator,"return",context),callee=this.newCell(),completion=this.newCell();
        this.invoke(context,callee,iterator,[],completion);
        // Loop-body abrupt completion may close a custom iterator. Until
        // completion-sensitive effects are represented, retain every possible
        // close getter/call instead of treating element precision as purity.
        this.rule([methods],()=>{for(const atom of methods.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null))continue;
            this.publish(callee,atom);
        }});
        this.rule([completion],()=>{for(const atom of completion.values)if(atom.tag==="primitive"||atom.tag==="non-string"||atom.tag==="unknown-string"||atom.tag==="text-operation"||atom.tag==="unknown") {
            const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
        }});
    }
    private iteratorElements(receiver: Cell, context: ts.Node): Cell {
        let contexts = this.iterationElements.get(receiver);
        if (!contexts) {contexts = new Map(); this.iterationElements.set(receiver, contexts);}
        const prior = contexts.get(context); if (prior) return prior;
        const result = this.newCell(); contexts.set(context, result);
        const method = this.iterationMethod(receiver, context), custom = this.newCell(), iterator = this.newCell();
        const closeIterators=this.newCell();this.copy(iterator,closeIterators);this.iterationRecords.set(result,closeIterators);
        const returned = this.newCell();
        let methods!: Rule;
        methods = this.rule([method], () => {
            for (const atom of method.values) {
                if (atom.tag === "operation" && atom.operation === "array-values") {
                    this.copy(this.arrayIterator(receiver,context),closeIterators);
                    const keys = this.propertyDomainKeys(receiver, context, methods, "index");
                    if (keys === null) this.publish(result, this.unknown);
                    else if (keys) {
                        this.publish(result, this.primitive(undefined));
                        for (const key of keys) this.copy(this.indexedRead(receiver, Number(key), context), result);
                    }
                } else this.publish(custom, atom);
            }
        });
        this.invoke(context, custom, receiver, [], iterator);
        const next = this.property(iterator, "next", context);
        this.invoke(context, next, iterator, [], returned);
        const records = new Map<Atom, {done: Cell; value: Cell}>();
        let steps!: Rule;
        steps = this.rule([returned], () => {
            for (const atom of returned.values) {
                if (atom.tag === "abrupt") continue;
                const owner = this.ordinaryOwner(atom);
                if (!owner) {
                    if (atom.tag === "unknown" || atom.tag === "opaque-object" || atom.tag === "pending-source") this.publish(result, atom);
                    continue;
                }
                let record = records.get(atom);
                if (!record) {
                    const input = this.newCell(); this.publish(input, atom);
                    record = {done: this.property(input, "done", context), value: this.newCell()}; records.set(atom, record);
                    const selected = record;
                    let valueRead: Cell | undefined;
                    let values!: Rule;
                    values = this.rule([selected.done], () => {
                        const state = this.primitiveState(selected.done, values, true);
                        if (state.pending && !state.unresolved) return;
                        if (!state.proof.primitiveComplete || state.proof.values.some(value => !value)) {
                            valueRead ??= this.property(input, "value", context);
                            this.copy(valueRead, selected.value);
                        }
                    });
                }
                this.watch(steps, record.value); this.copy(record.value, result);
            }
        });
        return result;
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
                    if(state.proof.primitiveComplete&&!state.proof.values.length)this.publish(stored,this.abrupt);
                    else {
                        const kinds=this.primitiveKinds(converted[0]!)&KIND_NUMERIC||KIND_NUMERIC;
                        let value=this.numericValues.get(kinds);if(!value){value={tag:"non-string",kinds};this.numericValues.set(kinds,value);}
                        this.publish(stored,value);
                    }
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
                    if(operation.form==="update"||ts.isBinaryExpression(node)&&operation.assignment===node.operatorToken.kind)
                        this.publish(handler,this.nativeException(node));
                    if (states.some(state => state.unresolved)) this.publish(handler,this.unknown);
                    if (states.some(state => !state.proof.primitiveComplete) && !this.numericOperationCannotThrow(operation,converted)) this.publish(handler,this.nativeException(node));
                    for (const tuple of this.primitiveTuples(states.map(state => state.proof.values))) {
                        try {operation.evaluate(tuple);} catch {this.publish(handler,this.nativeException(node));}
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
            const operand=this.cell(node.expression);let rule!:Rule;
            rule=this.rule([operand],()=>{
                this.watchText(rule,operand);
                const kinds=this.primitiveKinds(operand);
                for(const [mask,name]of [[KIND_UNDEFINED,"undefined"],[KIND_NULL|KIND_OBJECT,"object"],[KIND_BOOLEAN,"boolean"],[KIND_NUMBER,"number"],[KIND_BIGINT,"bigint"],[KIND_STRING,"string"],[KIND_SYMBOL,"symbol"],[KIND_FUNCTION,"function"]] as const)
                    if(kinds&mask)this.publish(result,this.text(name));
            });
            return;
        }
        if (ts.isStringLiteralLike(node)) this.publish(result, this.text(node.text));
        else if (ts.isNumericLiteral(node)) this.publish(result, this.primitive(Number(node.text)));
        else if (ts.isBigIntLiteral(node)) this.publish(result, this.primitive(BigInt(node.text.replace(/n$/i, ""))));
        else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword)
            this.publish(result, this.primitive(node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword));
        else if (ts.isIdentifier(node)) {
            const ambient=this.isAmbientIdentifier(node);
            const binding=this.binding(node);
            if(ambient)this.copyRead(binding,result,node);
            else this.copy(binding,result);
            if (this.bindingMayBeUninitialized(node)) this.publish(result,this.primitive(undefined));
            for (const base of this.withBindingObjects(node)) this.copy(this.property(base, node.text, node), result);
            if (ambient && !this.globalLexicals.has(node.text)) {
                if (node.text === "globalThis") this.publish(result, this.global);
                this.copyRead(this.globalBinding(node.text),result,node);
            }
            if(node.text!=="globalThis"&&binding===this.globals.get(node.text)) {
                this.publish(this.globalReceiver,this.global);
                const owner=this.ordinaryOwner(this.global)!;let linked=false;
                this.rule([owner.shape],()=>{
                    if(!linked&&(owner.accessors.has(node.text)||owner.accessors.has(null))) {
                        linked=true;this.copy(this.property(this.globalReceiver,node.text,node),result);
                    }
                });
            }
        } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
            const source = node.getSourceFile();
            let metadata = this.moduleMetadata.get(source);
            if (!metadata) {
                metadata = this.newCell(); this.moduleMetadata.set(source,metadata);
                const owner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
                this.publish(owner.prototype!,this.primitive(null)); this.publish(metadata,{tag:"object",owner});
            }
            this.copy(metadata,result);
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
            else this.publish(result, ecmaParseGoal(node.getSourceFile()) === "module" ? this.primitive(undefined) : this.global);
        } else if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
            const owner = this.owner(node);
            this.publish(result, { tag: "object", owner });
            if(ts.isObjectLiteralExpression(node)){
                owner.prototype=this.newCell();
                const prototype=!(node.getSourceFile().flags & ts.NodeFlags.JsonFile) ? node.properties.find(member=>ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__") as ts.PropertyAssignment|undefined : undefined;
                if(prototype){const value=this.cell(prototype.initializer);this.rule([value],()=>{for(const atom of value.values){
                    if(this.ordinaryOwner(atom)||atom===this.primitive(null)||atom.tag==="pending-source")this.publish(owner.prototype!,atom);
                    else if(atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,this.unknown);
                    else this.copy(this.objectPrototype(),owner.prototype!);
                }});}else this.copy(this.objectPrototype(),owner.prototype);
            }
            if (ts.isArrayLiteralExpression(node)) {
                owner.prototype=this.arrayPrototype();
                const parts = node.elements.map(element => ({ cell: this.cell(ts.isSpreadElement(element) ? element.expression : element), spread: ts.isSpreadElement(element) }));
                const holes=new Set(parts.filter((_,index)=>ts.isOmittedExpression(node.elements[index]!)).map(part=>part.cell));
                this.literalLists.set(owner,{node,parts,holes});
                owner.listLength = this.field(owner, "length");
                this.ownPresence(owner,"length").initial=true;this.publish(this.presence(owner,"length"),this.primitive(true));
                owner.listSources = parts.filter(part => part.spread).map(part => part.cell);
                const seen = new Set<string>();
                let rule: Rule;
                rule = this.rule(parts.map(part => part.cell), () => {
                    for (const part of parts) if (part.spread) this.watchList(rule, part.cell,node);
                    if (this.cyclicListShape(owner)) {
                        this.publish(owner.listLength!, this.unknown);
                        return;
                    }
                    for (const list of this.arguments(parts,node)) {
                        if (!list) continue;
                        const key = list.map(cell => cell.id).join(",");
                        if (seen.has(key)) continue;
                        seen.add(key);
                        list.forEach((value, index) => {if(!holes.has(value))this.defineField(owner,String(index),value);});
                        this.publish(owner.listLength!, this.primitive(list.length));
                    }
                });
            }
            if (ts.isObjectLiteralExpression(node)) for (const member of node.properties) {
                if(ts.isSpreadAssignment(member)){this.publish(owner.shape,this.unknown);continue;}
                if(!(node.getSourceFile().flags & ts.NodeFlags.JsonFile)&&ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__")continue;
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
        const sequence = this.argumentSequence(node, parts);
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
        const guards = this.guards(node);
        rule = this.rule([callee, receiver, ...parts.map(part => part.cell), ...guards.map(guard => guard.condition)], () => {
            let constructors = this.invocations.get(rule);
            if (!constructors) { constructors = new Map(); this.invocations.set(rule, constructors); }
            constructors.clear();
            let evaluations = this.evaluationInvocations.get(rule);
            if (!evaluations) { evaluations = new Map(); this.evaluationInvocations.set(rule,evaluations); }
            evaluations.clear();
            if (!this.guardsAllow(guards,rule)) {
                const unreachable=guards.some(guard=>{
                    const proof=this.primitiveChoiceProof(guard.condition);
                    return proof.primitiveComplete&&!proof.values.some(value=>!!value===guard.truthy);
                });
                if(unreachable)for(const atom of callee.values)if(atom.tag==="operation"&&atom.operation==="eval")
                    evaluations.set("unreachable",{node,operation:"eval",direct,source:null,unknown:false});
                return;
            }
            this.allArgumentValues(sequence);
            for (const part of parts) if (part.spread) this.watchList(rule, part.cell,node);
            const worklist: Array<{ target: Cell; receiver: Cell; args: readonly Cell[] | null; sequence: ArgumentSequence | null; boundPath: Set<Atom>; direct: boolean; construct: boolean }> = [
                ...this.arguments(parts,node).map(args => ({ target: callee, receiver: receiver, args, boundPath: new Set<Atom>(),
                    sequence, construct, direct }))];
            const routed = new Map<Atom, Set<string>>();
            while (worklist.length) {
                const invocation = worklist.pop()!; this.watch(rule, invocation.target);
                for (const atom of invocation.target.values) {
                    const signature = invocation.construct + ":" + invocation.receiver.id + ":" + (invocation.args?.map(cell => cell.id).join(",") ?? "sequence:" + invocation.sequence?.id);
                    if (atom.tag === "abrupt") {this.publish(result!, atom); continue;}
                    if (atom.tag === "primitive" || atom.tag === "non-string" || atom.tag === "unknown-string" || atom.tag === "text-operation") {
                        this.publish(result,this.abrupt);
                        const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler,this.nativeException(node));
                        continue;
                    }
                    if (atom.tag === "pending-source") {this.publish(result!,atom);continue;}
                    if (atom.tag === "unknown" || atom.tag === "opaque-object") {
                        // A return value belongs to the invocation that
                        // produced it, just as an opaque write does. Shared
                        // formals must retain that provenance when forwarding.
                        if(invocation.construct)this.publish(result!,this.opaqueObject);
                        else this.copy(this.executionOrigins(node),result!);
                        const handler = this.exceptionHandlers.get(node);
                        if (handler) this.publish(handler, this.unknown);
                        // Provenance distinguishes captured reads. After an
                        // opaque callee is selected its invocation effects
                        // share one signature, independent of origin count.
                        if (!handled(this.unknown,signature)) this.onActive(node,()=>{
                            this.opaqueEffect(node);
                            this.writeProperty(invocation.receiver,null,this.empty,false,"set",node);
                            const argumentsEscaping = invocation.args ?? (invocation.sequence ? [this.allArgumentValues(invocation.sequence)] : []);
                            for (const argument of argumentsEscaping) this.writeProperty(argument,null,this.empty,false,"set",node);
                        });
                        continue;
                    }
                    const argv = invocation.args;
                    const argument = (index: number): Cell | undefined => argv ? argv[index] : invocation.sequence ? this.argumentPosition(invocation.sequence, index) : undefined;
                    if (atom.tag === "operation" && invocation.construct) {
                        this.publish(result,this.abrupt);
                        const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));
                        continue;
                    }
                    if (atom.tag === "operation" && PROPERTY_MUTATIONS.has(atom.operation)) {
                        const activation = this.enclosingActivation(node);
                        if (activation) {this.watch(rule,activation.active);if(!activation.active.values.size)continue;}
                    }
                    if (atom.tag === "bound") {
                        if (invocation.boundPath.has(atom)) continue;
                        const boundPath = new Set(invocation.boundPath); boundPath.add(atom);
                        worklist.push({ ...invocation, target: atom.target, args: argv && atom.prefix ? [...atom.prefix, ...argv] : null, direct: false,
                            sequence: invocation.sequence && atom.prefix ? this.transformArguments(invocation.sequence, {prefix: atom.prefix}) : null,
                            receiver: invocation.construct ? invocation.receiver : atom.receiver, boundPath }); continue;
                    }
                    if (atom.tag === "operation" && ["call", "apply", "reflect-apply", "construct"].includes(atom.operation)) {
                        const previous = routed.get(atom) ?? new Set<string>();
                        if (previous.has(signature)) continue; previous.add(signature); routed.set(atom, previous);
                        const target = atom.operation === "reflect-apply" || atom.operation === "construct" ? argument(0) : invocation.receiver;
                        const listIndex = atom.operation === "reflect-apply" ? 2 : 1;
                        const list = argument(listIndex);
                        const actual = atom.operation === "call" ? [argv?.slice(1) ?? null] : list ? this.arrayLikeLists(list,node,rule,result,atom.operation==="apply") : atom.operation==="apply"&&argv ? [[]] : [null];
                        if (target) for (const args of actual) worklist.push({ ...invocation, target, direct: false,
                            construct: atom.operation === "construct",
                            receiver: atom.operation === "call" || atom.operation === "apply" ? argument(0) ?? this.empty : atom.operation === "reflect-apply" ? argument(1) ?? this.empty : constructedReceiver,
                            sequence: atom.operation === "call" && invocation.sequence ? this.transformArguments(invocation.sequence, {offset: 1}) : null, args });
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
                            if (invocation.construct) {this.publish(result, this.abrupt); if (handler) this.publish(handler, this.nativeException(node)); continue;}
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
                            if (atom.normalResult !== "primitive-string" || invocation.construct) this.publish(handler, this.nativeException(node));
                            // Coercion can call arbitrary user code. A
                            // result category cannot erase its exceptions.
                            if (atom.normalResult === "unknown" || argv === null || atom.normalResult !== "primitive-string" && argv.some(argument =>
                                [...argument.values].some(value => value.tag !== "primitive" && value.tag !== "non-string")))
                                this.publish(handler, this.unknown);
                        }
                    } else if (atom.tag === "function") {
                        if (ts.isClassLike(atom.owner.definition) && !invocation.construct) {
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.publish(handler,this.nativeException(node));
                            // This target always throws; it has no String
                            // normal completion for source admission.
                            this.publish(result!,this.abrupt);
                            continue;
                        }
                        this.onActive(node,()=>this.copy(this.executionOrigins(node),atom.owner.active));
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
                                let location = this.restLocations.get(parameter);
                                if (!location) {
                                    const restOwner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.arrayPrototype()};
                                    restOwner.listLength = this.field(restOwner, "length");
                                    this.ownPresence(restOwner,"length").initial=true;this.publish(this.presence(restOwner,"length"),this.primitive(true));
                                    location = {value:this.newCell(),owner:restOwner};
                                    this.restLocations.set(parameter,location);
                                    this.publish(location.value, {tag:"object",owner:restOwner});
                                }
                                const rest = location.value, restOwner = location.owner;
                                if (argv) this.publish(restOwner.listLength!, this.primitive(Math.max(0, argv.length - index)));
                                else {this.publish(restOwner.listLength!, this.unknown); this.publish(restOwner.shape, this.unknown);}
                                for(const [offset,value] of (argv?.slice(index) ?? []).entries())this.copy(value,this.field(restOwner,String(offset)));
                                this.bind(parameter.name, rest);
                            } else {
                                const value = argument(index);
                                if (value) this.bind(parameter.name, value);
                                else this.bind(parameter.name, omittedArgument);
                            }
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
                            // Shared return facts can include a later call's
                            // opaque value. Capture with the same ordering
                            // proof used for location reads; dynamic callers
                            // keep the complete conservative union.
                            } else this.copyRead(atom.owner.returns, result!,node);
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.copy(atom.owner.throws, handler);
                        }
                    } else if (atom.tag === "operation") {
                        if(atom.operation==="array-values"){this.copy(this.arrayIterator(invocation.receiver,node),result);continue;}
                        if(atom.operation==="json-parse"){
                            this.copy(this.jsonParse(argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);continue;
                        }
                        if(atom.operation==="json-raw"){
                            this.copy(this.rawJSON(argument(0)??omittedArgument,node),result);continue;
                        }
                        if(atom.operation==="json-is-raw"){
                            const input=argument(0)??omittedArgument;this.watch(rule,input);
                            for(const value of input.values){
                                if(value.tag==="abrupt"||value.tag==="pending-source"){this.publish(result,value);continue;}
                                const owner=this.ordinaryOwner(value);
                                this.publish(result,this.primitive(!!owner?.rawJSON));
                                if(!owner&&(value.tag==="unknown"||value.tag==="opaque-object"||value.tag==="non-string"))this.publish(result,this.primitive(true));
                            }
                            continue;
                        }
                        if(atom.operation==="error-text"){this.copy(this.errorText(invocation.receiver,node),result);continue;}
                        if(atom.operation==="json-stringify"){
                            this.copy(this.jsonSerialization(argument(0)??omittedArgument,argument(1)??omittedArgument,argument(2)??omittedArgument,node),result);
                            continue;
                        }
                        if(atom.operation==="array-join"){
                            const length=this.arrayLikeLength(invocation.receiver,node);
                            const state=this.primitiveState(length,rule,true);
                            if(state.pending&&!state.unresolved)continue;
                            if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);continue;}
                            const positions=argv?this.indexedPropertyPositions(invocation.receiver,node,rule):null;
                            if(positions===undefined)continue;
                            if(positions===null||!state.proof.primitiveComplete){
                                if(handled(atom,signature+":opaque"))continue;
                                this.publish(result,this.unknownString);
                                const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.unknown);
                                this.onActive(node,()=>this.opaqueEffect(node));
                                continue;
                            }
                            for(const extent of state.proof.values){
                                const size=extent as number,indices=positions.filter(index=>index<size);
                                const listKey=signature+":"+size+":"+indices.join(",");
                                if(handled(atom,listKey))continue;
                                // join reads indices during the invocation,
                                // after separator conversion. Keep ordinary
                                // getters and writes in those location facts.
                                const inputs=[this.joinTextInput(argv?.[0]??omittedArgument,true),...indices.map(index=>this.joinTextInput(this.indexedRead(invocation.receiver,index,node),false))];
                                const converted=this.convertList(inputs,node,"text");
                                this.publish(result,{tag:"text-operation",operation:"array-join",parts:converted,indexedRange:{length:size,positions:indices}});
                            }
                            continue;
                        }
                        if(atom.operation.startsWith("agent-member:")){
                            const descriptor=test262AgentOperations.get(atom.operation.slice("agent-member:".length))!;
                            if(descriptor.operation==="RECEIVE"&&argv?.[0]){
                                const buffer=this.newCell(),identifier=this.newCell();this.publish(buffer,this.opaqueObject);this.publish(identifier,this.nonString);
                                this.invoke(node,argv[0],omittedArgument,[{cell:buffer,spread:false},{cell:identifier,spread:false}],this.newCell());
                            }
                            if(descriptor.operation==="REPORT"&&argv?.[0])this.watchText(rule,this.stringHintCell(argv[0],node));
                            if(descriptor.operation==="SLEEP"&&argv?.[0])this.watchText(rule,this.coerceCell(argv[0],node,"number"));
                            if(descriptor.operation==="BROADCAST"&&argv?.[1])this.watchText(rule,this.primitiveConversion(argv[1],node,"number"));
                            if(descriptor.operation==="NOW")this.publish(result,this.nonString);
                            else if(descriptor.operation==="GET_REPORT"){this.publish(result,this.primitive(null));this.publish(result,this.unknownString);}
                            else this.publish(result,this.primitive(undefined));
                            continue;
                        }
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
                                else {this.publish(result, this.abrupt); const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler, this.nativeException(node));}
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
                                        if (target.tag === "abrupt") continue;
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
                                else if(receiver.tag==="operation"&&jsonOperations.has(receiver.operation as JSONSourceOperation))
                                    this.publish(result!,this.text(`function ${jsonOperations.get(receiver.operation as JSONSourceOperation)!.name}() { [native code] }`));
                                else if(receiver.tag==="primitive") {
                                    this.publish(result!,this.abrupt);
                                    const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));
                                } else this.publish(result!, receiver.tag === "pending-source" ? receiver : this.unknown);
                            }
                            this.watch(rule, invocation.receiver);
                        }
                        if (atom.operation === "realm") this.publish(result!, this.realm);
                        if (atom.operation === "eval" || atom.operation === "eval-script" || atom.operation === "agent-start") {
                            const first = argument(0);
                            const source = first ? atom.operation === "eval" ? first : this.stringHintCell(first, node) : null;
                            const direct = atom.operation === "eval" && invocation.direct;
                            const key = result!.id + ":" + atom.operation + ":" + direct + ":" + (source?.id ?? (argv ? "omitted" : "unknown"));
                            evaluations.set(key, { node, operation: atom.operation, direct, source, unknown: !argv && !invocation.sequence });
                            if (noArguments) {this.publish(result!, this.abrupt); continue;}
                            if (atom.operation === "agent-start") {this.publish(result,this.primitive(undefined));continue;}
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
                                    for(const origins of this.evaluationOrigins.get(String(text))??[])
                                        this.copy(this.executionOrigins(node),origins);
                                    if (!generated) this.publish(result!,this.pendingSource);
                                    if (this.invalidEvaluations.has(String(text))) {
                                        const handler = this.exceptionHandlers.get(node);
                                        if (handler) this.onActive(node, () => this.publish(handler, this.nativeException(node)));
                                    }
                                    for (const value of generated ?? []) this.copy(value, result!);
                                    const handler=this.exceptionHandlers.get(node);
                                    if(handler)for(const errors of this.evaluationThrows.get(String(text))??[])this.copy(errors,handler);
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
    private watchList(rule: Rule, cell: Cell,context?:ts.Node): void {
        this.watch(rule,this.iterationMethod(cell,context));
        const pending = [cell], visited = new Set<Cell>();
        while (pending.length) {
            const input = pending.pop()!; if (visited.has(input)) continue; visited.add(input); this.watch(rule, input);
            for (const atom of input.values) {
                const owner=this.ordinaryOwner(atom);if(!owner)continue;
                this.watch(rule, owner.shape);
                if (owner.listLength) pending.push(owner.listLength);
                if(owner.prototype)pending.push(owner.prototype);
                for (const field of owner.fields.values()) pending.push(field);
                for(const accessor of owner.accessors.values())pending.push(accessor.get,accessor.set);
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
                            } else if(atom.operation==="error-text")add(tuple[0]===""?tuple[1]!:tuple[1]===""?tuple[0]!:String(tuple[0])+": "+String(tuple[1]));
                            else if (atom.operation === "bound-name") add("bound " + (typeof tuple[0] === "string" ? tuple[0] : ""));
                            else if(atom.operation==="array-join"){
                                const range=atom.indexedRange,separator=String(tuple[0]),pieces:string[]=[];
                                let previous=0;
                                try{
                                    for(const [index,position] of range.positions.entries()){
                                        pieces.push(separator.repeat(position-previous),String(tuple[index+1]));previous=position;
                                    }
                                    pieces.push(separator.repeat(Math.max(0,range.length-1-previous)));
                                    add(pieces.join(""));
                                }catch{
                                    // A host String allocation limit cannot
                                    // establish a language-level abrupt result.
                                    primitiveComplete=false;textComplete=false;
                                }
                            }
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
            while (this.moduleNamespacePending.length || this.initializers.length || this.queueCursor < this.queue.length || this.primitiveChanges.size) {
                if (this.moduleNamespacePending.length) { const namespace = this.moduleNamespacePending.pop()!; this.initializeModuleNamespace(namespace.source,namespace.symbol,namespace.owner); }
                else if (this.initializers.length) { const initializer = this.initializers.pop()!; this.initialize(initializer.node, initializer.result); }
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
            if(!this.presenceClosed){
                // Unresolved external bindings are value inputs, rather than
                // owner absence dependencies. Wake their guarded mutations
                // before sealing any contextual own-location absence.
                for(const [node,cell]of this.cells)if(ts.isIdentifier(node)&&!cell.values.size&&!this.bindingSymbol(node)){
                    this.publish(this.binding(node),this.unknown);changed=true;
                }
                if(changed)continue;
                this.presenceClosed=true;for(const rule of this.presenceRules)this.schedule(rule);continue;
            }
            for (const cell of this.exceptionCells) if (!cell.values.size) {this.publish(cell, this.abrupt); changed = true;}
            for (const cell of this.accessorSlots) if (!cell.values.size) {this.publish(cell, this.primitive(undefined)); changed = true;}
            if (changed) continue;
            for (const [node, cell] of this.cells) if (!cell.values.size) {
                const activation = this.enclosingActivation(node);
                if (activation && !activation.active.values.size) continue;
                if(this.guards(node).some(guard=>{
                    const proof=this.primitiveChoiceProof(guard.condition);
                    return proof.primitiveComplete&&!proof.values.some(value=>!!value===guard.truthy);
                })){this.publish(cell,this.abrupt);changed=true;continue;}
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
                return {kind: invocation.kind, choices: choices && choices.every(value => value !== null) ? choices : null,...(this.domain?{domain:this.domain}:{})};
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
                return { node: invocation.node, operation, direct: invocation.direct, choices,...(this.domain?{domain:this.domain}:{}) };
            }),
        };
    }
}

type SourceValueSolution = ReturnType<SourceValueFlow["solve"]>;
const sourceValueSolutions = new WeakMap<ts.Program, Map<string, SourceValueSolution>>();
/** The same monotone solver runs over each execution domain's reachable
 * source graph. Worker Scripts have fresh globals and cannot mutate the
 * parent's ordinary owners; imported code is projected into each domain. */
function sourceDomainSolutions(program:ts.Program,entries:SourceValueGraphEntries):SourceValueSolution {
    const agents=(entries.evaluations??[]).filter(entry=>entry.kind==="agent"&&entry.entry);
    if(!agents.length)return new SourceValueFlow(program,entries).solve();
    const allFiles=new Map(program.getSourceFiles().map(file=>[path.resolve(file.fileName),file]));
    const generated=new Set([
        ...(entries.evaluations??[]).flatMap(entry=>entry.entry?[path.resolve(entry.entry)]:[]),
        ...(entries.functions??[]).flatMap(entry=>entry.entry?[path.resolve(entry.entry)]:[]),
    ]);
    const domains=new Map<string,Set<string>>();
    domains.set("",new Set((entries.roots??program.getRootFileNames().filter(file=>!generated.has(path.resolve(file)))).map(file=>path.resolve(file))));
    for(const entry of agents){const domain=sourceAgentDomain(entry.source);let roots=domains.get(domain);if(!roots){roots=new Set();domains.set(domain,roots);}roots.add(path.resolve(entry.entry!));}
    const checker=program.getTypeChecker();
    const host:ts.ModuleResolutionHost={
        fileExists:file=>allFiles.has(path.resolve(file))||ts.sys.fileExists(file),
        readFile:file=>allFiles.get(path.resolve(file))?.text??ts.sys.readFile(file),
    };
    const directories=new Set<string>();
    for(const filename of allFiles.keys()){let directory=path.dirname(filename);while(!directories.has(directory)){directories.add(directory);const parent=path.dirname(directory);if(parent===directory)break;directory=parent;}}
    host.directoryExists=directory=>directories.has(path.resolve(directory))||ts.sys.directoryExists(directory);
    const result:SourceValueSolution={constructors:[],evaluations:[]};
    for(const [domain,roots] of domains){
        const evaluations=(entries.evaluations??[]).filter(entry=>entry.kind==="agent"
            ? sourceAgentDomain(entry.source)===domain : (entry.domain??"")===domain);
        const functions=(entries.functions??[]).filter(entry=>(entry.domain??"")===domain);
        const sources=new Set<ts.SourceFile>(),pending=[...roots,...evaluations.flatMap(entry=>entry.entry?[entry.entry]:[]),...functions.flatMap(entry=>entry.entry?[entry.entry]:[])];
        while(pending.length){
            const file=allFiles.get(path.resolve(pending.pop()!));if(!file||file.isDeclarationFile||sources.has(file))continue;sources.add(file);
            const nodes:ts.Node[]=[file];
            while(nodes.length){
                const node=nodes.pop()!;
                const specifier=ts.isImportDeclaration(node)||ts.isExportDeclaration(node)?node.moduleSpecifier:
                    ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==="require")?node.arguments[0]:undefined;
                if(specifier&&ts.isExpression(specifier)){
                    const symbol=checker.getSymbolAtLocation(specifier);
                    for(const declaration of symbol?.declarations??[])if(ts.isSourceFile(declaration))pending.push(declaration.fileName);
                    for(const name of staticStringExpressionTexts(specifier)??[]){
                        const resolved=ts.resolveModuleName(name,file.fileName,program.getCompilerOptions(),host).resolvedModule;
                        if(resolved)pending.push(sourceUnitFileName(program,resolved.resolvedFileName,"module"));
                    }
                }
                ts.forEachChild(node,child=>{nodes.push(child);});
            }
        }
        const solved=new SourceValueFlow(program,{...entries,roots:[...roots],functions,evaluations},domain||undefined,sources).solve();
        result.constructors.push(...solved.constructors);result.evaluations.push(...solved.evaluations);
    }
    return result;
}
function sourceValueSolution(program: ts.Program, entries: SourceValueGraphEntries): SourceValueSolution {
    const key = JSON.stringify([
        entries.roots,
        (entries.functions ?? []).map(entry => [entry.kind ?? "ordinary", entry.parameters, entry.body, entry.entry,entry.domain]),
        (entries.evaluations ?? []).map(entry => [entry.source, entry.entry,entry.kind,entry.domain]),
    ]);
    let solutions = sourceValueSolutions.get(program);
    if (!solutions) {solutions = new Map(); sourceValueSolutions.set(program,solutions);}
    let solution = solutions.get(key);
    if (!solution) {solution = sourceDomainSolutions(program, entries); solutions.set(key,solution);}
    return solution;
}
export function sourceConstructorInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): ConstructorInvocation[] {
    return sourceValueSolution(program, entries).constructors.slice();
}

export function sourceEvaluationInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): EvaluationInvocation[] {
    return sourceValueSolution(program, entries).evaluations.slice();
}
