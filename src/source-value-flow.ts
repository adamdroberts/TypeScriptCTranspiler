import ts from "typescript";
import * as path from "node:path";
import { staticStringExpressionTexts } from "./module-specifiers";
import { functionKindForDeclaration, type DynamicFunctionKind, type FunctionConstructorEntry } from "./function-constructor-source";

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

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction |
    ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration | ts.ConstructorDeclaration;
type Domain = "constructor" | "prototype" | "instance";
type Operation = "prototype" | "eval" | "realm" | "call" | "apply" | "bind" | "reflect-apply" | "construct";
type Primitive = string | number | bigint | boolean | null | undefined;
interface ListPart { readonly cell: Cell; readonly spread: boolean; }
type Atom =
    | { readonly tag: "intrinsic"; readonly domain: Domain; readonly kind: DynamicFunctionKind }
    | { readonly tag: "function"; readonly owner: FunctionOwner }
    | { readonly tag: "object"; readonly owner: ObjectOwner }
    | { readonly tag: "operation"; readonly operation: Operation }
    | { readonly tag: "bound"; readonly target: Cell; readonly prefix: readonly Cell[] | null }
    | { readonly tag: "primitive"; readonly value: Primitive }
    | { readonly tag: "text-operation"; readonly operation: "add" | "template"; readonly parts: readonly Cell[] }
    | { readonly tag: "promise"; readonly value: Cell }
    | { readonly tag: "generator"; readonly owner: FunctionOwner }
    | { readonly tag: "global" } | { readonly tag: "host" } | { readonly tag: "realm-record" };
interface Cell { readonly id: number; readonly values: Set<Atom>; readonly users: Set<Rule>; }
interface Rule { readonly inputs: Set<Cell>; readonly run: () => void; queued: boolean; }
interface ObjectOwner { readonly fields: Map<string, Cell>; readonly getters: Map<string, FunctionOwner>; readonly shape: Cell; list?: readonly ListPart[]; }
interface FunctionOwner {
    readonly node: FunctionNode; readonly kind: DynamicFunctionKind; readonly fields: ObjectOwner;
    readonly returns: Cell; readonly receiver: Cell;
}
interface Call { readonly node: ts.CallExpression | ts.NewExpression; readonly callee: Cell; readonly receiver: Cell; readonly result: Cell; }

function unwrap(node: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
        ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
    return node;
}
function functionNode(node: ts.Node): node is FunctionNode {
    return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isConstructorDeclaration(node);
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
    private readonly bindings = new Map<ts.Symbol, Cell>();
    private readonly objects = new Map<ts.Node, ObjectOwner>();
    private readonly functions = new Map<FunctionNode, FunctionOwner>();
    private readonly copies = new Map<Cell, Set<Cell>>();
    private readonly queue: Rule[] = [];
    private readonly initializers: Array<{ node: ts.Node; result: Cell }> = [];
    private readonly invocations: Array<{ kind: DynamicFunctionKind; args: readonly Cell[] | null }> = [];
    private readonly intrinsicAtoms = new Map<string, Atom>();
    private readonly operations = new Map<Operation, Atom>();
    private readonly primitives = new Map<string, Atom>();
    private readonly evaluations = new Map<string, Cell[]>();
    private readonly generated = new Map<DynamicFunctionKind, Cell[]>();
    private readonly global: Atom = { tag: "global" };
    private readonly host: Atom = { tag: "host" };
    private readonly realm: Atom = { tag: "realm-record" };
    private nextCell = 0;
    private readonly empty = this.newCell();
    private readonly checker: ts.TypeChecker;
    constructor(program: ts.Program, entries: SourceValueGraphEntries) {
        this.checker = program.getTypeChecker();
        for (const entry of entries.evaluations ?? []) {
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
            values.push(this.cell(statement.expression)); this.generated.set(entry.kind ?? "ordinary", values);
        }
        for (const file of program.getSourceFiles()) {
            if (file.isDeclarationFile) continue;
            const worklist: ts.Node[] = [file];
            while (worklist.length) {
                const node = worklist.pop()!;
                if (ts.isVariableDeclaration(node) && node.initializer) this.bind(node.name, this.cell(node.initializer));
                if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    const target = unwrap(node.left);
                    if (ts.isIdentifier(target)) this.copy(this.cell(node.right), this.binding(target));
                    else if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
                        const base = this.cell(target.expression), value = this.cell(node.right), name = propertyName(target);
                        if (name !== null) this.rule([base], () => {
                            for (const atom of base.values) {
                                const owner = atom.tag === "object" ? atom.owner : atom.tag === "function" ? atom.owner.fields : null;
                                if (owner) this.copy(value, this.field(owner, name));
                            }
                        });
                    }
                }
                if (functionNode(node)) this.function(node);
                if (ts.isCallExpression(node) || ts.isNewExpression(node)) this.cell(node);
                node.forEachChild(child => { worklist.push(child); });
            }
        }
    }
    private newCell(): Cell { return { id: this.nextCell++, values: new Set(), users: new Set() }; }
    private publish(cell: Cell, atom: Atom): void {
        if (cell.values.has(atom)) return;
        cell.values.add(atom); for (const user of cell.users) this.schedule(user);
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
        this.rule([from], () => { for (const value of from.values) this.publish(into, value); });
    }
    private binding(node: ts.Identifier): Cell {
        let symbol = this.checker.getSymbolAtLocation(node);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = this.checker.getAliasedSymbol(symbol);
        if (!symbol) return this.empty;
        let cell = this.bindings.get(symbol);
        if (!cell) {
            cell = this.newCell(); this.bindings.set(symbol, cell);
            const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
            if (declaration && functionNode(declaration)) this.copy(this.cell(declaration), cell);
        }
        return cell;
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
        const key = typeof value + ":" + String(value);
        let atom = this.primitives.get(key);
        if (!atom) { atom = { tag: "primitive", value }; this.primitives.set(key, atom); }
        return atom;
    }
    private owner(node: ts.Node): ObjectOwner {
        let owner = this.objects.get(node);
        if (!owner) { owner = { fields: new Map(), getters: new Map(), shape: this.newCell() }; this.objects.set(node, owner); }
        return owner;
    }
    private field(owner: ObjectOwner, key: string): Cell {
        let cell = owner.fields.get(key);
        if (!cell) { cell = this.newCell(); owner.fields.set(key, cell); this.publish(owner.shape, this.text(key)); }
        return cell;
    }
    private property(base: Cell, key: string): Cell {
        const result = this.newCell();
        this.rule([base], () => { for (const atom of base.values) this.read(atom, base, key, result); });
        return result;
    }
    private read(atom: Atom, base: Cell, key: string, result: Cell): void {
        const owner = atom.tag === "object" ? atom.owner : atom.tag === "function" ? atom.owner.fields : null;
        if (owner) {
            this.copy(this.field(owner, key), result);
            const getter = owner.getters.get(key);
            if (getter) { this.copy(base, getter.receiver); this.copy(getter.returns, result); }
        }
        if (atom.tag === "function") {
            if (key === "constructor") this.publish(result, this.intrinsic("constructor", atom.owner.kind));
            if (key === "prototype" && atom.owner.kind !== "async") this.publish(result, this.intrinsic("instance", atom.owner.kind));
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
        if (atom.tag === "global") {
            if (key === "Function") this.publish(result, this.intrinsic("constructor", "ordinary"));
            if (key === "eval") this.publish(result, this.operation("eval"));
            if (key === "$262") this.publish(result, this.host);
        }
        if (atom.tag === "host") {
            if (key === "createRealm") this.publish(result, this.operation("realm"));
            if (key === "evalScript") this.publish(result, this.operation("eval"));
            if (key === "global") this.publish(result, this.global);
        }
        if (atom.tag === "realm-record") {
            if (key === "global") this.publish(result, this.global);
            if (key === "evalScript") this.publish(result, this.operation("eval"));
        }
        if (["function", "bound", "intrinsic", "operation"].includes(atom.tag) && ["call", "apply", "bind"].includes(key))
            this.publish(result, this.operation(key as Operation));
        if (atom.tag === "generator" && key === "constructor") this.publish(result, this.intrinsic("prototype", atom.owner.kind));
    }
    private bind(name: ts.BindingName, value: Cell): void {
        const worklist = [{ name, value }];
        while (worklist.length) {
            const entry = worklist.pop()!;
            if (ts.isIdentifier(entry.name)) { this.copy(entry.value, this.binding(entry.name)); continue; }
            for (const [index, element] of entry.name.elements.entries()) {
                if (!ts.isBindingElement(element)) continue;
                const key = ts.isObjectBindingPattern(entry.name) ? propertyName(element.propertyName ?? element.name) : String(index);
                const selected = element.dotDotDotToken ? entry.value : key === null ? this.empty : this.property(entry.value, key);
                if (element.initializer) this.copy(this.cell(element.initializer), selected);
                worklist.push({ name: element.name, value: selected });
            }
        }
    }
    private function(node: FunctionNode): FunctionOwner {
        let owner = this.functions.get(node);
        if (owner) return owner;
        owner = { node, kind: functionKindForDeclaration(node), fields: this.owner(node), returns: this.newCell(),
            receiver: this.newCell() };
        this.functions.set(node, owner);
        if (node.body && !ts.isBlock(node.body)) this.copy(this.cell(node.body), owner.returns);
        else if (node.body) {
            const worklist: ts.Node[] = [...node.body.statements];
            while (worklist.length) {
                const item = worklist.pop()!;
                if (functionNode(item) || ts.isClassLike(item)) continue;
                if (ts.isReturnStatement(item) && item.expression) this.copy(this.cell(item.expression), owner.returns);
                item.forEachChild(child => { worklist.push(child); });
            }
        }
        return owner;
    }
    private lists(cell: Cell): Array<readonly Cell[] | null> {
        // List shape is a source-owned sequence graph, never an expanding set
        // of retained lengths. Cyclic spread dependencies have no finite
        // proof and retain the existing manifest/runtime diagnostic boundary.
        const pending = [{ cell, finish: false }], active = new Set<Cell>();
        const values = new Map<Cell, Array<readonly Cell[] | null>>();
        while (pending.length) {
            const task = pending.pop()!;
            if (values.has(task.cell)) continue;
            if (task.finish) {
                active.delete(task.cell);
                const alternatives: Array<readonly Cell[] | null> = [];
                for (const atom of task.cell.values) if (atom.tag === "object" && atom.owner.list) {
                    let lists: Array<readonly Cell[] | null> = [[]];
                    for (const part of atom.owner.list) {
                        const tails = part.spread ? values.get(part.cell) ?? [null] : [[part.cell]];
                        lists = lists.flatMap(prefix => tails.map(tail => prefix && tail ? [...prefix, ...tail] : null));
                    }
                    for (const list of lists) {
                        if (!list) { alternatives.push(null); continue; }
                        const locations = list.map((source, index) => {
                            const location = this.field(atom.owner, String(index));
                            this.copy(source, location);
                            return location;
                        });
                        alternatives.push(locations);
                    }
                }
                values.set(task.cell, alternatives.length ? alternatives : [null]);
            } else {
                if (active.has(task.cell)) return [null];
                active.add(task.cell); pending.push({ ...task, finish: true });
                for (const atom of task.cell.values) if (atom.tag === "object" && atom.owner.list)
                    for (const part of atom.owner.list) if (part.spread) pending.push({ cell: part.cell, finish: false });
            }
        }
        return values.get(cell) ?? [null];
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
        if (functionNode(node)) { this.publish(result, { tag: "function", owner: this.function(node) }); return; }
        if (ts.isStringLiteralLike(node)) this.publish(result, this.text(node.text));
        else if (ts.isNumericLiteral(node)) this.publish(result, this.primitive(Number(node.text)));
        else if (ts.isBigIntLiteral(node)) this.publish(result, this.primitive(BigInt(node.text.replace(/n$/i, ""))));
        else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword)
            this.publish(result, this.primitive(node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword));
        else if (ts.isIdentifier(node)) {
            this.copy(this.binding(node), result);
            const symbol = this.checker.getSymbolAtLocation(node);
            const ambient = (symbol?.declarations ?? []).every(declaration => declaration.getSourceFile().isDeclarationFile);
            if (ambient) {
                if (node.text === "Function") this.publish(result, this.intrinsic("constructor", "ordinary"));
                if (node.text === "globalThis") this.publish(result, this.global);
                if (node.text === "$262") this.publish(result, this.host);
                if (node.text === "eval") this.publish(result, this.operation("eval"));
                if (node.text === "undefined") this.publish(result, this.primitive(undefined));
                if (node.text === "NaN") this.publish(result, this.primitive(NaN));
                if (node.text === "Infinity") this.publish(result, this.primitive(Infinity));
            }
        } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
            let parent: ts.Node | undefined = node.parent;
            while (parent && (!functionNode(parent) || ts.isArrowFunction(parent))) parent = parent.parent;
            if (parent && functionNode(parent)) this.copy(this.function(parent).receiver, result);
            else this.publish(result, this.global);
        } else if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
            const owner = this.owner(node);
            this.publish(result, { tag: "object", owner });
            if (ts.isArrayLiteralExpression(node)) {
                const parts = node.elements.map(element => ({ cell: this.cell(ts.isSpreadElement(element) ? element.expression : element), spread: ts.isSpreadElement(element) }));
                owner.list = parts;
                const seen = new Set<string>();
                let rule: Rule;
                rule = this.rule(parts.map(part => part.cell), () => {
                    for (const part of parts) if (part.spread) this.watchList(rule, part.cell);
                    for (const list of this.arguments(parts)) {
                        if (!list) continue;
                        const key = list.map(cell => cell.id).join(",");
                        if (seen.has(key)) continue;
                        seen.add(key);
                        list.forEach((value, index) => this.copy(value, this.field(owner, String(index))));
                    }
                });
            }
            if (ts.isObjectLiteralExpression(node)) for (const member of node.properties) {
                const key = "name" in member ? propertyName(member.name) : null;
                if (key !== null) {
                    if (ts.isPropertyAssignment(member)) this.copy(this.cell(member.initializer), this.field(owner, key));
                    if (ts.isShorthandPropertyAssignment(member)) this.copy(this.cell(member.name), this.field(owner, key));
                    if (ts.isMethodDeclaration(member)) this.copy(this.cell(member), this.field(owner, key));
                    if (ts.isGetAccessorDeclaration(member)) owner.getters.set(key, this.function(member));
                }
            }
        } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            const key = propertyName(node);
            if (key !== null) {
                this.copy(this.property(this.cell(node.expression), key), result);
                const base = unwrap(node.expression);
                if (ts.isIdentifier(base) && ["Object", "Reflect"].includes(base.text) &&
                    (this.checker.getSymbolAtLocation(base)?.declarations ?? []).every(declaration => declaration.getSourceFile().isDeclarationFile)) {
                    if (key === "getPrototypeOf") this.publish(result, this.operation("prototype"));
                    if (base.text === "Reflect" && key === "apply") this.publish(result, this.operation("reflect-apply"));
                    if (base.text === "Reflect" && key === "construct") this.publish(result, this.operation("construct"));
                }
            }
        } else if (ts.isConditionalExpression(node)) {
            this.copy(this.cell(node.whenTrue), result); this.copy(this.cell(node.whenFalse), result);
        } else if (ts.isBinaryExpression(node)) {
            if ([ts.SyntaxKind.CommaToken, ts.SyntaxKind.EqualsToken].includes(node.operatorToken.kind)) this.copy(this.cell(node.right), result);
            else if ([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
                this.copy(this.cell(node.left), result); this.copy(this.cell(node.right), result);
            } else if (node.operatorToken.kind === ts.SyntaxKind.PlusToken)
                this.publish(result, { tag: "text-operation", operation: "add", parts: [this.cell(node.left), this.cell(node.right)] });
        } else if (ts.isTemplateExpression(node)) {
            const parts: Cell[] = [];
            const literal = (text: string): void => { const cell = this.newCell(); this.publish(cell, this.text(text)); parts.push(cell); };
            literal(node.head.text);
            for (const span of node.templateSpans) { parts.push(this.cell(span.expression)); literal(span.literal.text); }
            this.publish(result, { tag: "text-operation", operation: "template", parts });
        } else if (ts.isAwaitExpression(node)) {
            const operand = this.cell(node.expression);
            this.rule([operand], () => { for (const atom of operand.values) {
                if (atom.tag === "promise") this.copy(atom.value, result!); else this.publish(result!, atom);
            } });
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const target = unwrap(node.expression);
            const receiver = ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target) ? this.cell(target.expression) : this.empty;
            const parts = (node.arguments ?? []).map(argument => ({ cell: this.cell(ts.isSpreadElement(argument) ? argument.expression : argument), spread: ts.isSpreadElement(argument) }));
            const call: Call = { node, callee: this.cell(target), receiver, result };
            const boundValues = new Map<string, Atom>();
            const seen = new Map<Atom, Set<string>>();
            const handled = (atom: Atom, signature: string): boolean => {
                let signatures = seen.get(atom); if (!signatures) { signatures = new Set(); seen.set(atom, signatures); }
                if (signatures.has(signature)) return true; signatures.add(signature); return false;
            };
            let rule: Rule;
            rule = this.rule([call.callee, call.receiver, ...parts.map(part => part.cell)], () => {
                for (const part of parts) if (part.spread) this.watchList(rule, part.cell);
                const worklist: Array<{ target: Cell; receiver: Cell; args: readonly Cell[] | null; boundPath: Set<Atom> }> = [
                    ...this.arguments(parts).map(args => ({ target: call.callee, receiver: call.receiver, args, boundPath: new Set<Atom>() }))];
                const routed = new Map<Atom, Set<string>>();
                while (worklist.length) {
                    const invocation = worklist.pop()!; this.watch(rule, invocation.target);
                    for (const atom of invocation.target.values) {
                        const argv = invocation.args;
                        const signature = invocation.receiver.id + ":" + (argv?.map(cell => cell.id).join(",") ?? "unknown");
                        if (atom.tag === "bound") {
                            if (invocation.boundPath.has(atom)) continue;
                            const boundPath = new Set(invocation.boundPath); boundPath.add(atom);
                            worklist.push({ ...invocation, target: atom.target, args: argv && atom.prefix ? [...atom.prefix, ...argv] : null,
                                boundPath }); continue;
                        }
                        if (atom.tag === "operation" && ["call", "apply", "reflect-apply", "construct"].includes(atom.operation)) {
                            const previous = routed.get(atom) ?? new Set<string>();
                            if (previous.has(signature)) continue; previous.add(signature); routed.set(atom, previous);
                            const target = atom.operation === "reflect-apply" || atom.operation === "construct" ? argv?.[0] : invocation.receiver;
                            const listIndex = atom.operation === "reflect-apply" ? 2 : 1;
                            if (argv?.[listIndex]) this.watchList(rule, argv[listIndex]!);
                            const actual = atom.operation === "call" ? [argv?.slice(1) ?? null] : argv?.[listIndex] ? this.lists(argv[listIndex]!) : [null];
                            if (target) for (const args of actual) worklist.push({ ...invocation, target,
                                receiver: atom.operation === "call" || atom.operation === "apply" ? argv?.[0] ?? this.empty : atom.operation === "reflect-apply" ? argv?.[1] ?? this.empty : this.empty, args });
                            continue;
                        }
                        if (atom.tag !== "operation" && handled(atom, signature)) continue;
                        if (atom.tag === "intrinsic" && atom.domain === "constructor") {
                            this.invocations.push({ kind: atom.kind, args: argv });
                            for (const value of this.generated.get(atom.kind) ?? []) this.copy(value, result!);
                        } else if (atom.tag === "function") {
                            this.copy(invocation.receiver, atom.owner.receiver);
                            for (const [index, parameter] of atom.owner.node.parameters.filter(parameter => !ts.isIdentifier(parameter.name) || parameter.name.text !== "this").entries()) {
                                if (parameter.dotDotDotToken) {
                                    const rest: Cell = this.newCell();
                                    this.publish(rest, { tag: "object", owner: { fields: new Map((argv?.slice(index) ?? []).map((cell, offset) => [String(offset), cell])),
                                        getters: new Map(), shape: this.newCell(), list: argv?.slice(index).map(cell => ({ cell, spread: false })) } });
                                    this.bind(parameter.name, rest);
                                } else if (argv?.[index]) this.bind(parameter.name, argv[index]!);
                                if (parameter.initializer) this.bind(parameter.name, this.cell(parameter.initializer));
                            }
                            if (atom.owner.kind.includes("generator")) this.publish(result!, { tag: "generator", owner: atom.owner });
                            else if (atom.owner.kind === "async") this.publish(result!, { tag: "promise", value: atom.owner.returns });
                            else this.copy(atom.owner.returns, result!);
                        } else if (atom.tag === "operation") {
                            if (atom.operation === "bind") {
                                let value = boundValues.get(signature);
                                if (!value) { value = { tag: "bound", target: invocation.receiver, prefix: argv?.slice(1) ?? null }; boundValues.set(signature, value); }
                                this.publish(result!, value);
                            }
                            if (atom.operation === "realm") this.publish(result!, this.realm);
                            if (atom.operation === "eval" && argv?.[0]) {
                                this.watchText(rule, argv[0]);
                                for (const text of this.primitiveChoices(argv[0])) if (typeof text === "string")
                                    for (const value of this.evaluations.get(text) ?? []) this.copy(value, result!);
                            }
                            if (atom.operation === "prototype" && argv?.[0]) {
                                const input = argv[0]; this.watch(rule, input);
                                for (const value of input.values) {
                                    if (value.tag === "function") this.publish(result!, this.intrinsic("prototype", value.owner.kind));
                                    if (value.tag === "intrinsic") this.publish(result!, this.intrinsic(value.domain === "constructor" && value.kind !== "ordinary" ? "constructor" : "prototype", "ordinary"));
                                    if (value.tag === "generator") this.publish(result!, this.intrinsic("instance", value.owner.kind));
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    private watchList(rule: Rule, cell: Cell): void {
        const pending = [cell], visited = new Set<Cell>();
        while (pending.length) {
            const input = pending.pop()!; if (visited.has(input)) continue; visited.add(input); this.watch(rule, input);
            for (const atom of input.values) if (atom.tag === "object") {
                this.watch(rule, atom.owner.shape);
                for (const part of atom.owner.list ?? []) if (part.spread) pending.push(part.cell);
            }
        }
    }
    private watchText(rule: Rule, root: Cell): void {
        const worklist = [root], visited = new Set<Cell>();
        while (worklist.length) {
            const cell = worklist.pop()!; if (visited.has(cell)) continue; visited.add(cell); this.watch(rule, cell);
            for (const atom of cell.values) if (atom.tag === "text-operation") worklist.push(...atom.parts);
        }
    }
    private choices(root: Cell): string[] {
        return [...new Set(this.primitiveChoices(root).map(String))];
    }
    private primitiveChoices(root: Cell): Primitive[] {
        const pending = [{ cell: root, finish: false }], active = new Set<Cell>(), values = new Map<Cell, Primitive[]>();
        while (pending.length) {
            const task = pending.pop()!;
            if (values.has(task.cell)) continue;
            if (task.finish) {
                active.delete(task.cell);
                const choices = new Set<Primitive>();
                for (const atom of task.cell.values) {
                    if (atom.tag === "primitive") choices.add(atom.value);
                    if (atom.tag === "text-operation") {
                        let combinations: Primitive[][] = [[]];
                        for (const part of atom.parts) combinations = combinations.flatMap(prefix => (values.get(part) ?? []).map(value => [...prefix, value]));
                        for (const tuple of combinations) {
                            if (atom.operation === "template") choices.add(tuple.map(String).join(""));
                            else {
                                const [left, right] = tuple;
                                if (typeof left === "string" || typeof right === "string") choices.add(String(left) + String(right));
                                else if (typeof left === "bigint" && typeof right === "bigint") choices.add(left + right);
                                else if (typeof left !== "bigint" && typeof right !== "bigint") choices.add(Number(left) + Number(right));
                            }
                        }
                    }
                }
                values.set(task.cell, [...choices]);
            } else {
                if (active.has(task.cell)) return [];
                active.add(task.cell); pending.push({ ...task, finish: true });
                for (const atom of task.cell.values) if (atom.tag === "text-operation") for (const cell of atom.parts) pending.push({ cell, finish: false });
            }
        }
        return values.get(root) ?? [];
    }
    solve(): ConstructorInvocation[] {
        while (this.initializers.length || this.queue.length) {
            if (this.initializers.length) { const initializer = this.initializers.pop()!; this.initialize(initializer.node, initializer.result); }
            else { const rule = this.queue.pop()!; rule.queued = false; rule.run(); }
        }
        return this.invocations.map(invocation => ({ kind: invocation.kind, choices: invocation.args?.map(cell => this.choices(cell)) ?? null }));
    }
}

export function sourceConstructorInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): ConstructorInvocation[] {
    return new SourceValueFlow(program, entries).solve();
}
