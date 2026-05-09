import ts from "typescript";
import { CBuf, escapeCString, utf8ByteLen } from "./cbuf";
import {
    CType,
    arrayType,
    classType,
    entryType,
    functionType,
    keyKindOf,
    mapType,
    mapTsType,
    mapType_,
    setType,
    TypeBindings,
    T_BIGINT,
    T_BOOLEAN,
    T_BUFFER,
    T_HASH,
    T_NUMBER,
    T_REGEXP,
    T_STRING,
    T_SYMBOL,
    T_URL,
    T_VALUE,
    T_VOID,
    withTypeBindings,
} from "./types";
import { mangleIdent } from "./mangle";
import {
    unsupported,
    UnsupportedError,
    formatUnsupported,
} from "../diagnostics";
import type { ModuleGraph } from "../resolve";

interface EmitResult {
    c: string;
    ty: CType;
}

interface SequencedCallArg {
    value: EmitResult;
    target?: CType;
    node?: ts.Expression;
    stringify?: boolean;
    pass?: (tmp: string) => string;
}

interface TailFunctionContext {
    name: string;
    label: string;
    params: { name: string; type: CType }[];
}

type GenericCallableDeclaration = ts.FunctionDeclaration | ts.MethodDeclaration;

interface CaptureCell {
    type: CType;
    cellName: string;
}

interface ClosureCapture {
    symbol: ts.Symbol;
    type: CType;
    field: string;
}

interface ClosureEnvBinding {
    type: CType;
    ptr: string;
}

export interface EmittedProgram {
    mainC: string;
    diagnostics: string[];
}

export function emitProgram(
    graph: ModuleGraph,
    checker: ts.TypeChecker,
): EmittedProgram {
    const em = new Emitter(checker, graph);
    return em.run();
}

class Emitter {
    public diagnostics: string[] = [];
    private structDecls = new CBuf();
    /** File-scope variable declarations (one per module-level const/let). */
    private globalDecls = new CBuf();
    private protos = new CBuf();
    private defs = new CBuf();
    private closureDefs = new CBuf();
    private genericDefs = new CBuf();
    /** Per-module init bodies. Keys are module ids. */
    private modInits = new Map<string, CBuf>();
    private returnStack: CType[] = [];
    private tailFunctionStack: TailFunctionContext[] = [];
    private currentClass: string | null = null;
    private currentBaseClass: string | null = null;
    private currentModuleId = "";
    private currentSf: ts.SourceFile | null = null;
    private tempCounter = 0;
    private genericCounter = 0;
    private genericSpecializations = new Map<string, string>();
    private functionTypes = new Set<string>();
    private closureCounter = 0;
    private functionRefAdapters = new Map<string, string>();
    private accessorAdapters = new Map<string, string>();
    private capturedCellsCache = new WeakMap<ts.FunctionLikeDeclaration, Map<ts.Symbol, CaptureCell>>();
    private cellScopes: Map<ts.Symbol, CaptureCell>[] = [];
    private closureEnvScopes: Map<ts.Symbol, ClosureEnvBinding>[] = [];
    private catchStringSymbols = new Set<ts.Symbol>();

    constructor(
        private checker: ts.TypeChecker,
        private graph: ModuleGraph,
    ) {}

    private freshTemp(prefix = "_t"): string {
        return `${prefix}${this.tempCounter++}`;
    }

    private prepareType(type: CType): CType {
        switch (type.kind) {
            case "array":
            case "entry":
            case "set":
            case "weakset":
            case "weakref":
                if (type.elem) this.prepareType(type.elem);
                break;
            case "map":
            case "weakmap":
                if (type.key) this.prepareType(type.key);
                if (type.elem) this.prepareType(type.elem);
                break;
            case "function":
                for (const param of type.params ?? []) this.prepareType(param);
                if (type.ret) this.prepareType(type.ret);
                this.ensureFunctionType(type);
                break;
        }
        return type;
    }

    private ensureFunctionType(type: CType): void {
        if (type.kind !== "function" || !type.closureName || !type.ret) {
            return;
        }
        if (this.functionTypes.has(type.closureName)) return;
        this.functionTypes.add(type.closureName);
        const paramTypes = type.params ?? [];
        const fnParams = ["void*", ...paramTypes.map((p) => p.c)].join(", ");
        this.structDecls.open(`typedef struct ${type.closureName}`);
        this.structDecls.line(`${type.ret.c} (*fn)(${fnParams});`);
        this.structDecls.line("void* env;");
        this.structDecls.close(` ${type.closureName};`);
    }

    private emitLineDirective(buf: CBuf, node: ts.Node): void {
        const sf = node.getSourceFile();
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        buf.lineRaw(`#line ${line + 1} "${escapeCString(sf.fileName)}"`);
    }

    run(): EmittedProgram {
        // Emit each module in topological order (deps first). The order doesn't
        // affect correctness of the generated .c file (all functions are
        // forward-declared), but we use it to seed the mod_init call order.
        for (const modId of this.graph.topoOrder) {
            const info = this.graph.modules.get(modId);
            if (!info) continue;
            this.emitModule(info.sf, modId);
        }

        if (this.diagnostics.length > 0) {
            return { mainC: "", diagnostics: this.diagnostics };
        }

        const out = new CBuf();
        out.line(
            "/* Generated by tsc2c — multi-module build. Entry: " +
            this.graph.entryModuleId +
            " */",
        );
        out.line('#include "tsc_runtime.h"');
        out.line();
        if (this.structDecls.toString().length > 0) {
            out.write(this.structDecls.toString());
            out.line();
        }
        if (this.globalDecls.toString().length > 0) {
            out.write(this.globalDecls.toString());
            out.line();
        }
        // Forward declarations for mod_inits and user functions.
        for (const modId of this.graph.topoOrder) {
            out.line(`static void mod_init_${modId}(void);`);
        }
        out.line();
        if (this.protos.toString().length > 0) {
            out.write(this.protos.toString());
            out.line();
        }
        if (this.defs.toString().length > 0) {
            out.write(this.defs.toString());
            out.line();
        }
        if (this.closureDefs.toString().length > 0) {
            out.write(this.closureDefs.toString());
            out.line();
        }
        if (this.genericDefs.toString().length > 0) {
            out.write(this.genericDefs.toString());
            out.line();
        }
        // Module init function bodies.
        for (const modId of this.graph.topoOrder) {
            const body = this.modInits.get(modId);
            if (!body) continue;
            out.line(`static void mod_init_${modId}(void) {`);
            out.write(body.toString());
            out.line("}");
            out.line();
        }
        // main(): bootstrap, then call mod_inits in topo order.
        out.line("int main(int argc, char** argv) {");
        out.line("    tsc_bootstrap(argc, argv);");
        for (const modId of this.graph.topoOrder) {
            out.line(`    mod_init_${modId}();`);
        }
        out.line("    return 0;");
        out.line("}");
        return { mainC: out.toString(), diagnostics: this.diagnostics };
    }

    private emitModule(sf: ts.SourceFile, modId: string): void {
        this.currentModuleId = modId;
        this.currentSf = sf;
        const initBuf = new CBuf();
        initBuf.indent = 1;
        this.modInits.set(modId, initBuf);

        try {
            const statements = this.flattenModuleStatements(sf.statements);
            // Pass A: struct forward-decls + typedefs for classes & interfaces.
            for (const inner of statements) {
                if (inner && ts.isClassDeclaration(inner) && inner.name) {
                    this.structDecls.line(
                        `typedef struct ${inner.name.text}_t ${inner.name.text}_t;`,
                    );
                }
                if (inner && ts.isInterfaceDeclaration(inner) && inner.name) {
                    this.structDecls.line(
                        `typedef struct ${inner.name.text}_t ${inner.name.text}_t;`,
                    );
                }
            }
            // Pass B: struct bodies.
            for (const inner of statements) {
                if (inner && ts.isClassDeclaration(inner)) this.emitClassStruct(inner);
                if (inner && ts.isInterfaceDeclaration(inner))
                    this.emitInterfaceStruct(inner);
            }
            // Pass C: function + class-method + lifted-arrow prototypes.
            for (const inner of statements) {
                if (
                    inner &&
                    ts.isFunctionDeclaration(inner) &&
                    inner.name &&
                    !this.isGenericFunction(inner)
                ) {
                    this.emitFunctionPrototype(inner);
                }
                if (inner && ts.isClassDeclaration(inner)) this.emitClassPrototypes(inner);
                if (inner) {
                    const lift = this.getLiftableArrow(inner);
                    if (lift) this.emitLiftedArrowPrototype(lift);
                }
            }
            // Pass D: function + class-method + lifted-arrow bodies.
            for (const inner of statements) {
                if (
                    inner &&
                    ts.isFunctionDeclaration(inner) &&
                    inner.name &&
                    inner.body &&
                    !this.isGenericFunction(inner)
                ) {
                    this.emitFunctionBody(inner);
                }
                if (inner && ts.isClassDeclaration(inner)) this.emitClassBodies(inner);
                if (inner) {
                    const lift = this.getLiftableArrow(inner);
                    if (lift) this.emitLiftedArrowBody(lift);
                }
            }
            // Pass E: top-level statements. VariableStatements are split into
            // file-scope declarations + in-mod_init assignments so that other
            // top-level functions (including lifted arrows) can reference them.
            for (const inner of statements) {
                if (!inner) continue;
                if (ts.isFunctionDeclaration(inner)) continue;
                if (ts.isClassDeclaration(inner)) continue;
                if (ts.isInterfaceDeclaration(inner)) continue;
                if (ts.isTypeAliasDeclaration(inner)) continue;
                if (ts.isEnumDeclaration(inner)) continue;
                if (ts.isImportDeclaration(inner)) continue;
                if (ts.isExportDeclaration(inner)) continue; // re-exports - metadata only
                if (ts.isImportEqualsDeclaration(inner)) continue;
                if (this.getLiftableArrow(inner)) continue; // lifted to static fn
                if (ts.isVariableStatement(inner)) {
                    this.emitTopLevelVarStmt(initBuf, inner);
                    continue;
                }
                this.emitStmt(initBuf, inner);
            }
        } catch (e) {
            if (e instanceof UnsupportedError) {
                this.diagnostics.push(formatUnsupported(e, sf));
                return;
            }
            throw e;
        }
    }

    /**
     * Unwrap `export function x() {}` / `export class X {}` / `export const x = ...`
     * to the inner declaration. Returns null for plain export/import passthrough.
     */
    private unwrapExportDecl(stmt: ts.Statement): ts.Statement | null {
        // ExportAssignment: `export default expr`
        if (ts.isExportAssignment(stmt)) return null;
        return stmt;
    }

    private flattenModuleStatements(
        statements: ts.NodeArray<ts.Statement> | readonly ts.Statement[],
    ): ts.Statement[] {
        const out: ts.Statement[] = [];
        const visit = (stmt: ts.Statement): void => {
            const inner = this.unwrapExportDecl(stmt);
            if (!inner) return;
            if (ts.isModuleDeclaration(inner)) {
                this.flattenNamespaceBody(inner, visit);
                return;
            }
            out.push(inner);
        };
        for (const stmt of statements) visit(stmt);
        return out;
    }

    private flattenNamespaceBody(
        md: ts.ModuleDeclaration,
        visit: (stmt: ts.Statement) => void,
    ): void {
        if (!ts.isIdentifier(md.name)) unsupported(md.name, "namespace name must be an identifier");
        if (!md.body) return;
        if (ts.isModuleBlock(md.body)) {
            for (const stmt of md.body.statements) visit(stmt);
            return;
        }
        if (ts.isModuleDeclaration(md.body)) {
            this.flattenNamespaceBody(md.body, visit);
            return;
        }
        unsupported(md.body, `namespace body kind ${ts.SyntaxKind[md.body.kind]}`);
    }

    private declarationNamespaceParts(node: ts.Node): string[] {
        const parts: string[] = [];
        for (let cur = node.parent; cur; cur = cur.parent) {
            if (ts.isModuleDeclaration(cur) && ts.isIdentifier(cur.name)) {
                parts.unshift(cur.name.text);
            }
        }
        return parts;
    }

    private isNamespaceTopLevelDeclaration(node: ts.Node): boolean {
        for (let cur = node.parent; cur; cur = cur.parent) {
            if (ts.isModuleBlock(cur) && ts.isModuleDeclaration(cur.parent)) return true;
            if (
                ts.isFunctionLike(cur) ||
                ts.isClassDeclaration(cur) ||
                ts.isInterfaceDeclaration(cur)
            ) {
                return false;
            }
        }
        return false;
    }

    private declaredName(name: ts.Identifier): string {
        const parts = [...this.declarationNamespaceParts(name), name.text];
        return mangleIdent(parts.join("_"));
    }

    private identifierName(id: ts.Identifier): string {
        const sym = this.symbolForIdentifier(id);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (decl && this.isNamespaceTopLevelDeclaration(decl)) {
            const parts = [...this.declarationNamespaceParts(decl), id.text];
            return mangleIdent(parts.join("_"));
        }
        return mangleIdent(id.text);
    }

    private namespaceMemberName(id: ts.Identifier): string | null {
        const sym = this.symbolForIdentifier(id);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (decl && this.isNamespaceTopLevelDeclaration(decl)) {
            const parts = [...this.declarationNamespaceParts(decl), id.text];
            return mangleIdent(parts.join("_"));
        }
        return null;
    }

    private symbolForIdentifier(id: ts.Identifier): ts.Symbol | undefined {
        const sym = this.checker.getSymbolAtLocation(id);
        if (sym && (sym.flags & ts.SymbolFlags.Alias)) {
            try {
                return this.checker.getAliasedSymbol(sym);
            } catch {
                return sym;
            }
        }
        return sym;
    }

    private symbolForBindingName(name: ts.BindingName): ts.Symbol | undefined {
        return ts.isIdentifier(name) ? this.checker.getSymbolAtLocation(name) : undefined;
    }

    private captureCellForSymbol(sym: ts.Symbol | undefined): CaptureCell | null {
        if (!sym) return null;
        for (let i = this.cellScopes.length - 1; i >= 0; i--) {
            const found = this.cellScopes[i]!.get(sym);
            if (found) return found;
        }
        return null;
    }

    private currentFunctionCellForSymbol(sym: ts.Symbol | undefined): CaptureCell | null {
        if (!sym || this.cellScopes.length === 0) return null;
        return this.cellScopes[this.cellScopes.length - 1]!.get(sym) ?? null;
    }

    private closureEnvBindingForSymbol(sym: ts.Symbol | undefined): ClosureEnvBinding | null {
        if (!sym) return null;
        for (let i = this.closureEnvScopes.length - 1; i >= 0; i--) {
            const found = this.closureEnvScopes[i]!.get(sym);
            if (found) return found;
        }
        return null;
    }

    private capturePtrForSymbol(sym: ts.Symbol): string | null {
        const env = this.closureEnvBindingForSymbol(sym);
        if (env) return env.ptr;
        const cell = this.captureCellForSymbol(sym);
        if (cell) return cell.cellName;
        return null;
    }

    private identifierRead(id: ts.Identifier): string {
        const sym = this.symbolForIdentifier(id);
        const env = this.closureEnvBindingForSymbol(sym);
        if (env) return `(*${env.ptr})`;
        const cell = this.captureCellForSymbol(sym);
        if (cell) return `(*${cell.cellName})`;
        return this.identifierName(id);
    }

    private identifierDeclaredType(id: ts.Identifier): CType | null {
        const sym = this.symbolForIdentifier(id);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (!decl) return null;
        try {
            return this.prepareType(
                mapTsType(
                    decl,
                    this.checker.getTypeOfSymbolAtLocation(sym!, decl),
                    this.checker,
                ),
            );
        } catch {
            return null;
        }
    }

    private identifierHasDynamicAnnotation(id: ts.Identifier): boolean {
        const sym = this.symbolForIdentifier(id);
        let decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (decl && ts.isIdentifier(decl) && ts.isVariableDeclaration(decl.parent)) {
            decl = decl.parent;
        }
        if (!decl || !ts.isVariableDeclaration(decl) || !decl.type) return false;
        return (
            decl.type.kind === ts.SyntaxKind.AnyKeyword ||
            decl.type.kind === ts.SyntaxKind.UnknownKeyword
        );
    }

    private unboxDynamicValue(cExpr: string, target: CType): string {
        switch (target.kind) {
            case "number":
                return `tsc_value_as_num(${cExpr})`;
            case "boolean":
                return `tsc_value_as_bool(${cExpr})`;
            case "string":
                return `tsc_value_as_string(${cExpr})`;
            case "array":
                return `tsc_value_as_array(${cExpr})`;
            case "value":
                return cExpr;
            default:
                return cExpr;
        }
    }

    private capturedCellsFor(fn: ts.FunctionLikeDeclaration): Map<ts.Symbol, CaptureCell> {
        const cached = this.capturedCellsCache.get(fn);
        if (cached) return cached;
        const captures = new Map<ts.Symbol, CaptureCell>();
        const body = fn.body;
        if (!body) {
            this.capturedCellsCache.set(fn, captures);
            return captures;
        }

        const visit = (node: ts.Node): void => {
            if (
                node !== fn &&
                (ts.isArrowFunction(node) || ts.isFunctionExpression(node))
            ) {
                for (const cap of this.collectClosureCaptures(node)) {
                    captures.set(cap.symbol, {
                        type: cap.type,
                        cellName: this.cellNameForCapture(cap.symbol, cap.field),
                    });
                }
                return;
            }
            if (node !== fn && ts.isFunctionDeclaration(node)) return;
            ts.forEachChild(node, visit);
        };
        visit(body);
        this.capturedCellsCache.set(fn, captures);
        return captures;
    }

    private collectClosureCaptures(
        fn: ts.ArrowFunction | ts.FunctionExpression,
    ): ClosureCapture[] {
        const captures = new Map<ts.Symbol, ClosureCapture>();
        const visit = (node: ts.Node): void => {
            if (ts.isIdentifier(node) && !this.isNonValueIdentifier(node)) {
                const sym = this.symbolForIdentifier(node);
                const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
                if (
                    sym &&
                    decl &&
                    !this.isNodeWithin(decl, fn) &&
                    !this.isTopLevelValueDeclaration(decl) &&
                    this.isCapturableValueDeclaration(decl)
                ) {
                    const type = this.prepareType(
                        mapTsType(
                            decl,
                            this.checker.getTypeOfSymbolAtLocation(sym, decl),
                            this.checker,
                        ),
                    );
                    const field = `${mangleIdent(node.text)}_${captures.size}`;
                    captures.set(sym, { symbol: sym, type, field });
                }
            }
            ts.forEachChild(node, visit);
        };
        if (fn.body) visit(fn.body);
        return [...captures.values()];
    }

    private cellNameForCapture(sym: ts.Symbol, fallback: string): string {
        const name = sym.getName();
        const clean = name && name !== "__computed" ? mangleIdent(name) : fallback;
        return `${clean}__cell`;
    }

    private isCapturableValueDeclaration(decl: ts.Declaration): boolean {
        return (
            ts.isVariableDeclaration(decl) ||
            ts.isParameter(decl) ||
            ts.isBindingElement(decl)
        );
    }

    private isTopLevelValueDeclaration(decl: ts.Declaration): boolean {
        if (this.isNamespaceTopLevelDeclaration(decl)) return true;
        for (let cur: ts.Node | undefined = decl.parent; cur; cur = cur.parent) {
            if (ts.isSourceFile(cur)) return true;
            if (ts.isFunctionLike(cur)) return false;
            if (ts.isClassDeclaration(cur)) return false;
        }
        return false;
    }

    private isNodeWithin(node: ts.Node, ancestor: ts.Node): boolean {
        for (let cur: ts.Node | undefined = node; cur; cur = cur.parent) {
            if (cur === ancestor) return true;
        }
        return false;
    }

    private isNonValueIdentifier(id: ts.Identifier): boolean {
        const p = id.parent;
        if (!p) return false;
        if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
        if (ts.isPropertyAssignment(p) && p.name === id && !ts.isShorthandPropertyAssignment(p)) return true;
        if (ts.isMethodDeclaration(p) && p.name === id) return true;
        if (ts.isPropertyDeclaration(p) && p.name === id) return true;
        if (ts.isPropertySignature(p) && p.name === id) return true;
        if (ts.isMethodSignature(p) && p.name === id) return true;
        if (ts.isTypeReferenceNode(p)) return true;
        if (ts.isInterfaceDeclaration(p) && p.name === id) return true;
        if (ts.isClassDeclaration(p) && p.name === id) return true;
        if (ts.isFunctionDeclaration(p) && p.name === id) return true;
        if (ts.isParameter(p) && p.name === id) return true;
        if (ts.isVariableDeclaration(p) && p.name === id) return true;
        return false;
    }

    // ---------------- class declarations ----------------

    private emitInterfaceStruct(id: ts.InterfaceDeclaration): void {
        if (!id.name) return;
        // Skip if this interface is re-declared/merged — only emit first.
        if (id.heritageClauses && id.heritageClauses.length > 0) {
            unsupported(id, "interface inheritance (Phase 3)");
        }
        this.structDecls.open(`struct ${id.name.text}_t`);
        for (const m of id.members) {
            if (ts.isPropertySignature(m) && m.name && ts.isIdentifier(m.name)) {
                if (m.questionToken) {
                    unsupported(m, "optional interface fields (Phase 3)");
                }
                const ft = mapType(m, this.checker);
                this.structDecls.line(`${ft.c} ${mangleIdent(m.name.text)};`);
            } else {
                unsupported(m, `interface member kind ${ts.SyntaxKind[m.kind]}`);
            }
        }
        this.structDecls.close(";");
        this.structDecls.line();
    }

    private emitClassStruct(cd: ts.ClassDeclaration): void {
        if (!cd.name) unsupported(cd, "anonymous class declaration");
        const name = cd.name.text;
        const baseFields = this.collectInheritedFields(cd);
        this.structDecls.open(`struct ${name}_t`);
        this.structDecls.line(`const char* __tsc_type;`);
        // Inherited fields first (allows *Base casts to work via identical prefix).
        for (const { name: fn, type: ft } of baseFields) {
            this.structDecls.line(`${ft.c} ${mangleIdent(fn)};`);
        }
        for (const m of cd.members) {
            if (ts.isPropertyDeclaration(m)) {
                if (!ts.isIdentifier(m.name))
                    unsupported(m, "computed property names in class");
                if (isStatic(m)) continue; // emitted as free var, not struct field
                const fieldType = mapType(m, this.checker);
                this.structDecls.line(
                    `${fieldType.c} ${mangleIdent(m.name.text)};`,
                );
            }
        }
        this.structDecls.close(";");
        this.structDecls.line();
    }

    private baseClassName(cd: ts.ClassDeclaration): string | null {
        const base = this.baseClassDecl(cd);
        return base?.name?.text ?? null;
    }

    private baseClassDecl(cd: ts.ClassDeclaration): ts.ClassDeclaration | null {
        if (!cd.heritageClauses) return null;
        for (const h of cd.heritageClauses) {
            if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
            const t = h.types[0];
            if (!t) continue;
            const sym = this.checker.getSymbolAtLocation(t.expression);
            const base = sym?.getDeclarations()?.find(ts.isClassDeclaration);
            if (base && base.name) return base;
        }
        return null;
    }

    private classTypeChain(cd: ts.ClassDeclaration): string {
        const names: string[] = [];
        const visit = (cur: ts.ClassDeclaration): void => {
            const base = this.baseClassDecl(cur);
            if (base) visit(base);
            if (cur.name) names.push(cur.name.text);
        };
        visit(cd);
        return `|${names.join("|")}|`;
    }

    private collectInheritedFields(cd: ts.ClassDeclaration): {
        name: string;
        type: CType;
    }[] {
        const fields: { name: string; type: CType }[] = [];
        if (!cd.heritageClauses) return fields;
        for (const h of cd.heritageClauses) {
            if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
            for (const t of h.types) {
                // Resolve base class declaration via checker.
                const sym = this.checker.getSymbolAtLocation(t.expression);
                if (!sym) continue;
                const base = sym.getDeclarations()?.find(ts.isClassDeclaration);
                if (!base) continue;
                // Recurse for multi-level inheritance.
                for (const f of this.collectInheritedFields(base)) fields.push(f);
                for (const m of base.members) {
                    if (
                        ts.isPropertyDeclaration(m) &&
                        m.name &&
                        ts.isIdentifier(m.name) &&
                        !isStatic(m)
                    ) {
                        fields.push({
                            name: m.name.text,
                            type: mapType(m, this.checker),
                        });
                    }
                }
            }
        }
        return fields;
    }

    private emitClassPrototypes(cd: ts.ClassDeclaration): void {
        if (!cd.name) return;
        const name = cd.name.text;
        const ctor = cd.members.find((m) => ts.isConstructorDeclaration(m)) as
            | ts.ConstructorDeclaration
            | undefined;
        const ctorParams = this.collectParams(ctor?.parameters ?? []);
        const initParams = [`${name}_t* self`, ...ctorParams];
        this.protos.line(
            `void ${name}_init(${initParams.join(", ")});`,
        );
        this.protos.line(
            `${name}_t* ${name}_new(${ctorParams.length ? ctorParams.join(", ") : "void"});`,
        );
        // Static field externs
        for (const m of cd.members) {
            if (ts.isPropertyDeclaration(m) && isStatic(m) && ts.isIdentifier(m.name)) {
                const ft = mapType(m, this.checker);
                this.protos.line(`extern ${ft.c} ${name}_${mangleIdent(m.name.text)};`);
            }
        }
        for (const m of cd.members) {
            if (ts.isMethodDeclaration(m)) {
                if (this.isGenericMethod(m)) continue;
                const methodName = this.classMethodCName(m.name);
                if (!methodName) unsupported(m, "computed method names");
                const sig = this.checker.getSignatureFromDeclaration(m);
                if (!sig) unsupported(m, "could not resolve method signature");
                const ret = mapTsType(m, sig.getReturnType(), this.checker);
                const params = isStatic(m)
                    ? this.collectParams(m.parameters)
                    : [`${name}_t* self`, ...this.collectParams(m.parameters)];
                this.protos.line(
                    `${ret.c} ${name}_${methodName}(${params.length ? params.join(", ") : "void"});`,
                );
            }
        }
    }

    private emitClassBodies(cd: ts.ClassDeclaration): void {
        if (!cd.name) return;
        const name = cd.name.text;
        const baseName = this.baseClassName(cd);
        const ctor = cd.members.find((m) => ts.isConstructorDeclaration(m)) as
            | ts.ConstructorDeclaration
            | undefined;
        const ctorParams = this.collectParams(ctor?.parameters ?? []);

        // Static field storage (once per class, at file scope).
        for (const m of cd.members) {
            if (ts.isPropertyDeclaration(m) && isStatic(m) && ts.isIdentifier(m.name)) {
                const ft = mapType(m, this.checker);
                if (m.initializer) {
                    const init = this.emitExpr(m.initializer);
                    this.defs.line(
                        `${ft.c} ${name}_${mangleIdent(m.name.text)} = ${this.coerce(init, ft, m.initializer)};`,
                    );
                } else {
                    this.defs.line(`${ft.c} ${name}_${mangleIdent(m.name.text)};`);
                }
            }
        }
        this.defs.line();

        // ClassName_init: runs ctor body + initializers on a pre-allocated self.
        const initParams = [`${name}_t* self`, ...ctorParams];
        this.defs.open(`void ${name}_init(${initParams.join(", ")})`);
        const typeChain = this.classTypeChain(cd);
        this.defs.line(`self->__tsc_type = "${escapeCString(typeChain)}";`);
        // Instance field initializers (only emitted if base hasn't run them; for
        // subclasses, super(...) call triggers base's own init which would run
        // base's field initializers — here we emit own-fields.).
        for (const m of cd.members) {
            if (
                ts.isPropertyDeclaration(m) &&
                m.initializer &&
                ts.isIdentifier(m.name) &&
                !isStatic(m)
            ) {
                const init = this.emitExpr(m.initializer);
                const pt = mapType(m, this.checker);
                const coerced = this.coerce(init, pt, m.initializer);
                this.defs.line(
                    `self->${mangleIdent(m.name.text)} = ${coerced};`,
                );
            }
        }
        if (ctor && ctor.body) {
            this.currentClass = name;
            this.currentBaseClass = baseName;
            this.returnStack.push(T_VOID);
            try {
                for (const s of ctor.body.statements) this.emitStmt(this.defs, s);
            } finally {
                this.returnStack.pop();
                this.currentClass = null;
                this.currentBaseClass = null;
            }
        } else if (baseName) {
            // Default implicit super() when no ctor and base exists.
            this.defs.line(`${baseName}_init((${baseName}_t*)self);`);
        }
        this.defs.line(`self->__tsc_type = "${escapeCString(typeChain)}";`);
        this.defs.close();
        this.defs.line();

        // ClassName_new: allocate + call init.
        this.defs.open(
            `${name}_t* ${name}_new(${ctorParams.length ? ctorParams.join(", ") : "void"})`,
        );
        this.defs.line(
            `${name}_t* self = (${name}_t*)TSC_GC_MALLOC(sizeof(${name}_t));`,
        );
        const initArgs = ["self"];
        for (const p of ctor?.parameters ?? []) {
            if (ts.isIdentifier(p.name)) initArgs.push(mangleIdent(p.name.text));
        }
        this.defs.line(`${name}_init(${initArgs.join(", ")});`);
        this.defs.line("return self;");
        this.defs.close();
        this.defs.line();

        for (const m of cd.members) {
            if (ts.isMethodDeclaration(m) && m.body) {
                if (this.isGenericMethod(m)) continue;
                const methodName = this.classMethodCName(m.name);
                if (!methodName) unsupported(m, "computed method names");
                const sig = this.checker.getSignatureFromDeclaration(m);
                if (!sig) unsupported(m, "could not resolve method signature");
                const ret = mapTsType(m, sig.getReturnType(), this.checker);
                const params = isStatic(m)
                    ? this.collectParams(m.parameters)
                    : [`${name}_t* self`, ...this.collectParams(m.parameters)];
                this.defs.open(
                    `${ret.c} ${name}_${methodName}(${params.length ? params.join(", ") : "void"})`,
                );
                if (!isStatic(m)) this.currentClass = name;
                this.returnStack.push(ret);
                try {
                    for (const s of m.body.statements) this.emitStmt(this.defs, s);
                } finally {
                    this.returnStack.pop();
                    this.currentClass = null;
                }
                this.defs.close();
                this.defs.line();
            }
        }
    }

    private collectParams(ps: readonly ts.ParameterDeclaration[]): string[] {
        return this.collectParamInfos(ps).map((p) => `${p.type.c} ${p.name}`);
    }

    private collectParamInfos(ps: readonly ts.ParameterDeclaration[]): {
        name: string;
        type: CType;
    }[] {
        const infos: { name: string; type: CType }[] = [];
        for (const p of ps) {
            if (p.questionToken) unsupported(p, "optional parameters");
            if (p.initializer) unsupported(p, "default parameters");
            if (!ts.isIdentifier(p.name)) {
                unsupported(p, "parameter destructuring");
            }
            const pt = this.prepareType(mapType(p, this.checker));
            infos.push({ name: mangleIdent(p.name.text), type: pt });
        }
        return infos;
    }

    private emitCapturedParameterCells(
        buf: CBuf,
        ps: readonly ts.ParameterDeclaration[],
        cells: Map<ts.Symbol, CaptureCell>,
    ): void {
        for (const p of ps) {
            if (!ts.isIdentifier(p.name)) continue;
            const sym = this.symbolForIdentifier(p.name);
            const cell = sym ? cells.get(sym) : undefined;
            if (!cell) continue;
            buf.line(`${cell.type.c}* ${cell.cellName} = (${cell.type.c}*)TSC_GC_MALLOC(sizeof(${cell.type.c}));`);
            buf.line(`*${cell.cellName} = ${mangleIdent(p.name.text)};`);
        }
    }

    // ---------------- function declarations ----------------

    private isGenericFunction(fd: ts.FunctionDeclaration): boolean {
        return !!fd.typeParameters?.length;
    }

    private isGenericMethod(md: ts.MethodDeclaration): boolean {
        return !!md.typeParameters?.length;
    }

    private emitFunctionPrototype(fd: ts.FunctionDeclaration): void {
        const { signature } = this.fnSignature(fd);
        this.protos.line(signature + ";");
    }

    private emitFunctionBody(fd: ts.FunctionDeclaration): void {
        const { signature, returnType } = this.fnSignature(fd);
        const capturedCells = this.capturedCellsFor(fd);
        this.defs.open(signature);
        this.returnStack.push(returnType);
        this.cellScopes.push(capturedCells);
        const tailCtx = fd.name && capturedCells.size === 0
            ? {
                name: this.declaredName(fd.name),
                label: this.freshTemp("_tail"),
                params: this.collectParamInfos(fd.parameters),
            }
            : null;
        if (tailCtx) {
            this.tailFunctionStack.push(tailCtx);
            this.defs.line(`${tailCtx.label}: ;`);
        }
        this.emitCapturedParameterCells(this.defs, fd.parameters, capturedCells);
        try {
            if (!fd.body) unsupported(fd, "function without body");
            for (const s of fd.body.statements) {
                this.emitStmt(this.defs, s);
            }
        } finally {
            if (tailCtx) this.tailFunctionStack.pop();
            this.cellScopes.pop();
            this.returnStack.pop();
        }
        this.defs.close();
        this.defs.line();
    }

    private fnSignature(fd: ts.FunctionDeclaration): {
        signature: string;
        returnType: CType;
    } {
        if (!fd.name) unsupported(fd, "anonymous top-level function");
        const name = this.declaredName(fd.name);
        const sig = this.checker.getSignatureFromDeclaration(fd);
        if (!sig) unsupported(fd, "could not resolve function signature");
        const retTsType = sig.getReturnType();
        const retCt = this.prepareType(mapTsType(fd, retTsType, this.checker));
        const params = this.collectParams(fd.parameters);
        const signature =
            `${retCt.c} ${name}(` +
            (params.length ? params.join(", ") : "void") +
            `)`;
        return { signature, returnType: retCt };
    }

    // ---------------- statements ----------------

    private emitStmt(buf: CBuf, stmt: ts.Statement): void {
        this.emitLineDirective(buf, stmt);
        if (ts.isExpressionStatement(stmt)) return this.emitExprStmt(buf, stmt);
        if (ts.isVariableStatement(stmt)) return this.emitVarStmt(buf, stmt);
        if (ts.isIfStatement(stmt)) return this.emitIf(buf, stmt);
        if (ts.isWhileStatement(stmt)) return this.emitWhile(buf, stmt);
        if (ts.isDoStatement(stmt)) return this.emitDoWhile(buf, stmt);
        if (ts.isForStatement(stmt)) return this.emitFor(buf, stmt);
        if (ts.isForOfStatement(stmt)) return this.emitForOf(buf, stmt);
        if (ts.isBlock(stmt)) return this.emitBlock(buf, stmt);
        if (ts.isReturnStatement(stmt)) return this.emitReturn(buf, stmt);
        if (ts.isThrowStatement(stmt)) return this.emitThrow(buf, stmt);
        if (ts.isTryStatement(stmt)) return this.emitTry(buf, stmt);
        if (ts.isSwitchStatement(stmt)) return this.emitSwitch(buf, stmt);
        if (stmt.kind === ts.SyntaxKind.BreakStatement) {
            buf.line("break;");
            return;
        }
        if (stmt.kind === ts.SyntaxKind.ContinueStatement) {
            buf.line("continue;");
            return;
        }
        if (stmt.kind === ts.SyntaxKind.EmptyStatement) return;
        unsupported(stmt, `statement kind ${ts.SyntaxKind[stmt.kind]}`);
    }

    private emitExprStmt(buf: CBuf, es: ts.ExpressionStatement): void {
        const r = this.emitExpr(es.expression);
        buf.line(r.c + ";");
    }

    /**
     * Top-level variable statements: split into file-scope decl + mod_init
     * assignment. Enables top-level functions and lifted arrows to read/write
     * module-level const/let as ordinary C globals.
     */
    private emitTopLevelVarStmt(
        initBuf: CBuf,
        vs: ts.VariableStatement,
    ): void {
        for (const d of vs.declarationList.declarations) {
            if (!ts.isIdentifier(d.name)) {
                unsupported(d, "destructuring at module scope");
            }
            const name = this.declaredName(d.name);
            const ct = this.prepareType(mapType(d, this.checker));
            this.globalDecls.line(`static ${ct.c} ${name};`);
            if (d.initializer) {
                const r = this.emitExpr(d.initializer);
                const coerced = this.coerce(r, ct, d.initializer);
                initBuf.line(`${name} = ${coerced};`);
            }
        }
    }

    private emitVarStmt(buf: CBuf, vs: ts.VariableStatement): void {
        const isConst =
            (vs.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const d of vs.declarationList.declarations) {
            if (!ts.isIdentifier(d.name)) {
                unsupported(d, "destructuring declarations");
            }
            const name = mangleIdent(d.name.text);
            const cell = this.currentFunctionCellForSymbol(this.symbolForIdentifier(d.name));
            let ct: CType;
            let init = "";
            if (d.initializer) {
                const r = this.emitExpr(d.initializer);
                ct = this.prepareType(d.type ? mapType(d, this.checker) : r.ty);
                const coerced = this.coerce(r, ct, d.initializer);
                init = " = " + coerced;
            } else {
                ct = this.prepareType(mapType(d, this.checker));
            }
            if (cell) {
                buf.line(`${ct.c}* ${cell.cellName} = (${ct.c}*)TSC_GC_MALLOC(sizeof(${ct.c}));`);
                buf.line(`*${cell.cellName} = ${init ? init.slice(3) : this.zeroValue(ct)};`);
                continue;
            }
            const qual = isConst ? " const" : "";
            buf.line(`${ct.c}${qual} ${name}${init};`);
        }
    }

    private emitIf(buf: CBuf, is: ts.IfStatement): void {
        const cond = this.emitBoolExpr(is.expression);
        buf.open(`if (${cond})`);
        this.emitStmtInBlock(buf, is.thenStatement);
        buf.close();
        if (is.elseStatement) {
            if (ts.isIfStatement(is.elseStatement)) {
                this.emitElseIf(buf, is.elseStatement);
            } else {
                buf.open("else");
                this.emitStmtInBlock(buf, is.elseStatement);
                buf.close();
            }
        }
    }

    private emitElseIf(buf: CBuf, is: ts.IfStatement): void {
        const cond = this.emitBoolExpr(is.expression);
        buf.open(`else if (${cond})`);
        this.emitStmtInBlock(buf, is.thenStatement);
        buf.close();
        if (is.elseStatement) {
            if (ts.isIfStatement(is.elseStatement)) {
                this.emitElseIf(buf, is.elseStatement);
            } else {
                buf.open("else");
                this.emitStmtInBlock(buf, is.elseStatement);
                buf.close();
            }
        }
    }

    private emitStmtInBlock(buf: CBuf, s: ts.Statement): void {
        if (ts.isBlock(s)) {
            for (const child of s.statements) this.emitStmt(buf, child);
        } else {
            this.emitStmt(buf, s);
        }
    }

    private emitWhile(buf: CBuf, ws: ts.WhileStatement): void {
        buf.open(`while (${this.emitBoolExpr(ws.expression)})`);
        this.emitStmtInBlock(buf, ws.statement);
        buf.close();
    }

    private emitDoWhile(buf: CBuf, ds: ts.DoStatement): void {
        buf.open("do");
        this.emitStmtInBlock(buf, ds.statement);
        buf.close(` while (${this.emitBoolExpr(ds.expression)});`);
    }

    private emitFor(buf: CBuf, fs: ts.ForStatement): void {
        buf.open("");
        if (fs.initializer) {
            if (ts.isVariableDeclarationList(fs.initializer)) {
                const isConst =
                    (fs.initializer.flags & ts.NodeFlags.Const) !== 0;
                for (const d of fs.initializer.declarations) {
                    if (!ts.isIdentifier(d.name))
                        unsupported(d, "destructuring in for-init");
                    const name = mangleIdent(d.name.text);
                    const cell = this.currentFunctionCellForSymbol(this.symbolForIdentifier(d.name));
                    let ct: CType;
                    let init = "";
                    if (d.initializer) {
                        const r = this.emitExpr(d.initializer);
                        ct = this.prepareType(d.type ? mapType(d, this.checker) : r.ty);
                        init = " = " + this.coerce(r, ct, d.initializer);
                    } else {
                        ct = this.prepareType(mapType(d, this.checker));
                    }
                    if (cell) {
                        buf.line(`${ct.c}* ${cell.cellName} = (${ct.c}*)TSC_GC_MALLOC(sizeof(${ct.c}));`);
                        buf.line(`*${cell.cellName} = ${init ? init.slice(3) : this.zeroValue(ct)};`);
                        continue;
                    }
                    const qual = isConst ? " const" : "";
                    buf.line(`${ct.c}${qual} ${name}${init};`);
                }
            } else {
                const r = this.emitExpr(fs.initializer);
                buf.line(r.c + ";");
            }
        }
        const cond = fs.condition ? this.emitBoolExpr(fs.condition) : "1";
        const upd = fs.incrementor ? this.emitExpr(fs.incrementor).c : "";
        buf.open(`while (${cond})`);
        this.emitStmtInBlock(buf, fs.statement);
        if (upd) buf.line(`(void)(${upd});`);
        buf.close();
        buf.close();
    }

    private emitForOf(buf: CBuf, fos: ts.ForOfStatement): void {
        const iter = this.emitExpr(fos.expression);
        if (iter.ty.kind === "map") {
            this.emitMapForOf(buf, fos, iter);
            return;
        }

        let arrayExpr = iter.c;
        let elemType = iter.ty.elem;
        if (iter.ty.kind === "set") {
            arrayExpr = `tsc_set_values(${iter.c})`;
        } else if (iter.ty.kind === "string") {
            arrayExpr = `tsc_str_chars(${iter.c})`;
            elemType = T_STRING;
        } else if (iter.ty.kind === "class") {
            if (this.emitCustomIteratorForOf(buf, fos, iter)) return;
            const custom = this.emitCustomIterableArray(fos.expression, iter);
            if (!custom) {
                unsupported(
                    fos.expression,
                    `for-of over ${iter.ty.c} (class needs [Symbol.iterator]() returning a typed array)`,
                );
            }
            arrayExpr = custom.c;
            elemType = custom.ty.elem;
        } else if (iter.ty.kind !== "array") {
            unsupported(
                fos.expression,
                `for-of over ${iter.ty.c} (supports arrays, strings, Map, Set, and typed custom iterables)`,
            );
        }
        elemType ??= iter.ty.elem;
        if (!elemType) unsupported(fos.expression, "for-of element type unavailable");
        const idxVar = this.freshTemp("_i");
        const arrVar = this.freshTemp("_a");

        if (elemType.kind === "entry" && ts.isVariableDeclarationList(fos.initializer)) {
            const d = fos.initializer.declarations[0];
            if (d && ts.isArrayBindingPattern(d.name)) {
                this.emitEntryArrayForOf(
                    buf,
                    fos,
                    arrayExpr,
                    elemType,
                    arrVar,
                    idxVar,
                );
                return;
            }
        }

        let bindingName: string;
        let bindingIsConst = false;
        if (ts.isVariableDeclarationList(fos.initializer)) {
            bindingIsConst =
                (fos.initializer.flags & ts.NodeFlags.Const) !== 0;
            const d = fos.initializer.declarations[0];
            if (!d || !ts.isIdentifier(d.name))
                unsupported(fos.initializer, "for-of binding must be simple identifier");
            bindingName = mangleIdent(d.name.text);
        } else if (ts.isIdentifier(fos.initializer)) {
            bindingName = mangleIdent(fos.initializer.text);
        } else {
            unsupported(fos.initializer, "for-of binding form");
        }

        buf.open("");
        buf.line(`tsc_array_t* const ${arrVar} = ${arrayExpr};`);
        buf.open(
            `for (size_t ${idxVar} = 0; ${idxVar} < ${arrVar}->len; ${idxVar}++)`,
        );
        const qual = bindingIsConst ? " const" : "";
        buf.line(
            `${elemType.c}${qual} ${bindingName} = TSC_ARR(${elemType.c}, ${arrVar}, ${idxVar});`,
        );
        this.emitStmtInBlock(buf, fos.statement);
        buf.close();
        buf.close();
    }

    private emitCustomIterableArray(
        expr: ts.Expression,
        iter: EmitResult,
    ): EmitResult | null {
        const cd = this.classDeclForExpression(expr);
        if (!cd) return null;
        const found = this.findSymbolIteratorMethod(cd);
        if (!found) return null;
        const { owner, method } = found;
        const sig = this.checker.getSignatureFromDeclaration(method);
        if (!sig) unsupported(method, "could not resolve iterator method signature");
        const ret = mapTsType(method, sig.getReturnType(), this.checker);
        if (ret.kind !== "array" || !ret.elem) {
            unsupported(
                method,
                "[Symbol.iterator]() must return a typed array-backed IterableIterator<T>",
            );
        }
        return this.emitSequencedCall(
            `${owner.name!.text}___tsc_iterator`,
            ret,
            [
                {
                    value: iter,
                    pass: (tmp) => owner.name!.text === iter.ty.className
                        ? tmp
                        : `((${owner.name!.text}_t*)${tmp})`,
                },
            ],
        );
    }

    private emitCustomIteratorForOf(
        buf: CBuf,
        fos: ts.ForOfStatement,
        iter: EmitResult,
    ): boolean {
        const cd = this.classDeclForExpression(fos.expression);
        if (!cd) return false;
        const found = this.findSymbolIteratorMethod(cd);
        if (!found) return false;
        const { owner, method } = found;
        const sig = this.checker.getSignatureFromDeclaration(method);
        if (!sig) unsupported(method, "could not resolve iterator method signature");
        const iteratorType = this.prepareType(mapTsType(method, sig.getReturnType(), this.checker));
        if (iteratorType.kind !== "class" || !iteratorType.className) return false;
        const iteratorDecl = this.findClassDecl(iteratorType.className);
        if (!iteratorDecl) return false;
        const next = iteratorDecl.members.find(
            (m) =>
                ts.isMethodDeclaration(m) &&
                ts.isIdentifier(m.name) &&
                m.name.text === "next",
        );
        if (!next || !ts.isMethodDeclaration(next)) return false;
        const nextSig = this.checker.getSignatureFromDeclaration(next);
        if (!nextSig) unsupported(next, "could not resolve iterator next() signature");
        const stepTsType = nextSig.getReturnType();
        const stepType = this.prepareType(mapTsType(next, stepTsType, this.checker));
        if (stepType.kind !== "class") return false;
        const doneType = this.objectFieldType(next, stepTsType, "done", next.name);
        if (doneType.kind !== "boolean") unsupported(next, "iterator next().done must be boolean");
        const valueType = this.objectFieldType(next, stepTsType, "value", next.name);

        let bindingName: string;
        let bindingIsConst = false;
        if (ts.isVariableDeclarationList(fos.initializer)) {
            bindingIsConst = (fos.initializer.flags & ts.NodeFlags.Const) !== 0;
            const d = fos.initializer.declarations[0];
            if (!d || !ts.isIdentifier(d.name)) {
                unsupported(fos.initializer, "custom iterator for-of binding must be simple identifier");
            }
            bindingName = mangleIdent(d.name.text);
        } else if (ts.isIdentifier(fos.initializer)) {
            bindingName = mangleIdent(fos.initializer.text);
        } else {
            unsupported(fos.initializer, "custom iterator for-of binding form");
        }

        const iterVar = this.freshTemp("_it");
        const stepVar = this.freshTemp("_step");
        const qual = bindingIsConst ? " const" : "";
        buf.open("");
        const recv = this.freshTemp("_recv");
        buf.line(`${iter.ty.c} ${recv} = ${iter.c};`);
        const selfArg = owner.name!.text === iter.ty.className ? recv : `((${owner.name!.text}_t*)${recv})`;
        buf.line(`${iteratorType.c} const ${iterVar} = ${owner.name!.text}___tsc_iterator(${selfArg});`);
        buf.open("while (true)");
        buf.line(`${stepType.c} const ${stepVar} = ${iteratorType.className}_next(${iterVar});`);
        buf.line(`if (${stepVar}->done) break;`);
        buf.line(`${valueType.c}${qual} ${bindingName} = ${stepVar}->value;`);
        this.emitStmtInBlock(buf, fos.statement);
        buf.close();
        buf.close();
        return true;
    }

    private classDeclForExpression(expr: ts.Expression): ts.ClassDeclaration | null {
        const ty = this.checker.getTypeAtLocation(expr);
        const sym = ty.getSymbol();
        return sym?.getDeclarations()?.find(ts.isClassDeclaration) ?? null;
    }

    private findSymbolIteratorMethod(
        cd: ts.ClassDeclaration,
    ): { owner: ts.ClassDeclaration; method: ts.MethodDeclaration } | null {
        for (const m of cd.members) {
            if (
                ts.isMethodDeclaration(m) &&
                ts.isComputedPropertyName(m.name) &&
                this.isSymbolIteratorExpression(m.name.expression)
            ) {
                return { owner: cd, method: m };
            }
        }
        const base = this.baseClassDecl(cd);
        return base ? this.findSymbolIteratorMethod(base) : null;
    }

    private emitEntryArrayForOf(
        buf: CBuf,
        fos: ts.ForOfStatement,
        arrayExpr: string,
        elemType: CType,
        arrVar: string,
        idxVar: string,
    ): void {
        if (!ts.isVariableDeclarationList(fos.initializer)) {
            unsupported(
                fos.initializer,
                "Object.entries for-of destructuring needs const/let [key, value]",
            );
        }
        const d = fos.initializer.declarations[0];
        if (!d || !ts.isArrayBindingPattern(d.name)) {
            unsupported(
                fos.initializer,
                "Object.entries for-of binding must destructure as [key, value]",
            );
        }
        const [keyEl, valueEl] = d.name.elements;
        if (
            !keyEl ||
            !valueEl ||
            !ts.isBindingElement(keyEl) ||
            !ts.isBindingElement(valueEl) ||
            !ts.isIdentifier(keyEl.name) ||
            !ts.isIdentifier(valueEl.name)
        ) {
            unsupported(d.name, "Object.entries for-of binding must be [keyIdentifier, valueIdentifier]");
        }

        const bindingIsConst = (fos.initializer.flags & ts.NodeFlags.Const) !== 0;
        const qual = bindingIsConst ? " const" : "";
        const entryVar = this.freshTemp("_entry");
        const valueType = elemType.elem ?? T_VOID;
        const keyName = mangleIdent(keyEl.name.text);
        const valueName = mangleIdent(valueEl.name.text);

        buf.open("");
        buf.line(`tsc_array_t* const ${arrVar} = ${arrayExpr};`);
        buf.open(
            `for (size_t ${idxVar} = 0; ${idxVar} < ${arrVar}->len; ${idxVar}++)`,
        );
        buf.line(
            `${elemType.c}${qual} ${entryVar} = TSC_ARR(${elemType.c}, ${arrVar}, ${idxVar});`,
        );
        buf.line(`tsc_str_t*${qual} ${keyName} = ${entryVar}.key;`);
        buf.line(
            `${valueType.c}${qual} ${valueName} = ${this.objectEntryValue(entryVar, valueType)};`,
        );
        this.emitStmtInBlock(buf, fos.statement);
        buf.close();
        buf.close();
    }

    private emitMapForOf(
        buf: CBuf,
        fos: ts.ForOfStatement,
        iter: EmitResult,
    ): void {
        const keyType = iter.ty.key!;
        const valueType = iter.ty.elem!;
        const mapVar = this.freshTemp("_m");
        const idxVar = this.freshTemp("_i");

        let keyName: string | undefined;
        let valueName: string | undefined;
        let bindingIsConst = false;
        if (ts.isVariableDeclarationList(fos.initializer)) {
            bindingIsConst =
                (fos.initializer.flags & ts.NodeFlags.Const) !== 0;
            const d = fos.initializer.declarations[0];
            if (!d || !ts.isArrayBindingPattern(d.name)) {
                unsupported(
                    fos.initializer,
                    "Map for-of binding must destructure as [key, value]",
                );
            }
            const [keyEl, valueEl] = d.name.elements;
            if (
                !keyEl ||
                !valueEl ||
                !ts.isBindingElement(keyEl) ||
                !ts.isBindingElement(valueEl) ||
                !ts.isIdentifier(keyEl.name) ||
                !ts.isIdentifier(valueEl.name)
            ) {
                unsupported(
                    d.name,
                    "Map for-of binding must be [keyIdentifier, valueIdentifier]",
                );
            }
            keyName = mangleIdent(keyEl.name.text);
            valueName = mangleIdent(valueEl.name.text);
        } else {
            unsupported(
                fos.initializer,
                "Map for-of assignment must use a const/let [key, value] binding",
            );
        }

        const qual = bindingIsConst ? " const" : "";
        const keyAt = `*(${keyType.c}*)((char*)${mapVar}->keys + ${idxVar} * ${mapVar}->ks)`;
        const valueAt = `*(${valueType.c}*)((char*)${mapVar}->values + ${idxVar} * ${mapVar}->vs)`;

        buf.open("");
        buf.line(`tsc_map_t* const ${mapVar} = ${iter.c};`);
        buf.open(
            `for (size_t ${idxVar} = 0; ${idxVar} < ${mapVar}->len; ${idxVar}++)`,
        );
        buf.line(`${keyType.c}${qual} ${keyName} = ${keyAt};`);
        buf.line(`${valueType.c}${qual} ${valueName} = ${valueAt};`);
        this.emitStmtInBlock(buf, fos.statement);
        buf.close();
        buf.close();
    }

    private emitBlock(buf: CBuf, b: ts.Block): void {
        buf.open("");
        for (const s of b.statements) this.emitStmt(buf, s);
        buf.close();
    }

    private emitReturn(buf: CBuf, r: ts.ReturnStatement): void {
        if (this.returnStack.length === 0) {
            unsupported(r, "return outside of function");
        }
        const ret = this.returnStack[this.returnStack.length - 1]!;
        if (!r.expression) {
            buf.line("return;");
            return;
        }
        if (this.emitTailCallReturn(buf, r.expression)) return;
        const expr = this.emitExpr(r.expression);
        const coerced = this.coerce(expr, ret, r);
        buf.line(`return ${coerced};`);
    }

    private emitTailCallReturn(buf: CBuf, expr: ts.Expression): boolean {
        const ctx = this.tailFunctionStack[this.tailFunctionStack.length - 1];
        if (!ctx || !ts.isCallExpression(expr) || !ts.isIdentifier(expr.expression)) {
            return false;
        }
        if (this.identifierName(expr.expression) !== ctx.name) return false;
        if (expr.arguments.length !== ctx.params.length) return false;

        const temps: { name: string; type: CType; init: string }[] = [];
        for (let i = 0; i < expr.arguments.length; i++) {
            const arg = expr.arguments[i]!;
            const param = ctx.params[i]!;
            const r = this.emitExpr(arg);
            temps.push({
                name: this.freshTemp("_tailarg"),
                type: param.type,
                init: this.coerce(r, param.type, arg),
            });
        }

        buf.open("");
        for (const temp of temps) {
            buf.line(`${temp.type.c} ${temp.name} = ${temp.init};`);
        }
        for (let i = 0; i < temps.length; i++) {
            buf.line(`${ctx.params[i]!.name} = ${temps[i]!.name};`);
        }
        buf.line(`goto ${ctx.label};`);
        buf.close();
        return true;
    }

    private emitSwitch(buf: CBuf, sw: ts.SwitchStatement): void {
        this.assertExhaustiveSwitch(sw);
        const disc = this.emitExpr(sw.expression);
        const isStr = disc.ty.kind === "string";
        const isBool = disc.ty.kind === "boolean";
        if (!isStr && !isBool) requireNumber(sw.expression, disc.ty);
        const dv = this.freshTemp("_sw");
        buf.open("");
        buf.line(`${disc.ty.c} ${dv} = ${disc.c};`);
        // Group consecutive empty cases so `case A: case B: <body>` emits as
        // `if (_sw == A || _sw == B) { <body> }`.
        let pending: string[] = [];
        let first = true;
        const buildCond = (caseExpr: ts.Expression): string => {
            const caseVal = this.emitExpr(caseExpr);
            if (isStr) {
                return `tsc_str_eq(${dv}, ${this.coerce(caseVal, disc.ty, caseExpr)})`;
            }
            if (isBool) {
                return `(${dv} == ${this.coerce(caseVal, disc.ty, caseExpr)})`;
            }
            return `(${dv} == ${caseVal.c})`;
        };
        for (const clause of sw.caseBlock.clauses) {
            if (clause.kind === ts.SyntaxKind.CaseClause) {
                pending.push(buildCond(clause.expression));
                if (clause.statements.length > 0) {
                    const cond = pending.join(" || ");
                    if (first) buf.open(`if (${cond})`);
                    else buf.open(`else if (${cond})`);
                    first = false;
                    for (const s of clause.statements) this.emitStmt(buf, s);
                    buf.close();
                    pending = [];
                }
            }
        }
        const dflt = sw.caseBlock.clauses.find(
            (c) => c.kind === ts.SyntaxKind.DefaultClause,
        ) as ts.DefaultClause | undefined;
        if (dflt) {
            // If there are still-pending empty cases before the default, merge
            // them into the default (they fall through to it).
            if (pending.length > 0) {
                const cond = pending.join(" || ");
                if (first) buf.open(`if (${cond} || true)`);
                else buf.open(`else if (${cond} || true)`);
            } else {
                if (first) buf.open("if (true)");
                else buf.open("else");
            }
            for (const s of dflt.statements) this.emitStmt(buf, s);
            buf.close();
        } else if (pending.length > 0) {
            // Trailing empty cases with no default — they have no effect.
        }
        buf.close();
    }

    private assertExhaustiveSwitch(sw: ts.SwitchStatement): void {
        const domain = this.finiteSwitchDomain(sw.expression);
        if (!domain) return;
        if (sw.caseBlock.clauses.some(ts.isDefaultClause)) return;

        const seen = new Set<string>();
        for (const clause of sw.caseBlock.clauses) {
            if (!ts.isCaseClause(clause)) continue;
            const key = this.switchCaseKey(clause.expression);
            if (key) seen.add(key);
        }
        const missing = [...domain.entries()]
            .filter(([key]) => !seen.has(key))
            .map(([, label]) => label);
        if (missing.length > 0) {
            unsupported(
                sw,
                `non-exhaustive switch; missing case${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
            );
        }
    }

    private finiteSwitchDomain(expr: ts.Expression): Map<string, string> | null {
        const t = this.checker.getTypeAtLocation(expr);
        const out = new Map<string, string>();
        const addType = (part: ts.Type): boolean => {
            const key = this.literalTypeKey(part);
            if (!key) return false;
            out.set(key.key, key.label);
            return true;
        };
        if (t.flags & ts.TypeFlags.Boolean) {
            out.set("b:true", "true");
            out.set("b:false", "false");
            return out;
        }
        if (t.isUnion()) {
            for (const part of t.types) {
                if (!addType(part)) return null;
            }
            return out.size > 0 ? out : null;
        }
        return addType(t) ? out : null;
    }

    private literalTypeKey(t: ts.Type): { key: string; label: string } | null {
        if (t.isStringLiteral()) {
            return { key: `s:${t.value}`, label: JSON.stringify(t.value) };
        }
        if (t.isNumberLiteral()) {
            return { key: `n:${t.value}`, label: String(t.value) };
        }
        if (t.flags & ts.TypeFlags.BooleanLiteral) {
            const name = (t as unknown as { intrinsicName?: string }).intrinsicName;
            if (name === "true" || name === "false") {
                return { key: `b:${name}`, label: name };
            }
        }
        return null;
    }

    private switchCaseKey(expr: ts.Expression): string | null {
        if (ts.isStringLiteralLike(expr)) return `s:${expr.text}`;
        if (ts.isNumericLiteral(expr)) return `n:${Number(expr.text)}`;
        if (
            ts.isPrefixUnaryExpression(expr) &&
            ts.isNumericLiteral(expr.operand) &&
            (expr.operator === ts.SyntaxKind.MinusToken ||
                expr.operator === ts.SyntaxKind.PlusToken)
        ) {
            const n = Number(expr.operand.text);
            return `n:${expr.operator === ts.SyntaxKind.MinusToken ? -n : n}`;
        }
        if (expr.kind === ts.SyntaxKind.TrueKeyword) return "b:true";
        if (expr.kind === ts.SyntaxKind.FalseKeyword) return "b:false";
        if (ts.isPropertyAccessExpression(expr)) {
            const enumValue = this.enumConstantValue(expr);
            if (typeof enumValue === "number") return `n:${enumValue}`;
        }
        return null;
    }

    private emitThrow(buf: CBuf, t: ts.ThrowStatement): void {
        const e = this.emitExpr(t.expression);
        const asStr = this.coerceToString(e, t.expression);
        buf.line(`tsc_throw_str(${asStr});`);
    }

    private emitTry(buf: CBuf, ts0: ts.TryStatement): void {
        const ehVar = this.freshTemp("_eh");
        buf.open("");
        buf.line(`tsc_try_frame_t ${ehVar};`);
        buf.line(`tsc_try_push(&${ehVar});`);
        buf.open(`if (setjmp(${ehVar}.jb) == 0)`);
        for (const s of ts0.tryBlock.statements) this.emitStmt(buf, s);
        buf.line(`tsc_try_pop();`);
        buf.close();
        if (ts0.catchClause) {
            buf.open("else");
            let catchSym: ts.Symbol | undefined;
            if (ts0.catchClause.variableDeclaration) {
                const vd = ts0.catchClause.variableDeclaration;
                if (!ts.isIdentifier(vd.name))
                    unsupported(vd, "catch binding must be simple identifier");
                catchSym = this.symbolForIdentifier(vd.name);
                if (catchSym) this.catchStringSymbols.add(catchSym);
                buf.line(
                    `tsc_str_t* ${mangleIdent(vd.name.text)} = tsc_current_error();`,
                );
            }
            try {
                for (const s of ts0.catchClause.block.statements)
                    this.emitStmt(buf, s);
            } finally {
                if (catchSym) this.catchStringSymbols.delete(catchSym);
            }
            buf.close();
        } else {
            buf.open("else");
            buf.line("tsc_rethrow();");
            buf.close();
        }
        if (ts0.finallyBlock) {
            for (const s of ts0.finallyBlock.statements) this.emitStmt(buf, s);
        }
        buf.close();
    }

    // ---------------- expressions ----------------

    private emitExpr(expr: ts.Expression): EmitResult {
        if (ts.isNumericLiteral(expr)) {
            return { c: formatNumericLiteral(expr.text), ty: T_NUMBER };
        }
        if (ts.isBigIntLiteral(expr)) {
            const lit = formatBigIntLiteral(expr.text);
            return { c: `tsc_bigint_from_lit("${escapeCString(lit)}")`, ty: T_BIGINT };
        }
        if (
            ts.isStringLiteral(expr) ||
            expr.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
        ) {
            const text = (expr as ts.StringLiteral | ts.NoSubstitutionTemplateLiteral).text;
            return {
                c: `tsc_str_from_lit("${escapeCString(text)}", ${utf8ByteLen(text)})`,
                ty: T_STRING,
            };
        }
        if (ts.isRegularExpressionLiteral(expr)) {
            // Parse "/pattern/flags" — find last '/' to split.
            const text = expr.text;
            const lastSlash = text.lastIndexOf("/");
            const pattern = text.slice(1, lastSlash);
            const flags = text.slice(lastSlash + 1);
            return {
                c: `tsc_regexp_new(tsc_str_from_lit("${escapeCString(pattern)}", ${utf8ByteLen(pattern)}), tsc_str_from_lit("${escapeCString(flags)}", ${utf8ByteLen(flags)}))`,
                ty: T_REGEXP,
            };
        }
        if (expr.kind === ts.SyntaxKind.TrueKeyword) return { c: "true", ty: T_BOOLEAN };
        if (expr.kind === ts.SyntaxKind.FalseKeyword) return { c: "false", ty: T_BOOLEAN };
        if (expr.kind === ts.SyntaxKind.NullKeyword) return { c: "NULL", ty: T_VOID };
        if (ts.isTemplateExpression(expr)) return this.emitTemplate(expr);
        if (ts.isTaggedTemplateExpression(expr)) return this.emitTaggedTemplate(expr);
        if (expr.kind === ts.SyntaxKind.ThisKeyword) {
            if (!this.currentClass)
                unsupported(expr, "`this` outside of a class method");
            return { c: "self", ty: classType(this.currentClass) };
        }

        if (ts.isIdentifier(expr)) {
            // Built-in global identifiers.
            if (expr.text === "NaN") return { c: "((double)NAN)", ty: T_NUMBER };
            if (expr.text === "Infinity") return { c: "((double)INFINITY)", ty: T_NUMBER };
            if (expr.text === "undefined") return { c: "NULL", ty: T_VOID };
            const sym = this.symbolForIdentifier(expr);
            if (sym && this.catchStringSymbols.has(sym)) {
                return { c: this.identifierRead(expr), ty: T_STRING };
            }
            const ty = this.prepareType(mapType(expr, this.checker));
            const declaredTy = this.identifierDeclaredType(expr);
            if (declaredTy?.kind === "value" && ty.kind !== "value") {
                return {
                    c: this.unboxDynamicValue(this.identifierRead(expr), ty),
                    ty,
                };
            }
            if (ty.kind === "function" && this.isDirectFunctionReferenceValue(expr)) {
                return this.emitFunctionReferenceClosure(expr, ty);
            }
            return { c: this.identifierRead(expr), ty };
        }
        if (ts.isParenthesizedExpression(expr)) {
            const inner = this.emitExpr(expr.expression);
            return { c: `(${inner.c})`, ty: inner.ty };
        }
        if (ts.isTypeOfExpression(expr)) return this.emitTypeOf(expr);
        if (ts.isDeleteExpression(expr)) return this.emitDelete(expr);
        if (ts.isPrefixUnaryExpression(expr)) return this.emitPrefixUnary(expr);
        if (ts.isPostfixUnaryExpression(expr)) return this.emitPostfixUnary(expr);
        if (ts.isBinaryExpression(expr)) return this.emitBinary(expr);
        if (ts.isConditionalExpression(expr)) return this.emitTernary(expr);
        if (ts.isCallExpression(expr)) return this.emitCall(expr);
        if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
            return this.emitClosureExpression(expr);
        }
        if (ts.isNewExpression(expr)) return this.emitNew(expr);
        if (ts.isPropertyAccessExpression(expr)) return this.emitPropertyAccess(expr);
        if (ts.isElementAccessExpression(expr)) return this.emitElementAccess(expr);
        if (ts.isArrayLiteralExpression(expr)) return this.emitArrayLiteral(expr);
        if (ts.isObjectLiteralExpression(expr)) return this.emitObjectLiteral(expr);
        if (ts.isNonNullExpression(expr)) return this.emitExpr(expr.expression);
        if (ts.isAsExpression(expr)) return this.emitExpr(expr.expression);
        if (ts.isTypeAssertionExpression(expr)) return this.emitExpr(expr.expression);

        unsupported(expr, `expression kind ${ts.SyntaxKind[expr.kind]}`);
    }

    private emitTypeOf(to: ts.TypeOfExpression): EmitResult {
        const inner = this.emitExpr(to.expression);
        const result = this.typeofName(to.expression, inner.ty);
        const nullishResult = this.nullishTypeofName(to.expression);
        if (inner.ty.kind === "value") {
            return { c: `tsc_value_typeof(${inner.c})`, ty: T_STRING };
        }
        if (nullishResult && isPointerKind(inner.ty) && nullishResult !== result) {
            const tv = this.freshTemp("_typeof");
            return {
                c:
                    `({ ${inner.ty.c} ${tv} = ${inner.c}; ` +
                    `${tv} != NULL ? ${this.stringLit(result)} : ${this.stringLit(nullishResult)}; })`,
                ty: T_STRING,
            };
        }
        return {
            c:
                `({ (void)(${inner.c}); ` +
                `${this.stringLit(result)}; })`,
            ty: T_STRING,
        };
    }

    private stringLit(text: string): string {
        return `tsc_str_from_lit("${escapeCString(text)}", ${utf8ByteLen(text)})`;
    }

    private zeroValue(type: CType): string {
        switch (type.kind) {
            case "number":
                return "0.0";
            case "boolean":
                return "false";
            case "void":
            case "never":
                return "0";
            default:
                if (isPointerKind(type)) return `((${type.c})NULL)`;
                return `(${type.c}){0}`;
        }
    }

    private typeofName(expr: ts.Expression, ty: CType): string {
        if (expr.kind === ts.SyntaxKind.NullKeyword) return "object";
        switch (ty.kind) {
            case "number":
                return "number";
            case "bigint":
                return "bigint";
            case "symbol":
                return "symbol";
            case "string":
                return "string";
            case "boolean":
                return "boolean";
            case "void":
            case "never":
                return "undefined";
            case "array":
            case "class":
            case "map":
            case "set":
            case "weakmap":
            case "weakset":
            case "weakref":
            case "regexp":
            case "hash":
            case "url":
            case "buffer":
                return "object";
            case "function":
                return "function";
            case "value":
                return "object";
            default:
                unsupported(expr, `typeof on ${ty.c}`);
        }
    }

    private nullishTypeofName(expr: ts.Expression): string | null {
        const type = this.declaredOrCurrentType(expr);
        let hasNull = false;
        let hasUndefined = false;
        const visit = (part: ts.Type): void => {
            if (part.flags & ts.TypeFlags.Null) hasNull = true;
            if (part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
                hasUndefined = true;
            }
        };
        if (type.isUnion()) {
            for (const part of type.types) visit(part);
        } else {
            visit(type);
        }
        if (!hasNull && !hasUndefined) return null;
        if (hasUndefined && !hasNull) return "undefined";
        return "object";
    }

    private declaredOrCurrentType(expr: ts.Expression): ts.Type {
        if (ts.isIdentifier(expr)) {
            const sym = this.checker.getSymbolAtLocation(expr);
            if (sym?.valueDeclaration) {
                try {
                    return this.checker.getTypeOfSymbolAtLocation(
                        sym,
                        sym.valueDeclaration,
                    );
                } catch {
                    // fall through to narrowed/current type
                }
            }
        }
        return this.checker.getTypeAtLocation(expr);
    }

    private emitTypeofComparison(
        bin: ts.BinaryExpression,
        negate: boolean,
    ): EmitResult | null {
        const left = this.typeofComparisonSide(bin.left, bin.right);
        if (left) {
            const c = this.emitTypeofEquals(left.expr, left.expected);
            return { c: negate ? `(!${c})` : c, ty: T_BOOLEAN };
        }
        const right = this.typeofComparisonSide(bin.right, bin.left);
        if (right) {
            const c = this.emitTypeofEquals(right.expr, right.expected);
            return { c: negate ? `(!${c})` : c, ty: T_BOOLEAN };
        }
        return null;
    }

    private typeofComparisonSide(
        maybeTypeof: ts.Expression,
        maybeExpected: ts.Expression,
    ): { expr: ts.Expression; expected: string } | null {
        if (!ts.isTypeOfExpression(maybeTypeof)) return null;
        if (!ts.isStringLiteral(maybeExpected)) return null;
        return { expr: maybeTypeof.expression, expected: maybeExpected.text };
    }

    private emitTypeofEquals(expr: ts.Expression, expected: string): string {
        const inner = this.emitExpr(expr);
        if (inner.ty.kind === "value") {
            const tv = this.freshTemp("_typeofv");
            return `({ ${inner.ty.c} ${tv} = ${inner.c}; tsc_str_eq(tsc_value_typeof(${tv}), ${this.stringLit(expected)}); })`;
        }
        const result = this.typeofName(expr, inner.ty);
        const nullishResult = this.nullishTypeofName(expr);
        const resultValue = result === expected ? "true" : "false";
        if (nullishResult && isPointerKind(inner.ty) && nullishResult !== result) {
            const tv = this.freshTemp("_typeof");
            const nullishValue = nullishResult === expected ? "true" : "false";
            return `({ ${inner.ty.c} ${tv} = ${inner.c}; ${tv} != NULL ? ${resultValue} : ${nullishValue}; })`;
        }
        return `({ (void)(${inner.c}); ${resultValue}; })`;
    }

    private emitBoolExpr(expr: ts.Expression): string {
        const r = this.emitExpr(expr);
        return this.truthyC(r, expr);
    }

    private truthyC(r: EmitResult, expr: ts.Expression): string {
        if (r.ty.kind === "boolean") return r.c;
        if (r.ty.kind === "number") return `((${r.c}) != 0 && !isnan(${r.c}))`;
        if (r.ty.kind === "bigint") return `((${r.c}) != NULL && mpz_sgn((${r.c})->value) != 0)`;
        if (r.ty.kind === "string") return `((${r.c}) != NULL && (${r.c})->len != 0)`;
        if (r.ty.kind === "value") return `tsc_value_is_truthy(${r.c})`;
        if (isPointerKind(r.ty)) return `((${r.c}) != NULL)`;
        unsupported(expr, `cannot coerce ${r.ty.c} to boolean`);
    }

    private emitTemplate(te: ts.TemplateExpression): EmitResult {
        const headText = te.head.text;
        let expr = `tsc_str_from_lit("${escapeCString(headText)}", ${utf8ByteLen(headText)})`;
        for (const span of te.templateSpans) {
            const inner = this.emitExpr(span.expression);
            const asStr = this.coerceToString(inner, span.expression);
            expr = `tsc_str_concat(${expr}, ${asStr})`;
            const lit = span.literal.text;
            if (lit.length > 0) {
                expr = `tsc_str_concat(${expr}, tsc_str_from_lit("${escapeCString(lit)}", ${utf8ByteLen(lit)}))`;
            }
        }
        return { c: expr, ty: T_STRING };
    }

    private emitTaggedTemplate(tt: ts.TaggedTemplateExpression): EmitResult {
        if (!ts.isIdentifier(tt.tag)) {
            unsupported(tt.tag, "tagged template tag must be a function identifier");
        }
        const parts = this.templateStringParts(tt.template);
        const expressions = ts.isTemplateExpression(tt.template)
            ? tt.template.templateSpans.map((span) => span.expression)
            : [];
        const sig = this.checker.getResolvedSignature(tt);
        if (!sig) unsupported(tt, "unresolved tagged template signature");
        const params = sig.getParameters();
        const specs: SequencedCallArg[] = [
            {
                value: {
                    c: this.stringArrayLiteral(parts),
                    ty: arrayType(T_STRING),
                },
                target: params[0]?.valueDeclaration
                    ? mapTsType(tt, this.checker.getTypeOfSymbolAtLocation(params[0], params[0].valueDeclaration), this.checker)
                    : arrayType(T_STRING),
                node: tt.template,
            },
        ];
        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i]!;
            const r = this.emitExpr(expr);
            const paramDecl = params[i + 1]?.valueDeclaration;
            let paramType = r.ty;
            if (paramDecl && ts.isParameter(paramDecl)) {
                paramType = mapType(paramDecl, this.checker);
            }
            specs.push({ value: r, target: paramType, node: expr });
        }
        const retType = mapTsType(tt, sig.getReturnType(), this.checker);
        return this.emitSequencedCall(
            this.identifierName(tt.tag),
            retType,
            specs,
        );
    }

    private templateStringParts(
        template: ts.TemplateLiteral | ts.NoSubstitutionTemplateLiteral,
    ): string[] {
        if (ts.isNoSubstitutionTemplateLiteral(template)) return [template.text];
        return [
            template.head.text,
            ...template.templateSpans.map((span) => span.literal.text),
        ];
    }

    private stringArrayLiteral(parts: readonly string[]): string {
        const av = this.freshTemp("_tpl");
        const steps = [
            `tsc_array_t* ${av} = tsc_array_new(sizeof(tsc_str_t*), ${Math.max(1, parts.length)})`,
        ];
        for (const part of parts) {
            const sv = this.freshTemp("_tpls");
            steps.push(
                `tsc_str_t* ${sv} = tsc_str_from_lit("${escapeCString(part)}", ${utf8ByteLen(part)})`,
            );
            steps.push(`tsc_array_push_raw(${av}, &${sv})`);
        }
        steps.push(av);
        return `({ ${steps.join("; ")}; })`;
    }

    private emitPrefixUnary(pu: ts.PrefixUnaryExpression): EmitResult {
        const op = pu.operator;
        const inner = this.emitExpr(pu.operand);
        switch (op) {
            case ts.SyntaxKind.ExclamationToken:
                return { c: `(!${this.emitBoolExpr(pu.operand)})`, ty: T_BOOLEAN };
            case ts.SyntaxKind.MinusToken:
                if (inner.ty.kind === "bigint") {
                    return { c: `tsc_bigint_neg(${inner.c})`, ty: T_BIGINT };
                }
                requireNumber(pu, inner.ty);
                return { c: `(-${inner.c})`, ty: T_NUMBER };
            case ts.SyntaxKind.PlusToken:
                requireNumber(pu, inner.ty);
                return { c: `(+${inner.c})`, ty: T_NUMBER };
            case ts.SyntaxKind.PlusPlusToken:
                requireNumber(pu, inner.ty);
                return { c: `(++${inner.c})`, ty: T_NUMBER };
            case ts.SyntaxKind.MinusMinusToken:
                requireNumber(pu, inner.ty);
                return { c: `(--${inner.c})`, ty: T_NUMBER };
            case ts.SyntaxKind.TildeToken:
                requireNumber(pu, inner.ty);
                return { c: `((double)(~(int32_t)(${inner.c})))`, ty: T_NUMBER };
        }
        unsupported(pu, `prefix operator ${ts.SyntaxKind[op]}`);
    }

    private emitDelete(del: ts.DeleteExpression): EmitResult {
        const expr = del.expression;
        if (ts.isPropertyAccessExpression(expr)) {
            const recv = this.emitExpr(expr.expression);
            const keyText = expr.name.text;
            const key: EmitResult = {
                c: `tsc_str_from_lit("${escapeCString(keyText)}", ${utf8ByteLen(keyText)})`,
                ty: T_STRING,
            };
            return this.emitSequencedCall("tsc_value_delete_prop", T_BOOLEAN, [
                { value: recv, target: T_VALUE, node: expr.expression },
                { value: key, target: T_STRING, node: expr.name },
            ]);
        }
        if (ts.isElementAccessExpression(expr)) {
            const recv = this.emitExpr(expr.expression);
            const key = this.emitExpr(expr.argumentExpression);
            return this.emitSequencedCall("tsc_value_delete_prop", T_BOOLEAN, [
                { value: recv, target: T_VALUE, node: expr.expression },
                { value: key, target: T_STRING, node: expr.argumentExpression },
            ]);
        }
        unsupported(del, "delete currently supports dynamic property/element access only");
    }

    private emitPostfixUnary(pu: ts.PostfixUnaryExpression): EmitResult {
        const inner = this.emitExpr(pu.operand);
        switch (pu.operator) {
            case ts.SyntaxKind.PlusPlusToken:
                requireNumber(pu, inner.ty);
                return { c: `(${inner.c}++)`, ty: T_NUMBER };
            case ts.SyntaxKind.MinusMinusToken:
                requireNumber(pu, inner.ty);
                return { c: `(${inner.c}--)`, ty: T_NUMBER };
        }
        unsupported(pu, `postfix operator ${ts.SyntaxKind[pu.operator]}`);
    }

    private emitBinary(bin: ts.BinaryExpression): EmitResult {
        const op = bin.operatorToken.kind;

        if (
            op === ts.SyntaxKind.EqualsToken ||
            op === ts.SyntaxKind.PlusEqualsToken ||
            op === ts.SyntaxKind.MinusEqualsToken ||
            op === ts.SyntaxKind.AsteriskEqualsToken ||
            op === ts.SyntaxKind.SlashEqualsToken ||
            op === ts.SyntaxKind.PercentEqualsToken
        ) {
            return this.emitAssignment(bin, op);
        }

        if (op === ts.SyntaxKind.InstanceOfKeyword) {
            return this.emitInstanceOf(bin);
        }

        if (
            op === ts.SyntaxKind.EqualsEqualsToken ||
            op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            op === ts.SyntaxKind.ExclamationEqualsToken ||
            op === ts.SyntaxKind.ExclamationEqualsEqualsToken
        ) {
            const typeofComparison = this.emitTypeofComparison(
                bin,
                op === ts.SyntaxKind.ExclamationEqualsToken ||
                    op === ts.SyntaxKind.ExclamationEqualsEqualsToken,
            );
            if (typeofComparison) return typeofComparison;
        }

        const left = this.emitExpr(bin.left);
        const right = this.emitExpr(bin.right);

        switch (op) {
            case ts.SyntaxKind.InKeyword: {
                if (right.ty.kind !== "value") {
                    unsupported(bin.right, "in currently supports dynamic object right-hand sides only");
                }
                return this.emitSequencedExpr(
                    T_BOOLEAN,
                    [
                        { value: left, target: T_STRING, node: bin.left },
                        { value: right, target: T_VALUE, node: bin.right },
                    ],
                    ([key, obj]) => `tsc_value_has_prop(${obj}, ${key})`,
                );
            }
            case ts.SyntaxKind.PlusToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    return this.emitDynamicBinary("tsc_value_add", T_VALUE, bin, left, right);
                }
                if (left.ty.kind === "string" || right.ty.kind === "string") {
                    const ls = this.coerceToString(left, bin.left);
                    const rs = this.coerceToString(right, bin.right);
                    return { c: `tsc_str_concat(${ls}, ${rs})`, ty: T_STRING };
                }
                if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
                    return { c: `tsc_bigint_add(${left.c}, ${right.c})`, ty: T_BIGINT };
                }
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                return { c: `(${left.c} + ${right.c})`, ty: T_NUMBER };
            }
            case ts.SyntaxKind.MinusToken:
            case ts.SyntaxKind.AsteriskToken:
            case ts.SyntaxKind.SlashToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    const fn =
                        op === ts.SyntaxKind.MinusToken
                            ? "tsc_value_sub"
                            : op === ts.SyntaxKind.AsteriskToken
                                ? "tsc_value_mul"
                                : "tsc_value_div";
                    return this.emitDynamicBinary(fn, T_VALUE, bin, left, right);
                }
                if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
                    const fn =
                        op === ts.SyntaxKind.MinusToken
                            ? "tsc_bigint_sub"
                            : op === ts.SyntaxKind.AsteriskToken
                                ? "tsc_bigint_mul"
                                : "tsc_bigint_div";
                    return { c: `${fn}(${left.c}, ${right.c})`, ty: T_BIGINT };
                }
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                const cop =
                    op === ts.SyntaxKind.MinusToken
                        ? "-"
                        : op === ts.SyntaxKind.AsteriskToken
                            ? "*"
                            : "/";
                return { c: `(${left.c} ${cop} ${right.c})`, ty: T_NUMBER };
            }
            case ts.SyntaxKind.PercentToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    return this.emitDynamicBinary("tsc_value_mod", T_VALUE, bin, left, right);
                }
                if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
                    return { c: `tsc_bigint_mod(${left.c}, ${right.c})`, ty: T_BIGINT };
                }
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                return { c: `tsc_num_mod(${left.c}, ${right.c})`, ty: T_NUMBER };
            }
            case ts.SyntaxKind.AsteriskAsteriskToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    return this.emitDynamicBinary("tsc_value_pow", T_VALUE, bin, left, right);
                }
                if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
                    return { c: `tsc_bigint_pow(${left.c}, ${right.c})`, ty: T_BIGINT };
                }
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                return { c: `pow(${left.c}, ${right.c})`, ty: T_NUMBER };
            }
            case ts.SyntaxKind.EqualsEqualsToken:
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return this.emitEquality(bin, left, right, false);
            case ts.SyntaxKind.ExclamationEqualsToken:
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return this.emitEquality(bin, left, right, true);
            case ts.SyntaxKind.LessThanToken:
            case ts.SyntaxKind.LessThanEqualsToken:
            case ts.SyntaxKind.GreaterThanToken:
            case ts.SyntaxKind.GreaterThanEqualsToken:
                return this.emitRelational(bin, left, right, op);
            case ts.SyntaxKind.AmpersandAmpersandToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    const rc = this.coerce(right, T_VALUE, bin.right);
                    return this.emitSequencedExpr(
                        T_VALUE,
                        [{ value: left, target: T_VALUE, node: bin.left }],
                        ([lv]) => `(tsc_value_is_truthy(${lv}) ? ${rc} : ${lv})`,
                    );
                }
                const lb = this.emitBoolExpr(bin.left);
                const rb = this.emitBoolExpr(bin.right);
                return { c: `(${lb} && ${rb})`, ty: T_BOOLEAN };
            }
            case ts.SyntaxKind.BarBarToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    const rc = this.coerce(right, T_VALUE, bin.right);
                    return this.emitSequencedExpr(
                        T_VALUE,
                        [{ value: left, target: T_VALUE, node: bin.left }],
                        ([lv]) => `(tsc_value_is_truthy(${lv}) ? ${lv} : ${rc})`,
                    );
                }
                const lb = this.emitBoolExpr(bin.left);
                const rb = this.emitBoolExpr(bin.right);
                return { c: `(${lb} || ${rb})`, ty: T_BOOLEAN };
            }
            case ts.SyntaxKind.QuestionQuestionToken: {
                if (left.ty.kind === "value" || right.ty.kind === "value") {
                    const rc = this.coerce(right, T_VALUE, bin.right);
                    return this.emitSequencedExpr(
                        T_VALUE,
                        [{ value: left, target: T_VALUE, node: bin.left }],
                        ([lv]) => `(tsc_value_is_nullish(${lv}) ? ${rc} : ${lv})`,
                    );
                }
                const pointerKinds: readonly CType["kind"][] = [
                    "string", "bigint", "symbol", "array", "class", "map", "set", "weakmap", "weakset", "weakref", "regexp", "hash", "url", "buffer", "function",
                ];
                if (pointerKinds.includes(left.ty.kind)) {
                    const tv = this.freshTemp("_nc");
                    const rc = this.coerce(right, left.ty, bin.right);
                    return {
                        c: `({ ${left.ty.c} ${tv} = ${left.c}; ${tv} != NULL ? ${tv} : ${rc}; })`,
                        ty: left.ty,
                    };
                }
                // Primitive left: never nullish in typed code — just use left.
                return left;
            }
            case ts.SyntaxKind.AmpersandToken:
            case ts.SyntaxKind.BarToken:
            case ts.SyntaxKind.CaretToken:
            case ts.SyntaxKind.LessThanLessThanToken:
            case ts.SyntaxKind.GreaterThanGreaterThanToken: {
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                const cop = bitwiseOp(op);
                return {
                    c: `((double)((int32_t)(${left.c}) ${cop} (int32_t)(${right.c})))`,
                    ty: T_NUMBER,
                };
            }
            case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken: {
                requireNumber(bin, left.ty);
                requireNumber(bin, right.ty);
                return {
                    c: `((double)((uint32_t)(${left.c}) >> (uint32_t)(${right.c})))`,
                    ty: T_NUMBER,
                };
            }
        }
        unsupported(bin, `binary operator ${ts.SyntaxKind[op]}`);
    }

    private emitInstanceOf(bin: ts.BinaryExpression): EmitResult {
        const left = this.emitExpr(bin.left);
        if (left.ty.kind !== "class" || !left.ty.className) {
            unsupported(bin.left, "instanceof left side must be a class value");
        }
        const leftDecl = this.findClassDecl(left.ty.className);
        if (!leftDecl) unsupported(bin.left, "instanceof on interface-shaped value");
        if (!ts.isIdentifier(bin.right)) {
            unsupported(bin.right, "instanceof right side must be a class identifier");
        }
        const rightDecl = this.findClassDecl(bin.right.text);
        if (!rightDecl) unsupported(bin.right, "instanceof right side must be a class");
        const tv = this.freshTemp("_io");
        return {
            c:
                `({ ${left.ty.c} ${tv} = ${left.c}; ` +
                `${tv} != NULL && tsc_instanceof(${tv}->__tsc_type, "${escapeCString(bin.right.text)}"); })`,
            ty: T_BOOLEAN,
        };
    }

    private findClassDecl(name: string): ts.ClassDeclaration | null {
        for (const info of this.graph.modules.values()) {
            for (const stmt of info.sf.statements) {
                const inner = this.unwrapExportDecl(stmt);
                if (
                    inner &&
                    ts.isClassDeclaration(inner) &&
                    inner.name?.text === name
                ) {
                    return inner;
                }
            }
        }
        return null;
    }

    private emitAssignment(
        bin: ts.BinaryExpression,
        op: ts.SyntaxKind,
    ): EmitResult {
        const dynamicPropertyAssignment = this.emitDynamicPropertyAssignment(bin, op);
        if (dynamicPropertyAssignment) return dynamicPropertyAssignment;

        const lhsC = this.emitLvalue(bin.left);
        const lhsType = this.storageType(bin.left);
        const rhs = this.emitExpr(bin.right);

        if (op === ts.SyntaxKind.EqualsToken) {
            const coerced = this.coerce(rhs, lhsType, bin.right);
            return { c: `(${lhsC} = ${coerced})`, ty: lhsType };
        }

        if (lhsType.kind === "bigint") {
            if (rhs.ty.kind !== "bigint") {
                unsupported(bin.right, `cannot apply compound BigInt assignment with ${rhs.ty.c}`);
            }
            const fn =
                op === ts.SyntaxKind.PlusEqualsToken
                    ? "tsc_bigint_add"
                    : op === ts.SyntaxKind.MinusEqualsToken
                        ? "tsc_bigint_sub"
                        : op === ts.SyntaxKind.AsteriskEqualsToken
                            ? "tsc_bigint_mul"
                            : op === ts.SyntaxKind.SlashEqualsToken
                                ? "tsc_bigint_div"
                                : op === ts.SyntaxKind.PercentEqualsToken
                                    ? "tsc_bigint_mod"
                                    : null;
            if (fn) return { c: `(${lhsC} = ${fn}(${lhsC}, ${rhs.c}))`, ty: T_BIGINT };
        }

        if (lhsType.kind === "value") {
            const fn =
                op === ts.SyntaxKind.PlusEqualsToken
                    ? "tsc_value_add"
                    : op === ts.SyntaxKind.MinusEqualsToken
                        ? "tsc_value_sub"
                        : op === ts.SyntaxKind.AsteriskEqualsToken
                            ? "tsc_value_mul"
                            : op === ts.SyntaxKind.SlashEqualsToken
                                ? "tsc_value_div"
                                : op === ts.SyntaxKind.PercentEqualsToken
                                    ? "tsc_value_mod"
                                    : null;
            if (fn) {
                return {
                    c: `(${lhsC} = ${fn}(${lhsC}, ${this.coerce(rhs, T_VALUE, bin.right)}))`,
                    ty: T_VALUE,
                };
            }
        }

        requireNumber(bin.left, lhsType);
        requireNumber(bin.right, rhs.ty);
        const plain =
            op === ts.SyntaxKind.PlusEqualsToken
                ? "+="
                : op === ts.SyntaxKind.MinusEqualsToken
                    ? "-="
                    : op === ts.SyntaxKind.AsteriskEqualsToken
                        ? "*="
                        : op === ts.SyntaxKind.SlashEqualsToken
                            ? "/="
                            : null;
        if (plain) return { c: `(${lhsC} ${plain} ${rhs.c})`, ty: T_NUMBER };
        if (op === ts.SyntaxKind.PercentEqualsToken) {
            return {
                c: `(${lhsC} = tsc_num_mod(${lhsC}, ${rhs.c}))`,
                ty: T_NUMBER,
            };
        }
        unsupported(bin, `compound assignment ${ts.SyntaxKind[op]}`);
    }

    private emitDynamicPropertyAssignment(
        bin: ts.BinaryExpression,
        op: ts.SyntaxKind,
    ): EmitResult | null {
        let recvExpr: ts.Expression | null = null;
        let keyExpr: ts.Expression | null = null;
        let key: EmitResult | null = null;
        let indexAssignment = false;
        let literalKey: string | null = null;

        if (ts.isPropertyAccessExpression(bin.left)) {
            const left = bin.left;
            if (!ts.isIdentifier(left.name)) return null;
            recvExpr = left.expression;
            literalKey = left.name.text;
            if (this.namespaceMemberName(left.name)) return null;
            if (ts.isIdentifier(recvExpr)) {
                const sym = this.checker.getSymbolAtLocation(recvExpr);
                const cd = sym
                    ?.getDeclarations()
                    ?.find(ts.isClassDeclaration);
                const staticField = cd?.members.find(
                    (m) =>
                        ts.isPropertyDeclaration(m) &&
                        m.name &&
                        ts.isIdentifier(m.name) &&
                        m.name.text === left.name.text &&
                        isStatic(m),
                );
                if (staticField) return null;
            }
        } else if (ts.isElementAccessExpression(bin.left)) {
            recvExpr = bin.left.expression;
            keyExpr = bin.left.argumentExpression;
        } else {
            return null;
        }

        const recv = this.emitExpr(recvExpr);
        if (recv.ty.kind !== "value") return null;

        const rhs = this.emitExpr(bin.right);
        const specs: SequencedCallArg[] = [
            { value: recv, target: T_VALUE, node: recvExpr },
        ];
        if (keyExpr) {
            key = this.emitExpr(keyExpr);
            indexAssignment = key.ty.kind === "number";
            specs.push({ value: key, target: indexAssignment ? T_NUMBER : T_STRING, node: keyExpr });
        }
        specs.push({ value: rhs, target: T_VALUE, node: bin.right });

        const compoundFn =
            op === ts.SyntaxKind.PlusEqualsToken
                ? "tsc_value_add"
                : op === ts.SyntaxKind.MinusEqualsToken
                    ? "tsc_value_sub"
                    : op === ts.SyntaxKind.AsteriskEqualsToken
                        ? "tsc_value_mul"
                        : op === ts.SyntaxKind.SlashEqualsToken
                            ? "tsc_value_div"
                            : op === ts.SyntaxKind.PercentEqualsToken
                                ? "tsc_value_mod"
                                : null;

        if (op !== ts.SyntaxKind.EqualsToken && !compoundFn) return null;

        return this.emitSequencedExpr(T_VALUE, specs, (values) => {
            const obj = values[0]!;
            const keyC = keyExpr
                ? values[1]!
                : `tsc_str_from_lit("${escapeCString(literalKey!)}", ${utf8ByteLen(literalKey!)})`;
            const value = values[keyExpr ? 2 : 1]!;
            const out = this.freshTemp("_dynassign");
            if (indexAssignment) {
                if (op === ts.SyntaxKind.EqualsToken) {
                    return `({ tsc_value_t ${out} = ${value}; tsc_value_set_index(${obj}, ${keyC}, ${out}); ${out}; })`;
                }
                return `({ tsc_value_t ${out} = ${compoundFn}(tsc_value_get_index(${obj}, ${keyC}), ${value}); tsc_value_set_index(${obj}, ${keyC}, ${out}); ${out}; })`;
            }
            if (op === ts.SyntaxKind.EqualsToken) {
                return `({ tsc_value_t ${out} = ${value}; tsc_value_set_prop(${obj}, ${keyC}, ${out}); ${out}; })`;
            }
            return `({ tsc_value_t ${out} = ${compoundFn}(tsc_value_get_prop(${obj}, ${keyC}), ${value}); tsc_value_set_prop(${obj}, ${keyC}, ${out}); ${out}; })`;
        });
    }

    private storageType(expr: ts.Expression): CType {
        if (ts.isIdentifier(expr)) {
            return this.identifierDeclaredType(expr) ?? this.prepareType(mapType(expr, this.checker));
        }
        return this.prepareType(mapType(expr, this.checker));
    }

    private emitLvalue(expr: ts.Expression): string {
        if (ts.isIdentifier(expr)) return this.identifierRead(expr);
        if (ts.isPropertyAccessExpression(expr)) {
            // Static class field: MyClass.field
            if (ts.isIdentifier(expr.name)) {
                const nsName = this.namespaceMemberName(expr.name);
                if (nsName) return nsName;
            }
            if (ts.isIdentifier(expr.expression)) {
                const sym = this.checker.getSymbolAtLocation(expr.expression);
                const cd = sym
                    ?.getDeclarations()
                    ?.find(ts.isClassDeclaration);
                if (cd && cd.name) {
                    const field = cd.members.find(
                        (m) =>
                            ts.isPropertyDeclaration(m) &&
                            m.name &&
                            ts.isIdentifier(m.name) &&
                            m.name.text === expr.name.text &&
                            isStatic(m),
                    );
                    if (field) {
                        return `${cd.name.text}_${mangleIdent(expr.name.text)}`;
                    }
                }
            }
            const recv = this.emitExpr(expr.expression);
            if (recv.ty.kind === "class") {
                return `${recv.c}->${mangleIdent(expr.name.text)}`;
            }
            unsupported(expr, `lvalue on ${recv.ty.c}`);
        }
        if (ts.isElementAccessExpression(expr)) {
            const recv = this.emitExpr(expr.expression);
            const idx = this.emitExpr(expr.argumentExpression);
            if (recv.ty.kind === "buffer") {
                requireNumber(expr.argumentExpression, idx.ty);
                return `TSC_BUF(${recv.c}, (size_t)(${idx.c}))`;
            }
            if (recv.ty.kind !== "array") {
                unsupported(expr, `index assignment on ${recv.ty.c}`);
            }
            requireNumber(expr.argumentExpression, idx.ty);
            const et = recv.ty.elem!;
            return `TSC_ARR(${et.c}, ${recv.c}, (size_t)(${idx.c}))`;
        }
        unsupported(expr, `lvalue kind ${ts.SyntaxKind[expr.kind]}`);
    }

    private emitEquality(
        bin: ts.BinaryExpression,
        left: EmitResult,
        right: EmitResult,
        negate: boolean,
    ): EmitResult {
        if (left.ty.kind === "value" || right.ty.kind === "value") {
            const r = this.emitDynamicBinary("tsc_value_eq", T_BOOLEAN, bin, left, right);
            return { c: negate ? `(!${r.c})` : r.c, ty: T_BOOLEAN };
        }
        if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
            const c = `tsc_bigint_eq(${left.c}, ${right.c})`;
            return { c: negate ? `(!${c})` : `(${c})`, ty: T_BOOLEAN };
        }
        if (left.ty.kind === "string" && right.ty.kind === "string") {
            const c = `tsc_str_eq(${left.c}, ${right.c})`;
            return { c: negate ? `(!${c})` : `(${c})`, ty: T_BOOLEAN };
        }
        if (left.ty.kind === right.ty.kind && left.ty.kind !== "unsupported") {
            const op = negate ? "!=" : "==";
            return { c: `(${left.c} ${op} ${right.c})`, ty: T_BOOLEAN };
        }
        // Compare pointer-valued types (array, class, map, set, regexp, string) to null.
        const pointerKinds: readonly CType["kind"][] = [
            "string", "bigint", "symbol", "array", "class", "map", "set", "weakmap", "weakset", "weakref", "regexp", "hash", "url", "buffer", "function",
        ];
        const leftIsNull = left.ty.kind === "void";
        const rightIsNull = right.ty.kind === "void";
        const leftIsPtr = pointerKinds.includes(left.ty.kind);
        const rightIsPtr = pointerKinds.includes(right.ty.kind);
        if ((leftIsPtr && rightIsNull) || (leftIsNull && rightIsPtr)) {
            const op = negate ? "!=" : "==";
            const ptrSide = leftIsPtr ? left.c : right.c;
            return { c: `(${ptrSide} ${op} NULL)`, ty: T_BOOLEAN };
        }
        unsupported(bin, `cross-type equality ${left.ty.c} vs ${right.ty.c}`);
    }

    private emitRelational(
        bin: ts.BinaryExpression,
        left: EmitResult,
        right: EmitResult,
        op: ts.SyntaxKind,
    ): EmitResult {
        const cop =
            op === ts.SyntaxKind.LessThanToken
                ? "<"
                : op === ts.SyntaxKind.LessThanEqualsToken
                    ? "<="
                    : op === ts.SyntaxKind.GreaterThanToken
                        ? ">"
                        : ">=";
        if (left.ty.kind === "value" || right.ty.kind === "value") {
            const tv = this.freshTemp("_cmp");
            return this.emitSequencedExpr(
                T_BOOLEAN,
                [
                    { value: left, target: T_VALUE, node: bin.left },
                    { value: right, target: T_VALUE, node: bin.right },
                ],
                ([lc, rc]) => `({ int ${tv} = tsc_value_cmp(${lc}, ${rc}); ${tv} != 2 && ${tv} ${cop} 0; })`,
            );
        }
        if (left.ty.kind === "number" && right.ty.kind === "number") {
            return { c: `(${left.c} ${cop} ${right.c})`, ty: T_BOOLEAN };
        }
        if (left.ty.kind === "string" && right.ty.kind === "string") {
            return {
                c: `(tsc_str_cmp(${left.c}, ${right.c}) ${cop} 0)`,
                ty: T_BOOLEAN,
            };
        }
        if (left.ty.kind === "bigint" && right.ty.kind === "bigint") {
            return {
                c: `(tsc_bigint_cmp(${left.c}, ${right.c}) ${cop} 0)`,
                ty: T_BOOLEAN,
            };
        }
        unsupported(bin, `relational ${cop} on ${left.ty.c} vs ${right.ty.c}`);
    }

    private emitDynamicBinary(
        callee: string,
        ret: CType,
        bin: ts.BinaryExpression,
        left: EmitResult,
        right: EmitResult,
    ): EmitResult {
        return this.emitSequencedCall(callee, ret, [
            { value: left, target: T_VALUE, node: bin.left },
            { value: right, target: T_VALUE, node: bin.right },
        ]);
    }

    private emitTernary(expr: ts.ConditionalExpression): EmitResult {
        const cond = this.emitBoolExpr(expr.condition);
        const whenT = this.emitExpr(expr.whenTrue);
        const whenF = this.emitExpr(expr.whenFalse);
        if (whenT.ty.kind !== whenF.ty.kind) {
            const boxable: readonly CType["kind"][] = ["number", "boolean", "string", "array", "void", "value"];
            if (boxable.includes(whenT.ty.kind) && boxable.includes(whenF.ty.kind)) {
                return {
                    c: `(${cond} ? ${this.coerce(whenT, T_VALUE, expr.whenTrue)} : ${this.coerce(whenF, T_VALUE, expr.whenFalse)})`,
                    ty: T_VALUE,
                };
            }
            unsupported(
                expr,
                `ternary branches have different types (${whenT.ty.c} vs ${whenF.ty.c})`,
            );
        }
        return { c: `(${cond} ? ${whenT.c} : ${whenF.c})`, ty: whenT.ty };
    }

    private emitSequencedExpr(
        ret: CType,
        specs: readonly SequencedCallArg[],
        build: (args: string[]) => string,
    ): EmitResult {
        const pieces: string[] = [];
        const args: string[] = [];
        for (const spec of specs) {
            const target = spec.stringify ? T_STRING : (spec.target ?? spec.value.ty);
            const node = spec.node ?? this.currentSf!;
            const init = spec.stringify
                ? this.coerceToString(spec.value, node)
                : spec.target
                    ? this.coerce(spec.value, spec.target, node)
                    : spec.value.c;
            const tmp = this.freshTemp("_arg");
            pieces.push(`${target.c} ${tmp} = ${init}`);
            args.push(spec.pass ? spec.pass(tmp) : tmp);
        }
        const expr = build(args);
        if (pieces.length === 0) return { c: expr, ty: ret };
        return { c: `({ ${pieces.join("; ")}; ${expr}; })`, ty: ret };
    }

    private emitSequencedCall(
        callee: string,
        ret: CType,
        specs: readonly SequencedCallArg[],
        fixedArgs: readonly string[] = [],
    ): EmitResult {
        return this.emitSequencedExpr(ret, specs, (args) =>
            `${callee}(${[...fixedArgs, ...args].join(", ")})`,
        );
    }

    private emitCall(call: ts.CallExpression): EmitResult {
        // super(args) inside a subclass ctor -> Base_init((Base*)self, args)
        if (call.expression.kind === ts.SyntaxKind.SuperKeyword) {
            if (!this.currentBaseClass) {
                unsupported(call, "super() outside a subclass constructor");
            }
            const base = this.currentBaseClass;
            const specs: SequencedCallArg[] = [];
            // Resolve base's signature from the class decl.
            const sig = this.checker.getResolvedSignature(call);
            if (!sig) unsupported(call, "unresolved super signature");
            specs.push(...this.callSpecsFromSignature(call, call.arguments, sig.getParameters()));
            return this.emitSequencedCall(`${base}_init`, T_VOID, specs, [`(${base}_t*)self`]);
        }

        if (ts.isPropertyAccessExpression(call.expression)) {
            return this.emitMethodCall(call, call.expression);
        }
        if (!ts.isIdentifier(call.expression)) {
            const callee = this.emitExpr(call.expression);
            if (callee.ty.kind === "function") {
                return this.emitClosureCall(call, callee);
            }
            unsupported(call, `call target kind ${ts.SyntaxKind[call.expression.kind]}`);
        }
        const name = call.expression.text;
        if (name === "parseInt" || name === "parseFloat") {
            return this.emitParseNumber(call, name);
        }
        if (name === "BigInt") {
            return this.emitBigIntConstructor(call);
        }
        if (name === "Symbol") {
            return this.emitSymbolConstructor(call);
        }
        if (name === "isNaN") {
            if (call.arguments.length !== 1) unsupported(call, "isNaN expects 1 arg");
            const r = this.emitExpr(call.arguments[0]!);
            requireNumber(call.arguments[0]!, r.ty);
            return { c: `(isnan(${r.c}))`, ty: T_BOOLEAN };
        }
        if (name === "isFinite") {
            if (call.arguments.length !== 1) unsupported(call, "isFinite expects 1 arg");
            const r = this.emitExpr(call.arguments[0]!);
            requireNumber(call.arguments[0]!, r.ty);
            return { c: `(isfinite(${r.c}))`, ty: T_BOOLEAN };
        }

        if (!this.isDirectCallableIdentifier(call.expression)) {
            const callee = this.emitExpr(call.expression);
            if (callee.ty.kind === "function") {
                return this.emitClosureCall(call, callee);
            }
        }

        const fnName = this.identifierName(call.expression);
        const sig = this.checker.getResolvedSignature(call);
        if (!sig) unsupported(call, "unresolved call signature");
        const genericDecl = this.genericFunctionDeclaration(sig);
        if (genericDecl) {
            return this.emitGenericFunctionCall(call, genericDecl, sig);
        }
        const specs = this.callSpecsFromSignature(call, call.arguments, sig.getParameters());
        const retType = this.prepareType(mapTsType(call, sig.getReturnType(), this.checker));
        return this.emitSequencedCall(fnName, retType, specs);
    }

    private isDirectCallableIdentifier(id: ts.Identifier): boolean {
        const sym = this.symbolForIdentifier(id);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (decl && ts.isFunctionDeclaration(decl)) return true;
        if (decl && ts.isVariableDeclaration(decl)) {
            return this.isTopLevelLiftedArrowDeclaration(decl);
        }
        return false;
    }

    private isDirectFunctionReferenceValue(id: ts.Identifier): boolean {
        return this.isDirectCallableIdentifier(id);
    }

    private isTopLevelLiftedArrowDeclaration(decl: ts.VariableDeclaration): boolean {
        if (
            !decl.initializer ||
            (!ts.isArrowFunction(decl.initializer) && !ts.isFunctionExpression(decl.initializer))
        ) {
            return false;
        }
        if (!ts.isVariableStatement(decl.parent.parent)) return false;
        return this.isTopLevelValueDeclaration(decl);
    }

    private emitClosureCall(call: ts.CallExpression, callee: EmitResult): EmitResult {
        if (callee.ty.kind !== "function" || !callee.ty.ret) {
            unsupported(call.expression, "call target is not a function value");
        }
        const params = callee.ty.params ?? [];
        if (call.arguments.length !== params.length) {
            unsupported(
                call,
                `function value expects ${params.length} args, got ${call.arguments.length}`,
            );
        }
        const specs: SequencedCallArg[] = [{ value: callee, target: callee.ty, node: call.expression }];
        for (let i = 0; i < call.arguments.length; i++) {
            const arg = call.arguments[i]!;
            if (ts.isSpreadElement(arg)) unsupported(arg, "spread call into function value");
            specs.push({
                value: this.emitExpr(arg),
                target: params[i]!,
                node: arg,
            });
        }
        const ret = this.prepareType(callee.ty.ret);
        return this.emitSequencedExpr(ret, specs, (vals) => {
            const fn = vals[0]!;
            const args = vals.slice(1);
            return `${fn}->fn(${[`${fn}->env`, ...args].join(", ")})`;
        });
    }

    private emitFunctionReferenceClosure(id: ts.Identifier, type: CType): EmitResult {
        if (type.kind !== "function") unsupported(id, "function reference type expected");
        this.prepareType(type);
        const adapter = this.ensureFunctionReferenceAdapter(id, type);
        const tmp = this.freshTemp("_fn");
        return {
            c:
                `({ ${type.c} ${tmp} = (${type.c})TSC_GC_MALLOC(sizeof(${type.closureName})); ` +
                `${tmp}->fn = ${adapter}; ${tmp}->env = NULL; ${tmp}; })`,
            ty: type,
        };
    }

    private ensureFunctionReferenceAdapter(id: ts.Identifier, type: CType): string {
        if (type.kind !== "function" || !type.ret) {
            unsupported(id, "function reference type expected");
        }
        let callee = this.identifierName(id);
        const genericDecl = this.genericFunctionDeclarationForIdentifier(id);
        if (genericDecl) {
            const bindings = this.genericBindingsForCallbackTypes(
                id,
                genericDecl,
                type.params ?? [],
                type.ret,
            );
            callee = this.ensureGenericSpecialization(genericDecl, bindings);
        }
        const key = `${callee}:${this.typeKey(type)}`;
        const existing = this.functionRefAdapters.get(key);
        if (existing) return existing;
        const name = `${callee}__fnref_${this.functionRefAdapters.size}`;
        this.functionRefAdapters.set(key, name);
        const ret = this.prepareType(type.ret);
        const params = type.params ?? [];
        const envParam = this.freshTemp("_envp");
        const paramDecls = params.map((p, i) => `${p.c} _p${i}`);
        this.protos.line(`${ret.c} ${name}(${["void* " + envParam, ...paramDecls].join(", ")});`);

        const buf = new CBuf();
        buf.open(`${ret.c} ${name}(${["void* " + envParam, ...paramDecls].join(", ")})`);
        buf.line(`(void)${envParam};`);
        const args = params.map((_, i) => `_p${i}`).join(", ");
        if (ret.kind === "void") {
            buf.line(`${callee}(${args});`);
            buf.line("return;");
        } else {
            buf.line(`return ${callee}(${args});`);
        }
        buf.close();
        buf.line();
        this.closureDefs.write(buf.toString());
        return name;
    }

    private genericFunctionDeclarationForIdentifier(id: ts.Identifier): ts.FunctionDeclaration | null {
        const sym = this.symbolForIdentifier(id);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (
            decl &&
            ts.isFunctionDeclaration(decl) &&
            decl.name &&
            this.isGenericFunction(decl)
        ) {
            return decl;
        }
        return null;
    }

    private emitClosureExpression(fn: ts.ArrowFunction | ts.FunctionExpression): EmitResult {
        const sig = this.checker.getSignatureFromDeclaration(fn);
        if (!sig) unsupported(fn, "could not resolve closure signature");
        const params = fn.parameters.map((p) => {
            if (!ts.isIdentifier(p.name)) unsupported(p, "closure parameter destructuring");
            if (p.questionToken) unsupported(p, "optional closure parameters");
            if (p.initializer) unsupported(p, "default closure parameters");
            return this.prepareType(mapType(p, this.checker));
        });
        const ret = this.prepareType(mapTsType(fn, sig.getReturnType(), this.checker));
        const type = this.prepareType(functionType(params, ret));
        const captures = this.collectClosureCaptures(fn);
        const implName = `tsc_closure_${this.closureCounter++}`;
        let envType: string | null = null;
        if (captures.length > 0) {
            envType = `${implName}_env_t`;
            this.structDecls.open(`typedef struct ${envType}`);
            for (const cap of captures) {
                this.structDecls.line(`${cap.type.c}* ${cap.field};`);
            }
            this.structDecls.close(` ${envType};`);
        }

        this.emitClosureImplementation(fn, implName, envType, captures, type);

        const tmp = this.freshTemp("_fn");
        const pieces = [
            `${type.c} ${tmp} = (${type.c})TSC_GC_MALLOC(sizeof(${type.closureName}))`,
            `${tmp}->fn = ${implName}`,
        ];
        if (envType) {
            const env = this.freshTemp("_env");
            pieces.push(`${envType}* ${env} = (${envType}*)TSC_GC_MALLOC(sizeof(${envType}))`);
            for (const cap of captures) {
                const ptr = this.capturePtrForSymbol(cap.symbol);
                if (!ptr) unsupported(fn, `cannot capture ${cap.symbol.getName()}`);
                pieces.push(`${env}->${cap.field} = ${ptr}`);
            }
            pieces.push(`${tmp}->env = ${env}`);
        } else {
            pieces.push(`${tmp}->env = NULL`);
        }
        pieces.push(tmp);
        return { c: `({ ${pieces.join("; ")}; })`, ty: type };
    }

    private emitClosureImplementation(
        fn: ts.ArrowFunction | ts.FunctionExpression,
        implName: string,
        envType: string | null,
        captures: readonly ClosureCapture[],
        type: CType,
    ): void {
        if (type.kind !== "function" || !type.ret) {
            unsupported(fn, "closure implementation needs a function type");
        }
        const ret = this.prepareType(type.ret);
        const envParam = this.freshTemp("_envp");
        const paramDecls = fn.parameters.map((p, i) => {
            if (!ts.isIdentifier(p.name)) unsupported(p, "closure parameter destructuring");
            const pt = type.params?.[i] ?? this.prepareType(mapType(p, this.checker));
            return `${pt.c} ${mangleIdent(p.name.text)}`;
        });
        const signature = `${ret.c} ${implName}(${["void* " + envParam, ...paramDecls].join(", ")})`;
        this.protos.line(signature + ";");

        const body = new CBuf();
        body.open(signature);
        const envBindings = new Map<ts.Symbol, ClosureEnvBinding>();
        if (envType) {
            const envLocal = this.freshTemp("_env");
            body.line(`${envType}* ${envLocal} = (${envType}*)${envParam};`);
            for (const cap of captures) {
                envBindings.set(cap.symbol, {
                    type: cap.type,
                    ptr: `${envLocal}->${cap.field}`,
                });
            }
        } else {
            body.line(`(void)${envParam};`);
        }

        const capturedCells = this.capturedCellsFor(fn);
        this.returnStack.push(ret);
        this.cellScopes.push(capturedCells);
        this.closureEnvScopes.push(envBindings);
        this.emitCapturedParameterCells(body, fn.parameters, capturedCells);
        try {
            if (ts.isBlock(fn.body)) {
                for (const s of fn.body.statements) this.emitStmt(body, s);
            } else {
                const r = this.emitExpr(fn.body);
                if (ret.kind === "void") {
                    body.line(`(void)(${r.c});`);
                    body.line("return;");
                } else {
                    body.line(`return ${this.coerce(r, ret, fn.body)};`);
                }
            }
        } finally {
            this.closureEnvScopes.pop();
            this.cellScopes.pop();
            this.returnStack.pop();
        }
        body.close();
        body.line();
        this.closureDefs.write(body.toString());
    }

    private genericFunctionDeclaration(
        sig: ts.Signature,
    ): ts.FunctionDeclaration | null {
        const decl = sig.getDeclaration();
        if (
            decl &&
            ts.isFunctionDeclaration(decl) &&
            decl.name &&
            this.isGenericFunction(decl)
        ) {
            return decl;
        }
        return null;
    }

    private genericMethodDeclaration(
        sig: ts.Signature,
    ): ts.MethodDeclaration | null {
        const decl = sig.getDeclaration();
        if (
            decl &&
            ts.isMethodDeclaration(decl) &&
            this.isGenericMethod(decl)
        ) {
            return decl;
        }
        return null;
    }

    private emitGenericFunctionCall(
        call: ts.CallExpression,
        fd: ts.FunctionDeclaration,
        sig: ts.Signature,
    ): EmitResult {
        const bindings = this.genericBindingsForCall(call, fd, sig);
        const name = this.ensureGenericSpecialization(fd, bindings);
        const specs = this.callSpecsFromSignature(call, call.arguments, sig.getParameters());
        const retType = mapTsType(call, sig.getReturnType(), this.checker);
        return this.emitSequencedCall(name, retType, specs);
    }

    private genericBindingsForCall(
        call: ts.CallExpression,
        fd: GenericCallableDeclaration,
        sig: ts.Signature,
    ): TypeBindings {
        const bindings: TypeBindings = new Map();
        const typeParams = fd.typeParameters ?? [];
        const explicitArgs = call.typeArguments ?? [];
        for (let i = 0; i < explicitArgs.length && i < typeParams.length; i++) {
            const paramName = typeParams[i]!.name.text;
            const concrete = mapTsType(
                explicitArgs[i]!,
                this.checker.getTypeFromTypeNode(explicitArgs[i]!),
                this.checker,
            );
            this.addTypeBinding(call, bindings, paramName, concrete);
        }

        const params = sig.getParameters();
        for (let i = 0; i < fd.parameters.length && i < params.length; i++) {
            const typeNode = fd.parameters[i]!.type;
            if (!typeNode) continue;
            const concrete = mapTsType(
                fd.parameters[i]!,
                this.checker.getTypeOfSymbolAtLocation(params[i]!, call),
                this.checker,
            );
            this.bindTypeNode(call, bindings, typeNode, concrete);
        }

        for (const tp of typeParams) {
            if (!bindings.has(tp.name.text)) {
                unsupported(
                    call,
                    `could not infer generic type parameter ${tp.name.text}`,
                );
            }
        }
        return bindings;
    }

    private genericBindingsForCallback(
        cb: ts.Expression,
        fd: ts.FunctionDeclaration,
        contextSig: ts.Signature,
    ): TypeBindings {
        const params = contextSig.getParameters().map((param) =>
            mapTsType(
                cb,
                this.checker.getTypeOfSymbolAtLocation(param, cb),
                this.checker,
            ),
        );
        const contextRet = contextSig.getReturnType();
        const ret = contextRet.flags & ts.TypeFlags.Void
            ? undefined
            : mapTsType(cb, contextRet, this.checker);
        return this.genericBindingsForCallbackTypes(cb, fd, params, ret);
    }

    private genericBindingsForCallbackTypes(
        cb: ts.Expression,
        fd: ts.FunctionDeclaration,
        paramTypes: readonly CType[],
        returnType?: CType,
    ): TypeBindings {
        const bindings: TypeBindings = new Map();
        for (let i = 0; i < fd.parameters.length && i < paramTypes.length; i++) {
            const typeNode = fd.parameters[i]!.type;
            if (!typeNode) continue;
            this.bindTypeNode(cb, bindings, typeNode, paramTypes[i]!);
        }

        if (fd.type && returnType) {
            this.bindTypeNode(cb, bindings, fd.type, returnType);
        }

        for (const tp of fd.typeParameters ?? []) {
            if (!bindings.has(tp.name.text)) {
                unsupported(
                    cb,
                    `could not infer generic callback type parameter ${tp.name.text}`,
                );
            }
        }
        return bindings;
    }

    private contextualCallSignature(
        cb: ts.Expression,
        label: string,
    ): ts.Signature {
        const contextType = this.checker.getContextualType(cb);
        const sig = contextType?.getCallSignatures()[0];
        if (!sig) unsupported(cb, `${label}: generic callback needs a contextual function type`);
        return sig;
    }

    private bindTypeNode(
        node: ts.Node,
        bindings: TypeBindings,
        typeNode: ts.TypeNode,
        concrete: CType,
    ): void {
        if (
            ts.isTypeReferenceNode(typeNode) &&
            ts.isIdentifier(typeNode.typeName) &&
            this.isTypeParameterName(typeNode.typeName)
        ) {
            this.addTypeBinding(node, bindings, typeNode.typeName.text, concrete);
            return;
        }

        if (ts.isArrayTypeNode(typeNode)) {
            if (concrete.kind === "array" && concrete.elem) {
                this.bindTypeNode(node, bindings, typeNode.elementType, concrete.elem);
            }
            return;
        }

        if (
            ts.isTypeReferenceNode(typeNode) &&
            ts.isIdentifier(typeNode.typeName) &&
            typeNode.typeArguments
        ) {
            const name = typeNode.typeName.text;
            const args = typeNode.typeArguments;
            if ((name === "Array" || name === "ReadonlyArray") && concrete.kind === "array" && concrete.elem) {
                this.bindTypeNode(node, bindings, args[0]!, concrete.elem);
                return;
            }
            if ((name === "Set" || name === "WeakSet" || name === "WeakRef") && concrete.elem) {
                this.bindTypeNode(node, bindings, args[0]!, concrete.elem);
                return;
            }
            if ((name === "Map" || name === "WeakMap") && concrete.key && concrete.elem) {
                this.bindTypeNode(node, bindings, args[0]!, concrete.key);
                this.bindTypeNode(node, bindings, args[1]!, concrete.elem);
                return;
            }
        }

        if (ts.isUnionTypeNode(typeNode)) {
            const parts = typeNode.types.filter(
                (t) =>
                    t.kind !== ts.SyntaxKind.NullKeyword &&
                    t.kind !== ts.SyntaxKind.UndefinedKeyword,
            );
            if (parts.length === 1) {
                this.bindTypeNode(node, bindings, parts[0]!, concrete);
            }
        }
    }

    private isTypeParameterName(id: ts.Identifier): boolean {
        const sym = this.checker.getSymbolAtLocation(id);
        return !!sym
            ?.getDeclarations()
            ?.some(ts.isTypeParameterDeclaration);
    }

    private addTypeBinding(
        node: ts.Node,
        bindings: TypeBindings,
        name: string,
        concrete: CType,
    ): void {
        const existing = bindings.get(name);
        if (existing && !sameCType(existing, concrete)) {
            unsupported(
                node,
                `generic type parameter ${name} inferred as both ${existing.c} and ${concrete.c}`,
            );
        }
        bindings.set(name, concrete);
    }

    private ensureGenericSpecialization(
        fd: ts.FunctionDeclaration,
        bindings: TypeBindings,
    ): string {
        if (!fd.name) unsupported(fd, "anonymous generic function");
        const baseName = this.declaredName(fd.name);
        const typeParams = fd.typeParameters ?? [];
        const typeKey = typeParams
            .map((tp) => `${tp.name.text}:${this.typeKey(bindings.get(tp.name.text)! )}`)
            .join(",");
        const key = `${fd.getSourceFile().fileName}:${fd.pos}:${baseName}<${typeKey}>`;
        const existing = this.genericSpecializations.get(key);
        if (existing) return existing;

        const name = `${baseName}__g${this.genericCounter++}`;
        this.genericSpecializations.set(key, name);
        this.emitGenericSpecializationBody(fd, name, bindings);
        return name;
    }

    private emitGenericSpecializationBody(
        fd: ts.FunctionDeclaration,
        name: string,
        bindings: TypeBindings,
    ): void {
        withTypeBindings(bindings, () => {
            const sig = this.checker.getSignatureFromDeclaration(fd);
            if (!sig) unsupported(fd, "could not resolve function signature");
            const returnType = mapTsType(fd, sig.getReturnType(), this.checker);
            const params = this.collectParams(fd.parameters);
            const signature =
                `${returnType.c} ${name}(` +
                (params.length ? params.join(", ") : "void") +
                `)`;
            this.protos.line(signature + ";");
            this.genericDefs.open(signature);
            this.returnStack.push(returnType);
            const tailCtx = fd.name
                ? {
                    name: this.declaredName(fd.name),
                    label: this.freshTemp("_tail"),
                    params: this.collectParamInfos(fd.parameters),
                }
                : null;
            if (tailCtx) {
                this.tailFunctionStack.push(tailCtx);
                this.genericDefs.line(`${tailCtx.label}: ;`);
            }
            try {
                if (!fd.body) unsupported(fd, "function without body");
                for (const s of fd.body.statements) {
                    this.emitStmt(this.genericDefs, s);
                }
            } finally {
                if (tailCtx) this.tailFunctionStack.pop();
                this.returnStack.pop();
            }
            this.genericDefs.close();
            this.genericDefs.line();
        });
    }

    private ensureGenericMethodSpecialization(
        md: ts.MethodDeclaration,
        owningCls: string,
        bindings: TypeBindings,
    ): string {
        if (!ts.isIdentifier(md.name)) unsupported(md, "computed generic method names");
        const baseName = `${owningCls}_${mangleIdent(md.name.text)}`;
        const typeParams = md.typeParameters ?? [];
        const typeKey = typeParams
            .map((tp) => `${tp.name.text}:${this.typeKey(bindings.get(tp.name.text)! )}`)
            .join(",");
        const key = `${md.getSourceFile().fileName}:${md.pos}:${baseName}<${typeKey}>`;
        const existing = this.genericSpecializations.get(key);
        if (existing) return existing;

        const name = `${baseName}__g${this.genericCounter++}`;
        this.genericSpecializations.set(key, name);
        this.emitGenericMethodSpecializationBody(md, owningCls, name, bindings);
        return name;
    }

    private emitGenericMethodSpecializationBody(
        md: ts.MethodDeclaration,
        owningCls: string,
        name: string,
        bindings: TypeBindings,
    ): void {
        withTypeBindings(bindings, () => {
            const sig = this.checker.getSignatureFromDeclaration(md);
            if (!sig) unsupported(md, "could not resolve method signature");
            const returnType = mapTsType(md, sig.getReturnType(), this.checker);
            const params = isStatic(md)
                ? this.collectParams(md.parameters)
                : [`${owningCls}_t* self`, ...this.collectParams(md.parameters)];
            const signature =
                `${returnType.c} ${name}(` +
                (params.length ? params.join(", ") : "void") +
                `)`;
            this.protos.line(signature + ";");
            this.genericDefs.open(signature);
            if (!isStatic(md)) this.currentClass = owningCls;
            this.returnStack.push(returnType);
            try {
                if (!md.body) unsupported(md, "method without body");
                for (const s of md.body.statements) this.emitStmt(this.genericDefs, s);
            } finally {
                this.returnStack.pop();
                this.currentClass = null;
            }
            this.genericDefs.close();
            this.genericDefs.line();
        });
    }

    private typeKey(type: CType): string {
        switch (type.kind) {
            case "array":
            case "set":
            case "weakset":
            case "weakref":
            case "entry":
                return `${type.kind}_${type.elem ? this.typeKey(type.elem) : "void"}`;
            case "map":
            case "weakmap":
                return `${type.kind}_${type.key ? this.typeKey(type.key) : "void"}_${type.elem ? this.typeKey(type.elem) : "void"}`;
            case "class":
                return `class_${type.className ?? type.c}`;
            case "function":
                return `function_${type.params?.map((p) => this.typeKey(p)).join("_") || "void"}_to_${type.ret ? this.typeKey(type.ret) : "void"}`;
            default:
                return type.kind;
        }
    }

    private callSpecsFromSignature(
        call: ts.CallExpression,
        args: readonly ts.Expression[],
        params: readonly ts.Symbol[],
    ): SequencedCallArg[] {
        const paramDecls = params.map((p) => p.valueDeclaration);
        const restIndex = paramDecls.findIndex(
            (decl) => decl && ts.isParameter(decl) && !!decl.dotDotDotToken,
        );
        if (restIndex < 0) {
            const specs: SequencedCallArg[] = [];
            for (let i = 0; i < args.length; i++) {
                const argExpr = args[i]!;
                if (ts.isSpreadElement(argExpr)) {
                    unsupported(argExpr, "spread arguments require a rest parameter target");
                }
                const r = this.emitExpr(argExpr);
                const paramDecl = paramDecls[i];
                let paramType: CType;
                const param = params[i];
                if (paramDecl && ts.isParameter(paramDecl) && param) {
                    paramType = this.prepareType(mapTsType(
                        paramDecl,
                        this.checker.getTypeOfSymbolAtLocation(param, call),
                        this.checker,
                    ));
                } else {
                    paramType = r.ty;
                }
                specs.push({ value: r, target: paramType, node: argExpr });
            }
            return specs;
        }

        const specs: SequencedCallArg[] = [];
        for (let i = 0; i < restIndex; i++) {
            const argExpr = args[i];
            if (!argExpr) unsupported(call, "missing argument before rest parameter");
            if (ts.isSpreadElement(argExpr)) {
                unsupported(argExpr, "spread argument before rest parameter");
            }
            const r = this.emitExpr(argExpr);
            const paramDecl = paramDecls[i];
            let paramType = r.ty;
            const param = params[i];
            if (paramDecl && ts.isParameter(paramDecl) && param) {
                paramType = this.prepareType(mapTsType(
                    paramDecl,
                    this.checker.getTypeOfSymbolAtLocation(param, call),
                    this.checker,
                ));
            }
            specs.push({ value: r, target: paramType, node: argExpr });
        }

        const restDecl = paramDecls[restIndex];
        if (!restDecl || !ts.isParameter(restDecl)) {
            unsupported(call, "rest parameter declaration not found");
        }
        const restParam = params[restIndex];
        const restType = this.prepareType(restParam
            ? mapTsType(
                restDecl,
                this.checker.getTypeOfSymbolAtLocation(restParam, call),
                this.checker,
            )
            : mapType(restDecl, this.checker));
        if (restType.kind !== "array" || !restType.elem) {
            unsupported(restDecl, "rest parameter must have an array type");
        }
        const restArgs = args.slice(restIndex);
        specs.push({
            value: {
                c: this.restArgumentArray(restArgs, restType.elem),
                ty: restType,
            },
            target: restType,
            node: restArgs[0],
        });
        return specs;
    }

    private restArgumentArray(
        args: readonly ts.Expression[],
        elemType: CType,
    ): string {
        const av = this.freshTemp("_rest");
        const steps = [
            `tsc_array_t* ${av} = tsc_array_new(sizeof(${elemType.c}), ${Math.max(1, args.length)})`,
        ];
        for (const arg of args) {
            if (ts.isSpreadElement(arg)) {
                const r = this.emitExpr(arg.expression);
                if (r.ty.kind !== "array" || !r.ty.elem) {
                    unsupported(arg.expression, "spread argument must be an array");
                }
                const sv = this.freshTemp("_spread");
                const iv = this.freshTemp("_si");
                const vv = this.freshTemp("_sv");
                const item: EmitResult = {
                    c: `TSC_ARR(${r.ty.elem.c}, ${sv}, ${iv})`,
                    ty: r.ty.elem,
                };
                steps.push(`tsc_array_t* ${sv} = ${r.c}`);
                steps.push(
                    `for (size_t ${iv} = 0; ${iv} < ${sv}->len; ${iv}++) { ${elemType.c} ${vv} = ${this.coerce(item, elemType, arg.expression)}; tsc_array_push_raw(${av}, &${vv}); }`,
                );
            } else {
                const r = this.emitExpr(arg);
                const vv = this.freshTemp("_rv");
                steps.push(`${elemType.c} ${vv} = ${this.coerce(r, elemType, arg)}`);
                steps.push(`tsc_array_push_raw(${av}, &${vv})`);
            }
        }
        steps.push(av);
        return `({ ${steps.join("; ")}; })`;
    }

    private emitMethodCall(
        call: ts.CallExpression,
        pa: ts.PropertyAccessExpression,
    ): EmitResult {
        const memberName = pa.name.text;
        const recvExpr = pa.expression;

        if (ts.isIdentifier(pa.name)) {
            const nsName = this.namespaceMemberName(pa.name);
            if (nsName) {
                const sig = this.checker.getResolvedSignature(call);
                if (!sig) unsupported(call, "unresolved namespace function");
                const specs = this.callSpecsFromSignature(
                    call,
                    call.arguments,
                    sig.getParameters(),
                );
                const retType = mapTsType(call, sig.getReturnType(), this.checker);
                return this.emitSequencedCall(nsName, retType, specs);
            }
        }

        // Static class method: MyClass.foo()
        if (ts.isIdentifier(recvExpr)) {
            const sym = this.checker.getSymbolAtLocation(recvExpr);
            const classDecl = sym
                ?.getDeclarations()
                ?.find(ts.isClassDeclaration);
            if (classDecl && classDecl.name) {
                const method = classDecl.members.find(
                    (m) =>
                        ts.isMethodDeclaration(m) &&
                        m.name &&
                        ts.isIdentifier(m.name) &&
                        m.name.text === memberName &&
                        isStatic(m),
                );
                if (method) {
                    const sig = this.checker.getResolvedSignature(call);
                    if (!sig) unsupported(call, "unresolved static method");
                    const genericMethod = this.genericMethodDeclaration(sig);
                    const genericBindings = genericMethod
                        ? this.genericBindingsForCall(call, genericMethod, sig)
                        : null;
                    const ret = genericBindings
                        ? withTypeBindings(genericBindings, () =>
                            mapTsType(call, sig.getReturnType(), this.checker),
                        )
                        : mapTsType(
                            call,
                            sig.getReturnType(),
                            this.checker,
                        );
                    const specs = this.callSpecsFromSignature(
                        call,
                        call.arguments,
                        sig.getParameters(),
                    );
                    const callee = genericMethod && genericBindings
                        ? this.ensureGenericMethodSpecialization(
                            genericMethod,
                            classDecl.name.text,
                            genericBindings,
                        )
                        : `${classDecl.name.text}_${mangleIdent(memberName)}`;
                    return this.emitSequencedCall(
                        callee,
                        ret,
                        specs,
                    );
                }
            }
        }

        if (
            ts.isIdentifier(recvExpr) &&
            recvExpr.text === "console" &&
            (memberName === "log" ||
                memberName === "error" ||
                memberName === "warn" ||
                memberName === "info")
        ) {
            return this.emitConsole(call, memberName);
        }
        if (
            ts.isIdentifier(recvExpr) &&
            recvExpr.text === "process" &&
            memberName === "exit"
        ) {
            return this.emitProcessExit(call);
        }
        if (
            ts.isIdentifier(recvExpr) &&
            recvExpr.text === "process" &&
            memberName === "cwd"
        ) {
            return { c: `tsc_process_cwd()`, ty: T_STRING };
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Math") {
            return this.emitMathCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "fs") {
            return this.emitFsCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "path") {
            return this.emitPathCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "crypto") {
            return this.emitCryptoCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "JSON") {
            return this.emitJsonCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "os") {
            return this.emitOsCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Date") {
            if (memberName === "now") return { c: `tsc_date_now()`, ty: T_NUMBER };
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Number") {
            return this.emitNumberStatic(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "String") {
            return this.emitStringStatic(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Symbol") {
            return this.emitSymbolStatic(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Object") {
            return this.emitObjectCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Reflect") {
            return this.emitReflectCall(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Buffer") {
            return this.emitBufferStatic(call, memberName);
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Array" && memberName === "of") {
            const callType = this.prepareType(mapTsType(call, this.checker.getTypeAtLocation(call), this.checker));
            if (callType.kind !== "array") unsupported(call, "Array.of result must be an array");
            const et = callType.elem!;
            const av = this.freshTemp("_array_of");
            const pieces: string[] = [
                `tsc_array_t* ${av} = tsc_array_new(sizeof(${et.c}), ${Math.max(1, call.arguments.length)})`,
            ];
            for (const arg of call.arguments) {
                const value = this.emitExpr(arg);
                const tmp = this.freshTemp("_array_of_el");
                pieces.push(`${et.c} ${tmp} = ${this.coerce(value, et, arg)}`);
                pieces.push(`tsc_array_push_raw(${av}, &${tmp})`);
            }
            pieces.push(av);
            return { c: `({ ${pieces.join("; ")}; })`, ty: callType };
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Array" && memberName === "from") {
            // Array.from(arrayLike) — array copy for typed and dynamic arrays.
            const a = call.arguments[0];
            if (!a) unsupported(call, "Array.from needs an argument");
            const r = this.emitExpr(a);
            if (r.ty.kind === "value") {
                const missing: EmitResult = { c: "tsc_value_undefined()", ty: T_VALUE };
                return this.emitSequencedCall("tsc_value_method_slice", T_VALUE, [
                    { value: r, target: T_VALUE, node: a },
                    { value: missing, target: T_VALUE, node: a },
                    { value: missing, target: T_VALUE, node: a },
                ]);
            }
            if (r.ty.kind !== "array")
                unsupported(a, "Array.from on non-array");
            return {
                c: `tsc_array_slice(${r.c}, 0, (double)${r.c}->len)`,
                ty: r.ty,
            };
        }
        if (ts.isIdentifier(recvExpr) && recvExpr.text === "Array" && memberName === "isArray") {
            // Type-guard: in typed mode, we can answer statically.
            const a = call.arguments[0];
            if (!a) unsupported(call, "Array.isArray needs an argument");
            const r = this.emitExpr(a);
            if (r.ty.kind === "value") {
                return this.emitSequencedCall("tsc_value_is_array", T_BOOLEAN, [
                    { value: r, target: T_VALUE, node: a },
                ]);
            }
            return { c: r.ty.kind === "array" ? "true" : "false", ty: T_BOOLEAN };
        }

        const recv = this.emitExpr(recvExpr);
        if (recv.ty.kind === "array")
            return this.emitArrayMethod(call, recv, memberName);
        if (recv.ty.kind === "value")
            return this.emitDynamicMethod(call, recv, memberName);
        if (recv.ty.kind === "string")
            return this.emitStringMethod(call, recv, memberName);
        if (recv.ty.kind === "bigint")
            return this.emitBigIntMethod(call, recv, memberName);
        if (recv.ty.kind === "symbol")
            return this.emitSymbolMethod(call, recv, memberName);
        if (recv.ty.kind === "map")
            return this.emitMapMethod(call, recv, memberName);
        if (recv.ty.kind === "set")
            return this.emitSetMethod(call, recv, memberName);
        if (recv.ty.kind === "weakmap")
            return this.emitWeakMapMethod(call, recv, memberName);
        if (recv.ty.kind === "weakset")
            return this.emitWeakSetMethod(call, recv, memberName);
        if (recv.ty.kind === "weakref")
            return this.emitWeakRefMethod(call, recv, memberName);
        if (recv.ty.kind === "regexp")
            return this.emitRegexpMethod(call, recv, memberName);
        if (recv.ty.kind === "hash")
            return this.emitHashMethod(call, recv, memberName);
        if (recv.ty.kind === "buffer")
            return this.emitBufferMethod(call, recv, memberName);
        if (recv.ty.kind === "class")
            return this.emitClassMethodCall(call, recv, memberName);
        unsupported(call, `method .${memberName} on ${recv.ty.c}`);
    }

    private emitDynamicMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        const missing: EmitResult = { c: "tsc_value_undefined()", ty: T_VALUE };
        const oneArg = (callee: string, fallback: EmitResult = missing): EmitResult => {
            if (args.length > 1) unsupported(call, `${method} expects 0 or 1 arg`);
            const arg = args[0] ? this.emitExpr(args[0]) : fallback;
            return this.emitSequencedCall(callee, T_VALUE, [
                { value: recv, target: T_VALUE, node: call.expression },
                { value: arg, target: T_VALUE, node: args[0] ?? call.expression },
            ]);
        };
        switch (method) {
            case "charAt":
                return oneArg("tsc_value_method_char_at", { c: "tsc_value_num(0.0)", ty: T_VALUE });
            case "includes":
                if (args.length !== 1) unsupported(call, "includes expects 1 arg");
                return oneArg("tsc_value_method_includes");
            case "indexOf":
                if (args.length !== 1) unsupported(call, "indexOf expects 1 arg");
                return oneArg("tsc_value_method_index_of");
            case "lastIndexOf":
                if (args.length !== 1) unsupported(call, "lastIndexOf expects 1 arg");
                return oneArg("tsc_value_method_last_index_of");
            case "at":
                if (args.length !== 1) unsupported(call, "at expects 1 arg");
                return oneArg("tsc_value_method_at");
            case "hasOwnProperty":
                if (args.length !== 1) unsupported(call, "hasOwnProperty expects 1 arg");
                return this.emitSequencedCall("tsc_value_has_own_prop", T_BOOLEAN, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_STRING, node: args[0]! },
                ]);
            case "isPrototypeOf":
                if (args.length !== 1) unsupported(call, "isPrototypeOf expects 1 arg");
                return this.emitSequencedCall("tsc_value_is_prototype_of", T_BOOLEAN, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                ]);
            case "propertyIsEnumerable":
                if (args.length !== 1) unsupported(call, "propertyIsEnumerable expects 1 arg");
                return this.emitSequencedCall("tsc_value_property_is_enumerable", T_BOOLEAN, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_STRING, node: args[0]! },
                ]);
            case "localeCompare":
                if (args.length !== 1) unsupported(call, "localeCompare expects 1 arg");
                return oneArg("tsc_value_method_locale_compare");
            case "join":
                return oneArg("tsc_value_method_join");
            case "pop":
                if (args.length !== 0) unsupported(call, "pop expects no args");
                return this.emitSequencedCall("tsc_value_method_pop", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "push": {
                const specs: SequencedCallArg[] = [
                    { value: recv, target: T_VALUE, node: call.expression },
                ];
                for (const arg of args) specs.push({ value: this.emitExpr(arg), target: T_VALUE, node: arg });
                return this.emitSequencedExpr(T_VALUE, specs, ([target, ...values]) => {
                    const targetArg = target!;
                    const calls = values.map((value) => `tsc_value_method_push(${targetArg}, ${value})`);
                    const prefix = calls.length > 0 ? `${calls.join("; ")}; ` : "";
                    return `({ ${prefix}tsc_value_num(tsc_value_length(${targetArg})); })`;
                });
            }
            case "shift":
                if (args.length !== 0) unsupported(call, "shift expects no args");
                return this.emitSequencedCall("tsc_value_method_shift", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "unshift": {
                const specs: SequencedCallArg[] = [
                    { value: recv, target: T_VALUE, node: call.expression },
                ];
                for (const arg of args) specs.push({ value: this.emitExpr(arg), target: T_VALUE, node: arg });
                return this.emitSequencedExpr(T_VALUE, specs, ([target, ...values]) => {
                    const targetArg = target!;
                    const calls = values
                        .slice()
                        .reverse()
                        .map((value) => `tsc_value_method_unshift(${targetArg}, ${value})`);
                    const prefix = calls.length > 0 ? `${calls.join("; ")}; ` : "";
                    return `({ ${prefix}tsc_value_num(tsc_value_length(${targetArg})); })`;
                });
            }
            case "concat": {
                if (args.length === 0) {
                    return this.emitSequencedCall("tsc_value_method_slice", T_VALUE, [
                        { value: recv, target: T_VALUE, node: call.expression },
                        { value: missing, target: T_VALUE, node: call.expression },
                        { value: missing, target: T_VALUE, node: call.expression },
                    ]);
                }
                const specs: SequencedCallArg[] = [
                    { value: recv, target: T_VALUE, node: call.expression },
                ];
                for (const arg of args) specs.push({ value: this.emitExpr(arg), target: T_VALUE, node: arg });
                return this.emitSequencedExpr(T_VALUE, specs, ([target, ...values]) => {
                    const out = this.freshTemp("_concat");
                    const targetArg = target!;
                    const calls = values.map((value) => `${out} = tsc_value_method_concat(${out}, ${value})`);
                    return `({ tsc_value_t ${out} = ${targetArg}; ${calls.join("; ")}; ${out}; })`;
                });
            }
            case "flat": {
                if (args.length > 1) unsupported(call, "flat expects 0 or 1 arg");
                const depth = args[0] ? this.emitExpr(args[0]) : missing;
                return this.emitSequencedCall("tsc_value_method_flat", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: depth, target: T_VALUE, node: args[0] ?? call.expression },
                ]);
            }
            case "fill": {
                if (args.length < 1 || args.length > 3) unsupported(call, "fill expects 1-3 args");
                const start = args[1] ? this.emitExpr(args[1]) : missing;
                const end = args[2] ? this.emitExpr(args[2]) : missing;
                return this.emitSequencedCall("tsc_value_method_fill", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                    { value: start, target: T_VALUE, node: args[1] ?? call.expression },
                    { value: end, target: T_VALUE, node: args[2] ?? call.expression },
                ]);
            }
            case "copyWithin": {
                if (args.length < 2 || args.length > 3) unsupported(call, "copyWithin expects 2-3 args");
                const end = args[2] ? this.emitExpr(args[2]) : missing;
                return this.emitSequencedCall("tsc_value_method_copy_within", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                    { value: this.emitExpr(args[1]!), target: T_VALUE, node: args[1]! },
                    { value: end, target: T_VALUE, node: args[2] ?? call.expression },
                ]);
            }
            case "splice": {
                if (args.length === 0) {
                    const zero: EmitResult = { c: "tsc_value_num(0.0)", ty: T_VALUE };
                    const items: EmitResult = { c: "tsc_array_new(sizeof(tsc_value_t), 1)", ty: arrayType(T_VALUE) };
                    return this.emitSequencedCall("tsc_value_method_splice", T_VALUE, [
                        { value: recv, target: T_VALUE, node: call.expression },
                        { value: zero, target: T_VALUE, node: call.expression },
                        { value: zero, target: T_VALUE, node: call.expression },
                        { value: items, target: arrayType(T_VALUE), node: call.expression },
                    ]);
                }
                const start = this.emitExpr(args[0]!);
                const deleteCount = args[1] ? this.emitExpr(args[1]) : missing;
                const specs: SequencedCallArg[] = [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: start, target: T_VALUE, node: args[0]! },
                    { value: deleteCount, target: T_VALUE, node: args[1] ?? call.expression },
                ];
                for (const arg of args.slice(2)) {
                    specs.push({ value: this.emitExpr(arg), target: T_VALUE, node: arg });
                }
                return this.emitSequencedExpr(T_VALUE, specs, ([target, startArg, deleteArg, ...items]) => {
                    const av = this.freshTemp("_splice_items");
                    const pieces = [`tsc_array_t* ${av} = tsc_array_new(sizeof(tsc_value_t), ${items.length || 1})`];
                    for (const item of items) {
                        const tmp = this.freshTemp("_splice_item");
                        pieces.push(`tsc_value_t ${tmp} = ${item}`);
                        pieces.push(`tsc_array_push_raw(${av}, &${tmp})`);
                    }
                    pieces.push(`tsc_value_method_splice(${target}, ${startArg}, ${deleteArg}, ${av})`);
                    return `({ ${pieces.join("; ")}; })`;
                });
            }
            case "sort":
                if (args.length !== 0) unsupported(call, "dynamic sort currently supports the default no-comparator form");
                return this.emitSequencedCall("tsc_value_method_sort", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "toSorted":
                if (args.length !== 0) unsupported(call, "dynamic toSorted currently supports the default no-comparator form");
                return this.emitSequencedCall("tsc_value_method_to_sorted", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "with": {
                if (args.length !== 2) unsupported(call, "with expects 2 args");
                return this.emitSequencedCall("tsc_value_method_with", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                    { value: this.emitExpr(args[1]!), target: T_VALUE, node: args[1]! },
                ]);
            }
            case "toSpliced": {
                const zero: EmitResult = { c: "tsc_value_num(0.0)", ty: T_VALUE };
                const start = args[0] ? this.emitExpr(args[0]) : zero;
                const deleteCount = args[1] ? this.emitExpr(args[1]) : zero;
                const specs: SequencedCallArg[] = [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: start, target: T_VALUE, node: args[0] ?? call.expression },
                    { value: deleteCount, target: T_VALUE, node: args[1] ?? call.expression },
                ];
                for (const arg of args.slice(2)) {
                    specs.push({ value: this.emitExpr(arg), target: T_VALUE, node: arg });
                }
                return this.emitSequencedExpr(T_VALUE, specs, ([target, startArg, deleteArg, ...items]) => {
                    const av = this.freshTemp("_to_spliced_items");
                    const pieces = [`tsc_array_t* ${av} = tsc_array_new(sizeof(tsc_value_t), ${items.length || 1})`];
                    for (const item of items) {
                        const tmp = this.freshTemp("_to_spliced_item");
                        pieces.push(`tsc_value_t ${tmp} = ${item}`);
                        pieces.push(`tsc_array_push_raw(${av}, &${tmp})`);
                    }
                    pieces.push(`tsc_value_method_to_spliced(${target}, ${startArg}, ${deleteArg}, ${args.length}, ${av})`);
                    return `({ ${pieces.join("; ")}; })`;
                });
            }
            case "forEach":
                return this.emitDynamicArrayHof(call, recv, "forEach");
            case "map":
                return this.emitDynamicArrayHof(call, recv, "map");
            case "flatMap":
                return this.emitDynamicArrayHof(call, recv, "flatMap");
            case "filter":
                return this.emitDynamicArrayHof(call, recv, "filter");
            case "reduce":
                return this.emitDynamicArrayReduce(call, recv, "reduce");
            case "reduceRight":
                return this.emitDynamicArrayReduce(call, recv, "reduceRight");
            case "find":
                return this.emitDynamicArrayHof(call, recv, "find");
            case "findIndex":
                return this.emitDynamicArrayHof(call, recv, "findIndex");
            case "findLast":
                return this.emitDynamicArrayHof(call, recv, "findLast");
            case "findLastIndex":
                return this.emitDynamicArrayHof(call, recv, "findLastIndex");
            case "some":
                return this.emitDynamicArrayHof(call, recv, "some");
            case "every":
                return this.emitDynamicArrayHof(call, recv, "every");
            case "reverse":
                if (args.length !== 0) unsupported(call, "reverse expects no args");
                return this.emitSequencedCall("tsc_value_method_reverse", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "toReversed":
                if (args.length !== 0) unsupported(call, "toReversed expects no args");
                return this.emitSequencedCall("tsc_value_method_to_reversed", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "slice": {
                if (args.length > 2) unsupported(call, "slice expects 0-2 args");
                const start = args[0] ? this.emitExpr(args[0]) : missing;
                const end = args[1] ? this.emitExpr(args[1]) : missing;
                return this.emitSequencedCall("tsc_value_method_slice", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: start, target: T_VALUE, node: args[0] ?? call.expression },
                    { value: end, target: T_VALUE, node: args[1] ?? call.expression },
                ]);
            }
            case "substring": {
                if (args.length > 2) unsupported(call, "substring expects 0-2 args");
                const start = args[0] ? this.emitExpr(args[0]) : missing;
                const end = args[1] ? this.emitExpr(args[1]) : missing;
                return this.emitSequencedCall("tsc_value_method_substring", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: start, target: T_VALUE, node: args[0] ?? call.expression },
                    { value: end, target: T_VALUE, node: args[1] ?? call.expression },
                ]);
            }
            case "replace":
            case "replaceAll": {
                if (args.length !== 2) unsupported(call, `${method} expects 2 args`);
                const fn = method === "replace" ? "tsc_value_method_replace" : "tsc_value_method_replace_all";
                return this.emitSequencedCall(fn, T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                    { value: this.emitExpr(args[1]!), target: T_VALUE, node: args[1]! },
                ]);
            }
            case "split":
                if (args.length !== 1) unsupported(call, "split expects 1 arg");
                return this.emitSequencedCall("tsc_value_method_split", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                ]);
            case "startsWith":
                if (args.length !== 1) unsupported(call, "startsWith expects 1 arg");
                return oneArg("tsc_value_method_starts_with");
            case "endsWith":
                if (args.length !== 1) unsupported(call, "endsWith expects 1 arg");
                return oneArg("tsc_value_method_ends_with");
            case "toLowerCase":
                if (args.length !== 0) unsupported(call, "toLowerCase expects no args");
                return this.emitSequencedCall("tsc_value_method_to_lower", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "toUpperCase":
                if (args.length !== 0) unsupported(call, "toUpperCase expects no args");
                return this.emitSequencedCall("tsc_value_method_to_upper", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "normalize":
                if (args.length > 1) unsupported(call, "normalize expects 0 or 1 arg");
                return this.emitSequencedCall("tsc_value_method_normalize", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: args[0] ? this.emitExpr(args[0]) : missing, target: T_VALUE, node: args[0] ?? call.expression },
                ]);
            case "trim":
                if (args.length !== 0) unsupported(call, "trim expects no args");
                return this.emitSequencedCall("tsc_value_method_trim", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "trimStart":
                if (args.length !== 0) unsupported(call, "trimStart expects no args");
                return this.emitSequencedCall("tsc_value_method_trim_start", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "trimEnd":
                if (args.length !== 0) unsupported(call, "trimEnd expects no args");
                return this.emitSequencedCall("tsc_value_method_trim_end", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ]);
            case "repeat":
                if (args.length !== 1) unsupported(call, "repeat expects 1 arg");
                return this.emitSequencedCall("tsc_value_method_repeat", T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                ]);
            case "padStart":
            case "padEnd": {
                if (args.length < 1 || args.length > 2) unsupported(call, `${method} expects 1-2 args`);
                const fn = method === "padStart" ? "tsc_value_method_pad_start" : "tsc_value_method_pad_end";
                return this.emitSequencedCall(fn, T_VALUE, [
                    { value: recv, target: T_VALUE, node: call.expression },
                    { value: this.emitExpr(args[0]!), target: T_VALUE, node: args[0]! },
                    { value: args[1] ? this.emitExpr(args[1]) : missing, target: T_VALUE, node: args[1] ?? call.expression },
                ]);
            }
            case "toLocaleString":
            case "toString":
                if (args.length !== 0) unsupported(call, `${method} expects no args`);
                return this.emitSequencedExpr(T_STRING, [
                    { value: recv, target: T_VALUE, node: call.expression },
                ], ([v]) => `tsc_value_to_string(${v})`);
            case "valueOf":
                if (args.length !== 0) unsupported(call, "valueOf expects no args");
                return recv;
        }
        unsupported(call, `dynamic method .${method}`);
    }

    private emitDynamicArrayHof(
        call: ts.CallExpression,
        recv: EmitResult,
        method:
            | "forEach"
            | "map"
            | "flatMap"
            | "filter"
            | "find"
            | "findIndex"
            | "findLast"
            | "findLastIndex"
            | "some"
            | "every",
    ): EmitResult {
        const cb = call.arguments[0];
        if (!cb) unsupported(call, `${method}: missing callback`);
        if (call.arguments.length !== 1) unsupported(call, `${method} expects exactly one callback`);
        if (!ts.isArrowFunction(cb) && !ts.isFunctionExpression(cb)) {
            unsupported(cb, `dynamic ${method}: callback must be an inline arrow/function expression`);
        }
        const elemSlot = cb.parameters[0];
        if (!elemSlot || !ts.isIdentifier(elemSlot.name)) {
            unsupported(cb, `dynamic ${method}: callback needs an element parameter`);
        }
        const idxSlot = cb.parameters[1];
        if (idxSlot && !ts.isIdentifier(idxSlot.name)) {
            unsupported(idxSlot, `dynamic ${method}: index parameter must be an identifier`);
        }
        const idxName = idxSlot && ts.isIdentifier(idxSlot.name) ? idxSlot.name.text : null;
        if (ts.isBlock(cb.body)) {
            unsupported(cb, `dynamic ${method}: block-body callbacks are not supported yet`);
        }

        const body = this.emitExpr(cb.body);
        const av = this.freshTemp("_dynhof");
        const iv = this.freshTemp("_i");
        const dst = this.freshTemp("_dst");
        const elem = this.freshTemp("_el");
        const bindings: string[] = [
            `tsc_value_t ${elem} = TSC_ARR(tsc_value_t, ${av}, ${iv})`,
            `tsc_value_t ${mangleIdent(elemSlot.name.text)} = ${elem}`,
        ];
        if (idxName) {
            bindings.push(`double ${mangleIdent(idxName)} = (double)${iv}`);
        }
        if (method === "forEach") {
            return this.emitSequencedExpr(T_VOID, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; (void)(${body.c}); } (void)0; })`,
            );
        }
        if (method === "map") {
            const out = this.freshTemp("_mapped");
            const mapped = this.coerce(body, T_VALUE, cb.body);
            return this.emitSequencedExpr(T_VALUE, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); ` +
                `tsc_array_t* ${dst} = tsc_array_new(sizeof(tsc_value_t), ${av}->len ? ${av}->len : 1); ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; tsc_value_t ${out} = ${mapped}; tsc_array_push_raw(${dst}, &${out}); } ` +
                `tsc_value_array(${dst}); })`,
            );
        }
        if (method === "flatMap") {
            const out = this.freshTemp("_mapped");
            const mapped = this.coerce(body, T_VALUE, cb.body);
            return this.emitSequencedExpr(T_VALUE, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); ` +
                `tsc_array_t* ${dst} = tsc_array_new(sizeof(tsc_value_t), ${av}->len ? ${av}->len : 1); ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; tsc_value_t ${out} = ${mapped}; tsc_value_array_push_flat(${dst}, ${out}); } ` +
                `tsc_value_array(${dst}); })`,
            );
        }
        const cond = this.truthyC(body, cb.body);
        if (method === "some") {
            const result = this.freshTemp("_some");
            return this.emitSequencedExpr(T_BOOLEAN, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); bool ${result} = false; ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; if (${cond}) { ${result} = true; break; } } ${result}; })`,
            );
        }
        if (method === "every") {
            const result = this.freshTemp("_every");
            return this.emitSequencedExpr(T_BOOLEAN, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); bool ${result} = true; ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; if (!(${cond})) { ${result} = false; break; } } ${result}; })`,
            );
        }
        if (method === "find") {
            const result = this.freshTemp("_find");
            return this.emitSequencedExpr(T_VALUE, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); tsc_value_t ${result} = tsc_value_undefined(); ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; if (${cond}) { ${result} = ${elem}; break; } } ${result}; })`,
            );
        }
        if (method === "findIndex") {
            const result = this.freshTemp("_find_i");
            return this.emitSequencedExpr(T_NUMBER, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); double ${result} = -1.0; ` +
                `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                `{ ${bindings.join("; ")}; if (${cond}) { ${result} = (double)${iv}; break; } } ${result}; })`,
            );
        }
        if (method === "findLast") {
            const result = this.freshTemp("_find_last");
            return this.emitSequencedExpr(T_VALUE, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); tsc_value_t ${result} = tsc_value_undefined(); ` +
                `for (size_t ${iv} = ${av}->len; ${iv}-- > 0;) ` +
                `{ ${bindings.join("; ")}; if (${cond}) { ${result} = ${elem}; break; } } ${result}; })`,
            );
        }
        if (method === "findLastIndex") {
            const result = this.freshTemp("_find_last_i");
            return this.emitSequencedExpr(T_NUMBER, [
                { value: recv, target: T_VALUE, node: call.expression },
            ], ([value]) =>
                `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); double ${result} = -1.0; ` +
                `for (size_t ${iv} = ${av}->len; ${iv}-- > 0;) ` +
                `{ ${bindings.join("; ")}; if (${cond}) { ${result} = (double)${iv}; break; } } ${result}; })`,
            );
        }
        return this.emitSequencedExpr(T_VALUE, [
            { value: recv, target: T_VALUE, node: call.expression },
        ], ([value]) =>
            `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); ` +
            `tsc_array_t* ${dst} = tsc_array_new(sizeof(tsc_value_t), ${av}->len ? ${av}->len : 1); ` +
            `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
            `{ ${bindings.join("; ")}; if (${cond}) tsc_array_push_raw(${dst}, &${elem}); } ` +
            `tsc_value_array(${dst}); })`,
        );
    }

    private emitDynamicArrayReduce(call: ts.CallExpression, recv: EmitResult, method: "reduce" | "reduceRight"): EmitResult {
        const cb = call.arguments[0];
        const initArg = call.arguments[1];
        if (!cb || !initArg) unsupported(call, `dynamic ${method} currently expects callback and initial value`);
        if (call.arguments.length !== 2) unsupported(call, `dynamic ${method} expects exactly callback and initial value`);
        if (!ts.isArrowFunction(cb) && !ts.isFunctionExpression(cb)) {
            unsupported(cb, `dynamic ${method}: callback must be an inline arrow/function expression`);
        }
        const accSlot = cb.parameters[0];
        const elemSlot = cb.parameters[1];
        if (!accSlot || !ts.isIdentifier(accSlot.name)) {
            unsupported(cb, `dynamic ${method}: callback needs an accumulator parameter`);
        }
        if (!elemSlot || !ts.isIdentifier(elemSlot.name)) {
            unsupported(cb, `dynamic ${method}: callback needs an element parameter`);
        }
        const idxSlot = cb.parameters[2];
        if (idxSlot && !ts.isIdentifier(idxSlot.name)) {
            unsupported(idxSlot, `dynamic ${method}: index parameter must be an identifier`);
        }
        const idxName = idxSlot && ts.isIdentifier(idxSlot.name) ? idxSlot.name.text : null;
        if (ts.isBlock(cb.body)) {
            unsupported(cb, `dynamic ${method}: block-body callbacks are not supported yet`);
        }

        const body = this.emitExpr(cb.body);
        const init = this.emitExpr(initArg);
        const av = this.freshTemp("_dynred");
        const iv = this.freshTemp("_i");
        const acc = this.freshTemp("_acc");
        const elem = this.freshTemp("_el");
        const bindings: string[] = [
            `tsc_value_t ${mangleIdent(accSlot.name.text)} = ${acc}`,
            `tsc_value_t ${elem} = TSC_ARR(tsc_value_t, ${av}, ${iv})`,
            `tsc_value_t ${mangleIdent(elemSlot.name.text)} = ${elem}`,
        ];
        if (idxName) {
            bindings.push(`double ${mangleIdent(idxName)} = (double)${iv}`);
        }
        const reduced = this.coerce(body, T_VALUE, cb.body);
        return this.emitSequencedExpr(T_VALUE, [
            { value: recv, target: T_VALUE, node: call.expression },
            { value: init, target: T_VALUE, node: initArg },
        ], ([value, initial]) =>
            `({ tsc_array_t* const ${av} = tsc_value_as_array(${value}); ` +
            `tsc_value_t ${acc} = ${initial}; ` +
            (method === "reduce"
                ? `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) `
                : `for (size_t ${iv} = ${av}->len; ${iv}-- > 0;) `) +
            `{ ${bindings.join("; ")}; ${acc} = ${reduced}; } ${acc}; })`,
        );
    }

    private emitRegexpMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        switch (method) {
            case "test": {
                if (args.length !== 1) unsupported(call, "RegExp.test expects 1 arg");
                const s = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_regexp_test",
                    T_BOOLEAN,
                    [
                        { value: recv },
                        { value: s, target: T_STRING, node: args[0]! },
                    ],
                );
            }
        }
        unsupported(call, `RegExp method .${method}`);
    }

    private emitMapMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const k = recv.ty.key!;
        const v = recv.ty.elem!;
        const args = call.arguments;
        switch (method) {
            case "set": {
                const kv = this.emitExpr(args[0]!);
                const vv = this.emitExpr(args[1]!);
                const kc = this.coerce(kv, k, args[0]!);
                const vc = this.coerce(vv, v, args[1]!);
                const mt = this.freshTemp("_map");
                const kt = this.freshTemp("_mk");
                const vt = this.freshTemp("_mv");
                return {
                    c:
                        `({ tsc_map_t* const ${mt} = ${recv.c}; ${k.c} ${kt} = ${kc}; ${v.c} ${vt} = ${vc}; ` +
                        `tsc_map_set_raw(${mt}, &${kt}, &${vt}); ${mt}; })`,
                    ty: recv.ty,
                };
            }
            case "get": {
                const kv = this.emitExpr(args[0]!);
                const kc = this.coerce(kv, k, args[0]!);
                const mt = this.freshTemp("_map");
                const kt = this.freshTemp("_mk");
                const vt = this.freshTemp("_mv");
                return {
                    c:
                        `({ tsc_map_t* const ${mt} = ${recv.c}; ${k.c} ${kt} = ${kc}; ${v.c} ${vt} = (${v.c})0; ` +
                        `tsc_map_get_raw(${mt}, &${kt}, &${vt}); ${vt}; })`,
                    ty: v,
                };
            }
            case "has": {
                const kv = this.emitExpr(args[0]!);
                const kc = this.coerce(kv, k, args[0]!);
                const mt = this.freshTemp("_map");
                const kt = this.freshTemp("_mk");
                return {
                    c: `({ tsc_map_t* const ${mt} = ${recv.c}; ${k.c} ${kt} = ${kc}; tsc_map_has_raw(${mt}, &${kt}); })`,
                    ty: T_BOOLEAN,
                };
            }
            case "delete": {
                const kv = this.emitExpr(args[0]!);
                const kc = this.coerce(kv, k, args[0]!);
                const mt = this.freshTemp("_map");
                const kt = this.freshTemp("_mk");
                return {
                    c: `({ tsc_map_t* const ${mt} = ${recv.c}; ${k.c} ${kt} = ${kc}; tsc_map_delete_raw(${mt}, &${kt}); })`,
                    ty: T_BOOLEAN,
                };
            }
            case "clear":
                return { c: `(tsc_map_clear(${recv.c}), (void)0)`, ty: T_VOID };
            case "keys":
                return { c: `tsc_map_keys(${recv.c})`, ty: arrayType(k) };
            case "values":
                return { c: `tsc_map_values(${recv.c})`, ty: arrayType(v) };
            case "size":
                return { c: `tsc_map_size(${recv.c})`, ty: T_NUMBER };
        }
        unsupported(call, `Map method .${method}`);
    }

    private emitSetMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const e = recv.ty.elem!;
        const args = call.arguments;
        switch (method) {
            case "add": {
                const r = this.emitExpr(args[0]!);
                const c = this.coerce(r, e, args[0]!);
                const st = this.freshTemp("_set");
                const vt = this.freshTemp("_sv");
                return {
                    c: `({ tsc_set_t* const ${st} = ${recv.c}; ${e.c} ${vt} = ${c}; tsc_set_add_raw(${st}, &${vt}); ${st}; })`,
                    ty: recv.ty,
                };
            }
            case "has": {
                const r = this.emitExpr(args[0]!);
                const c = this.coerce(r, e, args[0]!);
                const st = this.freshTemp("_set");
                const vt = this.freshTemp("_sv");
                return {
                    c: `({ tsc_set_t* const ${st} = ${recv.c}; ${e.c} ${vt} = ${c}; tsc_set_has_raw(${st}, &${vt}); })`,
                    ty: T_BOOLEAN,
                };
            }
            case "delete": {
                const r = this.emitExpr(args[0]!);
                const c = this.coerce(r, e, args[0]!);
                const st = this.freshTemp("_set");
                const vt = this.freshTemp("_sv");
                return {
                    c: `({ tsc_set_t* const ${st} = ${recv.c}; ${e.c} ${vt} = ${c}; tsc_set_delete_raw(${st}, &${vt}); })`,
                    ty: T_BOOLEAN,
                };
            }
            case "clear":
                return { c: `(tsc_set_clear(${recv.c}), (void)0)`, ty: T_VOID };
            case "values":
                return { c: `tsc_set_values(${recv.c})`, ty: arrayType(e) };
            case "size":
                return { c: `tsc_set_size(${recv.c})`, ty: T_NUMBER };
        }
        unsupported(call, `Set method .${method}`);
    }

    private emitWeakMapMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        switch (method) {
            case "set":
            case "get":
            case "has":
            case "delete":
                return this.emitMapMethod(call, recv, method);
        }
        unsupported(call, `WeakMap method .${method}`);
    }

    private emitWeakSetMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        switch (method) {
            case "add":
            case "has":
            case "delete":
                return this.emitSetMethod(call, recv, method);
        }
        unsupported(call, `WeakSet method .${method}`);
    }

    private emitWeakRefMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        switch (method) {
            case "deref": {
                if (call.arguments.length !== 0) unsupported(call, "WeakRef.deref expects no args");
                const target = recv.ty.elem!;
                return this.emitSequencedExpr(target, [{ value: recv }], ([ref]) =>
                    `((${target.c})tsc_weakref_deref(${ref!}))`,
                );
            }
        }
        unsupported(call, `WeakRef method .${method}`);
    }

    private emitArrayMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const et = recv.ty.elem!;
        const args = call.arguments;
        switch (method) {
            case "push": {
                const av = this.freshTemp("_arr");
                const pieces: string[] = [`tsc_array_t* const ${av} = ${recv.c}`];
                for (let i = 0; i < args.length; i++) {
                    const r = this.emitExpr(args[i]!);
                    const coerced = this.coerce(r, et, args[i]!);
                    const vv = this.freshTemp("_pv");
                    pieces.push(`${et.c} ${vv} = ${coerced}`);
                    pieces.push(`tsc_array_push_raw(${av}, &${vv})`);
                }
                pieces.push(`tsc_array_length(${av})`);
                return { c: `({ ${pieces.join("; ")}; })`, ty: T_NUMBER };
            }
            case "pop": {
                const av = this.freshTemp("_arr");
                const rv = this.freshTemp("_pv");
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} ${rv} = ` +
                        `(${av}->len > 0 ? TSC_ARR(${et.c}, ${av}, ${av}->len - 1) : (${et.c})0); ` +
                        `tsc_array_pop_raw(${av}); ${rv}; })`,
                    ty: et,
                };
            }
            case "shift": {
                const av = this.freshTemp("_arr");
                const rv = this.freshTemp("_pv");
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} ${rv} = ` +
                        `(${av}->len > 0 ? TSC_ARR(${et.c}, ${av}, 0) : (${et.c})0); ` +
                        `tsc_array_shift_raw(${av}); ${rv}; })`,
                    ty: et,
                };
            }
            case "unshift": {
                const av = this.freshTemp("_arr");
                const pieces: string[] = [`tsc_array_t* const ${av} = ${recv.c}`];
                for (let i = args.length - 1; i >= 0; i--) {
                    const r = this.emitExpr(args[i]!);
                    const coerced = this.coerce(r, et, args[i]!);
                    const vv = this.freshTemp("_pv");
                    pieces.push(`${et.c} ${vv} = ${coerced}`);
                    pieces.push(`tsc_array_unshift_raw(${av}, &${vv})`);
                }
                pieces.push(`tsc_array_length(${av})`);
                return { c: `({ ${pieces.join("; ")}; })`, ty: T_NUMBER };
            }
            case "length":
                return { c: `tsc_array_length(${recv.c})`, ty: T_NUMBER };
            case "indexOf": {
                if (args.length !== 1) unsupported(call, "indexOf expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                const coerced = this.coerce(needle, et, args[0]!);
                const av = this.freshTemp("_arr");
                const iv = this.freshTemp("_i");
                const tv = this.freshTemp("_t");
                const eqExpr = et.kind === "string"
                    ? `tsc_str_eq(TSC_ARR(${et.c}, ${av}, ${iv}), ${tv})`
                    : `TSC_ARR(${et.c}, ${av}, ${iv}) == ${tv}`;
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} ${tv} = ${coerced}; ` +
                        `double _r = -1.0; for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ if (${eqExpr}) { _r = (double)${iv}; break; } } _r; })`,
                    ty: T_NUMBER,
                };
            }
            case "lastIndexOf": {
                if (args.length !== 1) unsupported(call, "lastIndexOf expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                const coerced = this.coerce(needle, et, args[0]!);
                const av = this.freshTemp("_arr");
                const iv = this.freshTemp("_i");
                const tv = this.freshTemp("_t");
                const eqExpr = et.kind === "string"
                    ? `tsc_str_eq(TSC_ARR(${et.c}, ${av}, ${iv}), ${tv})`
                    : `TSC_ARR(${et.c}, ${av}, ${iv}) == ${tv}`;
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} ${tv} = ${coerced}; ` +
                        `double _r = -1.0; size_t ${iv} = ${av}->len; while (${iv} > 0) ` +
                        `{ ${iv}--; if (${eqExpr}) { _r = (double)${iv}; break; } } _r; })`,
                    ty: T_NUMBER,
                };
            }
            case "includes": {
                if (args.length !== 1) unsupported(call, "includes expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                const coerced = this.coerce(needle, et, args[0]!);
                const av = this.freshTemp("_arr");
                const iv = this.freshTemp("_i");
                const tv = this.freshTemp("_t");
                const eqExpr = et.kind === "string"
                    ? `tsc_str_eq(TSC_ARR(${et.c}, ${av}, ${iv}), ${tv})`
                    : `TSC_ARR(${et.c}, ${av}, ${iv}) == ${tv}`;
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} ${tv} = ${coerced}; ` +
                        `bool _f = false; for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ if (${eqExpr}) { _f = true; break; } } _f; })`,
                    ty: T_BOOLEAN,
                };
            }
            case "at": {
                if (args.length !== 1) unsupported(call, "at expects 1 arg");
                const index = this.emitExpr(args[0]!);
                requireNumber(args[0]!, index.ty);
                return this.emitSequencedExpr(et, [
                    { value: recv },
                    { value: index, target: T_NUMBER, node: args[0]! },
                ], ([arr, idx]) => {
                    const av = this.freshTemp("_arr");
                    const nv = this.freshTemp("_at");
                    const rv = this.freshTemp("_atv");
                    return `({ tsc_array_t* const ${av} = ${arr}; double ${nv} = ${idx}; if (isnan(${nv})) ${nv} = 0.0; if (${nv} < 0) ${nv} = (double)${av}->len + ${nv}; ${et.c} ${rv} = (${et.c})0; if (!isinf(${nv}) && ${nv} >= 0 && ${nv} < (double)${av}->len) ${rv} = TSC_ARR(${et.c}, ${av}, (size_t)${nv}); ${rv}; })`;
                });
            }
            case "reverse": {
                return { c: `tsc_array_reverse(${recv.c})`, ty: recv.ty };
            }
            case "toReversed": {
                if (args.length !== 0) unsupported(call, "toReversed expects no args");
                return this.emitSequencedCall(
                    "tsc_array_to_reversed",
                    recv.ty,
                    [{ value: recv }],
                );
            }
            case "slice": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args[0]) {
                    const start = this.emitExpr(args[0]);
                    requireNumber(args[0], start.ty);
                    specs.push({ value: start, target: T_NUMBER, node: args[0] });
                }
                if (args[1]) {
                    const end = this.emitExpr(args[1]);
                    requireNumber(args[1], end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[1] });
                }
                return this.emitSequencedExpr(recv.ty, specs, (vals) => {
                    const arr = vals[0]!;
                    const start = vals[1] ?? "0";
                    const end = vals[2] ?? `(double)${arr}->len`;
                    return `tsc_array_slice(${arr}, ${start}, ${end})`;
                });
            }
            case "concat": {
                const pieces: string[] = [
                    `tsc_array_t* _dst = tsc_array_slice(${recv.c}, 0, (double)${recv.c}->len)`,
                ];
                for (const a of args) {
                    const r = this.emitExpr(a);
                    if (r.ty.kind !== "array") {
                        unsupported(a, "concat expects arrays (single-value form not supported)");
                    }
                    pieces.push(`tsc_array_append(_dst, ${r.c})`);
                }
                pieces.push(`_dst`);
                return { c: `({ ${pieces.join("; ")}; })`, ty: recv.ty };
            }
            case "join": {
                const sep = args[0]
                    ? this.coerceToString(this.emitExpr(args[0]), args[0])
                    : `tsc_str_from_lit(",", 1)`;
                const av = this.freshTemp("_arr");
                const iv = this.freshTemp("_i");
                const stringify = (exprC: string): string => {
                    if (et.kind === "string") return exprC;
                    if (et.kind === "number") return `tsc_str_from_num(${exprC})`;
                    if (et.kind === "boolean") return `tsc_str_from_bool(${exprC})`;
                    if (et.kind === "value") return `tsc_value_to_string(${exprC})`;
                    return `tsc_str_from_lit("[obj]", 5)`;
                };
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; tsc_str_t* _r = tsc_str_from_lit("", 0); ` +
                        `tsc_str_t* _s = ${sep}; for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ if (${iv} > 0) _r = tsc_str_concat(_r, _s); _r = tsc_str_concat(_r, ${stringify(`TSC_ARR(${et.c}, ${av}, ${iv})`)}); } _r; })`,
                    ty: T_STRING,
                };
            }
            case "sort":
                return this.emitArraySort(call, recv);
            case "toSorted": {
                const copy: EmitResult = {
                    c: `tsc_array_slice(${recv.c}, 0.0, (double)${recv.c}->len)`,
                    ty: recv.ty,
                };
                return this.emitArraySort(call, copy);
            }
            case "with": {
                if (args.length !== 2) unsupported(call, "with expects 2 args");
                const index = this.emitExpr(args[0]!);
                const value = this.emitExpr(args[1]!);
                requireNumber(args[0]!, index.ty);
                return this.emitSequencedExpr(recv.ty, [
                    { value: recv },
                    { value: index, target: T_NUMBER, node: args[0]! },
                    { value, target: et, node: args[1]! },
                ], (vals) => `tsc_array_with(${vals[0]}, ${vals[1]}, &(${et.c}){${vals[2]}})`);
            }
            case "toSpliced": {
                const zero: EmitResult = { c: "0.0", ty: T_NUMBER };
                const start = args[0] ? this.emitExpr(args[0]) : zero;
                const deleteCount = args[1] ? this.emitExpr(args[1]) : zero;
                if (args[0]) requireNumber(args[0], start.ty);
                if (args[1]) requireNumber(args[1], deleteCount.ty);
                const specs: SequencedCallArg[] = [
                    { value: recv },
                    { value: start, target: T_NUMBER, node: args[0] ?? call.expression },
                    { value: deleteCount, target: T_NUMBER, node: args[1] ?? call.expression },
                ];
                for (const arg of args.slice(2)) {
                    specs.push({ value: this.emitExpr(arg), target: et, node: arg });
                }
                return this.emitSequencedExpr(recv.ty, specs, ([target, startArg, deleteArg, ...items]) => {
                    const av = this.freshTemp("_to_spliced_items");
                    const pieces = [`tsc_array_t* ${av} = tsc_array_new(sizeof(${et.c}), ${items.length || 1})`];
                    for (const item of items) {
                        const tmp = this.freshTemp("_to_spliced_item");
                        pieces.push(`${et.c} ${tmp} = ${item}`);
                        pieces.push(`tsc_array_push_raw(${av}, &${tmp})`);
                    }
                    pieces.push(`tsc_array_to_spliced(${target}, ${startArg}, ${deleteArg}, ${args.length}, ${av})`);
                    return `({ ${pieces.join("; ")}; })`;
                });
            }
            case "fill": {
                if (args.length < 1 || args.length > 3) unsupported(call, "fill expects 1-3 args");
                const value = this.emitExpr(args[0]!);
                const specs: SequencedCallArg[] = [
                    { value: recv },
                    { value, target: et, node: args[0]! },
                ];
                if (args[1]) {
                    const start = this.emitExpr(args[1]);
                    requireNumber(args[1], start.ty);
                    specs.push({ value: start, target: T_NUMBER, node: args[1] });
                }
                if (args[2]) {
                    const end = this.emitExpr(args[2]);
                    requireNumber(args[2], end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[2] });
                }
                return this.emitSequencedExpr(recv.ty, specs, (vals) => {
                    const arr = vals[0]!;
                    const start = vals[2] ?? "0.0";
                    const end = vals[3] ?? `(double)${arr}->len`;
                    return `tsc_array_fill(${arr}, &(${et.c}){${vals[1]}}, ${start}, ${end})`;
                });
            }
            case "copyWithin": {
                if (args.length < 2 || args.length > 3) unsupported(call, "copyWithin expects 2-3 args");
                const target = this.emitExpr(args[0]!);
                const startExpr = this.emitExpr(args[1]!);
                requireNumber(args[0]!, target.ty);
                requireNumber(args[1]!, startExpr.ty);
                const specs: SequencedCallArg[] = [
                    { value: recv },
                    { value: target, target: T_NUMBER, node: args[0]! },
                    { value: startExpr, target: T_NUMBER, node: args[1]! },
                ];
                if (args[2]) {
                    const end = this.emitExpr(args[2]);
                    requireNumber(args[2], end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[2] });
                }
                return this.emitSequencedExpr(recv.ty, specs, (vals) => {
                    const arr = vals[0]!;
                    const end = vals[3] ?? `(double)${arr}->len`;
                    return `tsc_array_copy_within(${arr}, ${vals[1]}, ${vals[2]}, ${end})`;
                });
            }
            case "flat":
                return this.emitArrayFlat(call, recv);
            case "forEach":
                return this.emitArrayHof(call, recv, "forEach");
            case "map":
                return this.emitArrayHof(call, recv, "map");
            case "flatMap":
                return this.emitArrayHof(call, recv, "flatMap");
            case "filter":
                return this.emitArrayHof(call, recv, "filter");
            case "reduce":
                return this.emitArrayHof(call, recv, "reduce");
            case "reduceRight":
                return this.emitArrayHof(call, recv, "reduceRight");
            case "find":
                return this.emitArrayHof(call, recv, "find");
            case "findIndex":
                return this.emitArrayHof(call, recv, "findIndex");
            case "findLast":
                return this.emitArrayHof(call, recv, "findLast");
            case "findLastIndex":
                return this.emitArrayHof(call, recv, "findLastIndex");
            case "some":
                return this.emitArrayHof(call, recv, "some");
            case "every":
                return this.emitArrayHof(call, recv, "every");
        }
        unsupported(call, `array method .${method}`);
    }

    private emitArrayFlat(call: ts.CallExpression, recv: EmitResult): EmitResult {
        if (call.arguments.length > 1) unsupported(call, "flat expects 0 or 1 arg");
        const depth = call.arguments[0] ? this.constantFlatDepth(call.arguments[0]!) : 1;
        let currentC = depth === 0
            ? `tsc_array_slice(${recv.c}, 0, (double)${recv.c}->len)`
            : recv.c;
        let currentTy = recv.ty;
        if (depth === 0) return { c: currentC, ty: currentTy };

        for (let i = 0; i < depth; i++) {
            const elem = currentTy.elem!;
            if (elem.kind !== "array") {
                if (i === 0) {
                    currentC = `tsc_array_slice(${currentC}, 0, (double)${currentC}->len)`;
                }
                break;
            }
            const inner = elem.elem!;
            currentC = `tsc_array_flat_once(${currentC}, sizeof(${inner.c}))`;
            currentTy = arrayType(inner);
        }
        return { c: currentC, ty: currentTy };
    }

    private constantFlatDepth(expr: ts.Expression): number {
        if (ts.isNumericLiteral(expr)) {
            const n = Number(expr.text);
            if (Number.isInteger(n) && n >= 0) return n;
        }
        unsupported(expr, "flat depth must be a non-negative numeric literal");
    }

    /**
     * Higher-order array methods. Callback may be:
     *   • an inline arrow / function expression (captures handled via C lexical scope)
     *   • an Identifier resolving to a declared function OR a top-level
     *     const bound to a non-capturing arrow (which we've lifted to a
     *     static C function during module emission).
     */
    private emitArrayHof(
        call: ts.CallExpression,
        recv: EmitResult,
        method:
            | "forEach"
            | "map"
            | "flatMap"
            | "filter"
            | "reduce"
            | "reduceRight"
            | "find"
            | "findIndex"
            | "findLast"
            | "findLastIndex"
            | "some"
            | "every",
    ): EmitResult {
        const et = recv.ty.elem!;
        const args = call.arguments;
        const cb = args[0];
        if (!cb) unsupported(call, `${method}: missing callback`);
        const av = this.freshTemp("_a");
        const iv = this.freshTemp("_i");

        // Build a body-expression factory: given elem/idx/acc C expressions,
        // returns the C expression and C type of the callback's result.
        // Also yields any per-iteration bindings (local var decls) to emit.
        let callbackDetails: {
            bindings: string; // "type name = src; ..."
            bodyC: string;
            bodyType: CType;
        };

        if (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) {
            // Inline path.
            const arrowFn = cb;
            const paramBindings: { name: string; type: CType; src: string }[] = [];
            const isReduce = method === "reduce" || method === "reduceRight";
            const accParam = isReduce ? arrowFn.parameters[0] : undefined;
            const elemSlot = isReduce ? arrowFn.parameters[1] : arrowFn.parameters[0];
            const idxSlot = isReduce ? arrowFn.parameters[2] : arrowFn.parameters[1];
            if (isReduce) {
                if (!accParam || !ts.isIdentifier(accParam.name))
                    unsupported(arrowFn, `${method}: missing acc parameter`);
                if (!elemSlot || !ts.isIdentifier(elemSlot.name))
                    unsupported(arrowFn, `${method}: missing element parameter`);
            } else {
                if (!elemSlot || !ts.isIdentifier(elemSlot.name))
                    unsupported(arrowFn, `${method}: callback needs an element parameter`);
            }
            if (elemSlot && ts.isIdentifier(elemSlot.name)) {
                paramBindings.push({
                    name: mangleIdent(elemSlot.name.text),
                    type: et,
                    src: `TSC_ARR(${et.c}, ${av}, ${iv})`,
                });
            }
            if (idxSlot && ts.isIdentifier(idxSlot.name)) {
                paramBindings.push({
                    name: mangleIdent(idxSlot.name.text),
                    type: T_NUMBER,
                    src: `(double)${iv}`,
                });
            }
            if (ts.isBlock(arrowFn.body)) {
                unsupported(
                    arrowFn,
                    "block-body arrow in higher-order array method (use expression body)",
                );
            }
            const bodyR = this.emitExpr(arrowFn.body);
            const bindings = paramBindings
                .map((b) => `${b.type.c} ${b.name} = ${b.src};`)
                .join(" ");
            callbackDetails = { bindings, bodyC: bodyR.c, bodyType: bodyR.ty };
        } else if (ts.isIdentifier(cb)) {
            // Function reference: declared function OR lifted-arrow const.
            if (!this.isDirectCallableIdentifier(cb)) {
                const fn = this.emitExpr(cb);
                if (fn.ty.kind !== "function" || !fn.ty.ret) {
                    unsupported(cb, `${method}: callback must be callable`);
                }
                const params = fn.ty.params ?? [];
                const retType = this.prepareType(fn.ty.ret);
                const callArgs: string[] = [];
                if (method === "reduce" || method === "reduceRight") {
                    callArgs.push("_acc_rd");
                    if (params.length >= 2) callArgs.push(`TSC_ARR(${et.c}, ${av}, ${iv})`);
                    if (params.length >= 3) callArgs.push(`(double)${iv}`);
                } else {
                    if (params.length >= 1) callArgs.push(`TSC_ARR(${et.c}, ${av}, ${iv})`);
                    if (params.length >= 2) callArgs.push(`(double)${iv}`);
                }
                const fnv = this.freshTemp("_cb");
                callbackDetails = {
                    bindings: `${fn.ty.c} ${fnv} = ${fn.c};`,
                    bodyC: `${fnv}->fn(${[`${fnv}->env`, ...callArgs].join(", ")})`,
                    bodyType: retType,
                };
            } else {
                let fnName = this.identifierName(cb);
                const cbType = this.checker.getTypeAtLocation(cb);
                const sigs = cbType.getCallSignatures();
                if (sigs.length === 0)
                    unsupported(cb, `${method}: callback must be callable`);
                const sig = sigs[0]!;
                const genericDecl = this.genericFunctionDeclaration(sig);
                const genericBindings = genericDecl
                    ? this.genericBindingsForCallback(
                        cb,
                        genericDecl,
                        this.contextualCallSignature(cb, method),
                    )
                    : null;
                if (genericDecl && genericBindings) {
                    fnName = this.ensureGenericSpecialization(genericDecl, genericBindings);
                }
                const paramCount = sig.getParameters().length;
                const retType = this.prepareType(genericBindings
                    ? withTypeBindings(genericBindings, () =>
                        mapTsType(cb, sig.getReturnType(), this.checker),
                    )
                    : mapTsType(cb, sig.getReturnType(), this.checker));
                // For reduce/reduceRight, callback is (acc, elem, idx?) — skip idx and just call.
                const callArgs: string[] = [];
                if (method === "reduce" || method === "reduceRight") {
                    callArgs.push("_acc_rd");
                    if (paramCount >= 2) callArgs.push(`TSC_ARR(${et.c}, ${av}, ${iv})`);
                    if (paramCount >= 3) callArgs.push(`(double)${iv}`);
                } else {
                    if (paramCount >= 1) callArgs.push(`TSC_ARR(${et.c}, ${av}, ${iv})`);
                    if (paramCount >= 2) callArgs.push(`(double)${iv}`);
                }
                callbackDetails = {
                    bindings: "",
                    bodyC: `${fnName}(${callArgs.join(", ")})`,
                    bodyType: retType,
                };
            }
        } else {
            unsupported(
                cb,
                `${method}: callback must be inline arrow or function reference`,
            );
        }

        const { bindings, bodyC, bodyType } = callbackDetails;
        switch (method) {
            case "forEach":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${bindings} (void)(${bodyC}); } (void)0; })`,
                    ty: T_VOID,
                };
            case "map":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `tsc_array_t* _dst = tsc_array_new(sizeof(${bodyType.c}), ${av}->len); ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${bindings} ${bodyType.c} _r = ${bodyC}; ` +
                        `tsc_array_push_raw(_dst, &_r); } _dst; })`,
                    ty: arrayType(bodyType),
                };
            case "flatMap": {
                if (bodyType.kind !== "array")
                    unsupported(call, "flatMap callback must return an array");
                const inner = bodyType.elem!;
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `tsc_array_t* _dst = tsc_array_new(sizeof(${inner.c}), ${av}->len); ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${bindings} tsc_array_t* _r = ${bodyC}; ` +
                        `tsc_array_append(_dst, _r); } _dst; })`,
                    ty: arrayType(inner),
                };
            }
            case "filter":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `tsc_array_t* _dst = tsc_array_new(sizeof(${et.c}), ${av}->len); ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${et.c} _el = TSC_ARR(${et.c}, ${av}, ${iv}); ${bindings} ` +
                        `if (${bodyC}) tsc_array_push_raw(_dst, &_el); } _dst; })`,
                    ty: recv.ty,
                };
            case "reduce": {
                if (args.length < 2)
                    unsupported(call, "reduce requires an initial value");
                const initR = this.emitExpr(args[1]!);
                const accType = initR.ty;
                // For inline arrow: the acc binding is named by the arrow's first param.
                // For function ref: we use _acc_rd as the implicit acc name.
                let accName = "_acc_rd";
                if (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) {
                    const p0 = cb.parameters[0];
                    if (p0 && ts.isIdentifier(p0.name)) accName = mangleIdent(p0.name.text);
                }
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `${accType.c} ${accName} = ${initR.c}; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${bindings} ${accName} = ${bodyC.replaceAll("_acc_rd", accName)}; } ${accName}; })`,
                    ty: accType,
                };
            }
            case "reduceRight": {
                if (args.length < 2)
                    unsupported(call, "reduceRight requires an initial value");
                const initR = this.emitExpr(args[1]!);
                const accType = initR.ty;
                let accName = "_acc_rd";
                if (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) {
                    const p0 = cb.parameters[0];
                    if (p0 && ts.isIdentifier(p0.name)) accName = mangleIdent(p0.name.text);
                }
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                        `${accType.c} ${accName} = ${initR.c}; ` +
                        `for (size_t ${iv} = ${av}->len; ${iv}-- > 0;) ` +
                        `{ ${bindings} ${accName} = ${bodyC.replaceAll("_acc_rd", accName)}; } ${accName}; })`,
                    ty: accType,
                };
            }
            case "find":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} _r = (${et.c})0; bool _f = false; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len && !_f; ${iv}++) ` +
                        `{ ${bindings} if (${bodyC}) { _r = TSC_ARR(${et.c}, ${av}, ${iv}); _f = true; } } _r; })`,
                    ty: et,
                };
            case "findIndex":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; double _r = -1.0; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) ` +
                        `{ ${bindings} if (${bodyC}) { _r = (double)${iv}; break; } } _r; })`,
                    ty: T_NUMBER,
                };
            case "findLast":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; ${et.c} _r = (${et.c})0; bool _f = false; ` +
                        `for (size_t ${iv} = ${av}->len; ${iv}-- > 0 && !_f;) ` +
                        `{ ${bindings} if (${bodyC}) { _r = TSC_ARR(${et.c}, ${av}, ${iv}); _f = true; } } _r; })`,
                    ty: et,
                };
            case "findLastIndex":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; double _r = -1.0; ` +
                        `for (size_t ${iv} = ${av}->len; ${iv}-- > 0;) ` +
                        `{ ${bindings} if (${bodyC}) { _r = (double)${iv}; break; } } _r; })`,
                    ty: T_NUMBER,
                };
            case "some":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; bool _r = false; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len && !_r; ${iv}++) ` +
                        `{ ${bindings} if (${bodyC}) _r = true; } _r; })`,
                    ty: T_BOOLEAN,
                };
            case "every":
                return {
                    c:
                        `({ tsc_array_t* const ${av} = ${recv.c}; bool _r = true; ` +
                        `for (size_t ${iv} = 0; ${iv} < ${av}->len && _r; ${iv}++) ` +
                        `{ ${bindings} if (!(${bodyC})) _r = false; } _r; })`,
                    ty: T_BOOLEAN,
                };
        }
        unsupported(call, `unreachable hof ${method}`);
    }

    /**
     * In-place insertion sort. With no comparator, JS sorts by string conversion.
     * Comparator callback form:
     *   - Inline `(a, b) => expr` — body substituted, params named per user.
     *   - Function reference — called by name with two positional args.
     */
    private emitArraySort(call: ts.CallExpression, recv: EmitResult): EmitResult {
        const et = recv.ty.elem!;
        const cb = call.arguments[0];
        const av = this.freshTemp("_a");
        const iv = this.freshTemp("_i");
        const jv = this.freshTemp("_j");
        const kv = this.freshTemp("_k");
        let aName = "_sa";
        let bName = "_sb";
        let cmpExpr = "";
        if (!cb) {
            if (call.arguments.length !== 0)
                unsupported(call, "sort default form takes no arguments");
            cmpExpr = `tsc_str_cmp(${this.stringifyForDefaultSort(et, aName, call)}, ${this.stringifyForDefaultSort(et, bName, call)})`;
        } else if (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) {
            if (cb.parameters.length !== 2)
                unsupported(cb, "sort comparator needs 2 params");
            const p0 = cb.parameters[0]!.name;
            const p1 = cb.parameters[1]!.name;
            if (!ts.isIdentifier(p0) || !ts.isIdentifier(p1))
                unsupported(cb, "sort params must be identifiers");
            aName = mangleIdent(p0.text);
            bName = mangleIdent(p1.text);
            if (ts.isBlock(cb.body))
                unsupported(cb, "sort: block-body comparator (use expression body)");
            const r = this.emitExpr(cb.body);
            requireNumber(cb.body, r.ty);
            cmpExpr = r.c;
        } else if (ts.isIdentifier(cb)) {
            let fnName = this.identifierName(cb);
            const cbType = this.checker.getTypeAtLocation(cb);
            const sig = cbType.getCallSignatures()[0];
            if (!sig) unsupported(cb, "sort comparator must be callable");
            const genericDecl = this.genericFunctionDeclaration(sig);
            if (genericDecl) {
                const bindings = this.genericBindingsForCallbackTypes(cb, genericDecl, [et, et], T_NUMBER);
                fnName = this.ensureGenericSpecialization(genericDecl, bindings);
            }
            cmpExpr = `${fnName}(${aName}, ${bName})`;
        } else {
            unsupported(cb, "sort comparator must be inline arrow or function reference");
        }
        return {
            c:
                `({ tsc_array_t* const ${av} = ${recv.c}; ` +
                `for (size_t ${iv} = 1; ${iv} < ${av}->len; ${iv}++) { ` +
                `${et.c} ${kv} = TSC_ARR(${et.c}, ${av}, ${iv}); ` +
                `size_t ${jv} = ${iv}; ` +
                `while (${jv} > 0) { ` +
                `${et.c} ${aName} = TSC_ARR(${et.c}, ${av}, ${jv} - 1); ` +
                `${et.c} ${bName} = ${kv}; ` +
                `double _cmp = ${cmpExpr}; ` +
                `if (_cmp <= 0) break; ` +
                `TSC_ARR(${et.c}, ${av}, ${jv}) = TSC_ARR(${et.c}, ${av}, ${jv} - 1); ` +
                `${jv}--; } ` +
                `TSC_ARR(${et.c}, ${av}, ${jv}) = ${kv}; } ${av}; })`,
            ty: recv.ty,
        };
    }

    private stringifyForDefaultSort(ty: CType, exprC: string, node: ts.Node): string {
        if (ty.kind === "string") return exprC;
        if (ty.kind === "number") return `tsc_str_from_num(${exprC})`;
        if (ty.kind === "boolean") return `tsc_str_from_bool(${exprC})`;
        if (ty.kind === "array") return `tsc_str_from_lit("[array]", 7)`;
        if (ty.kind === "buffer") return `tsc_buffer_to_string(${exprC}, tsc_str_from_lit("utf8", 4))`;
        if (ty.kind === "class") {
            const s = `[object ${ty.className!}]`;
            return `tsc_str_from_lit("${escapeCString(s)}", ${utf8ByteLen(s)})`;
        }
        unsupported(node, `default sort cannot stringify ${ty.c}`);
    }

    /** Is this a module-scope `const/let name = arrowFn;` worth lifting to a static C function? */
    private getLiftableArrow(
        stmt: ts.Statement,
    ): { name: ts.Identifier; fn: ts.ArrowFunction | ts.FunctionExpression } | null {
        if (!ts.isVariableStatement(stmt)) return null;
        const decls = stmt.declarationList.declarations;
        if (decls.length !== 1) return null;
        const d = decls[0]!;
        if (!ts.isIdentifier(d.name)) return null;
        if (!d.initializer) return null;
        if (!ts.isArrowFunction(d.initializer) && !ts.isFunctionExpression(d.initializer))
            return null;
        return { name: d.name, fn: d.initializer };
    }

    private emitLiftedArrowPrototype(
        info: { name: ts.Identifier; fn: ts.ArrowFunction | ts.FunctionExpression },
    ): void {
        const sig = this.checker.getSignatureFromDeclaration(info.fn);
        if (!sig) unsupported(info.fn, "could not resolve lifted arrow signature");
        const ret = mapTsType(info.fn, sig.getReturnType(), this.checker);
        const params = this.collectParams(info.fn.parameters);
        const name = this.declaredName(info.name);
        this.protos.line(
            `${ret.c} ${name}(${params.length ? params.join(", ") : "void"});`,
        );
    }

    private emitLiftedArrowBody(
        info: { name: ts.Identifier; fn: ts.ArrowFunction | ts.FunctionExpression },
    ): void {
        const sig = this.checker.getSignatureFromDeclaration(info.fn);
        if (!sig) unsupported(info.fn, "could not resolve lifted arrow signature");
        const ret = mapTsType(info.fn, sig.getReturnType(), this.checker);
        const params = this.collectParams(info.fn.parameters);
        const name = this.declaredName(info.name);
        this.defs.open(
            `${ret.c} ${name}(${params.length ? params.join(", ") : "void"})`,
        );
        this.returnStack.push(ret);
        try {
            if (ts.isBlock(info.fn.body)) {
                for (const s of info.fn.body.statements) this.emitStmt(this.defs, s);
            } else {
                const r = this.emitExpr(info.fn.body);
                const coerced = this.coerce(r, ret, info.fn.body);
                this.defs.line(`return ${coerced};`);
            }
        } finally {
            this.returnStack.pop();
        }
        this.defs.close();
        this.defs.line();
    }

    private emitStringMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        switch (method) {
            case "codePointAt": {
                if (args.length !== 1) unsupported(call, "codePointAt expects 1 arg");
                const idx = this.emitExpr(args[0]!);
                requireNumber(args[0]!, idx.ty);
                return this.emitSequencedCall(
                    "tsc_str_code_point_at",
                    T_NUMBER,
                    [
                        { value: recv },
                        { value: idx, target: T_NUMBER, node: args[0]! },
                    ],
                );
            }
            case "charAt": {
                if (args.length !== 1) unsupported(call, "charAt expects 1 arg");
                const idx = this.emitExpr(args[0]!);
                requireNumber(args[0]!, idx.ty);
                return this.emitSequencedCall(
                    "tsc_str_char_at",
                    T_STRING,
                    [
                        { value: recv },
                        { value: idx, target: T_NUMBER, node: args[0]! },
                    ],
                );
            }
            case "at": {
                if (args.length !== 1) unsupported(call, "at expects 1 arg");
                const idx = this.emitExpr(args[0]!);
                requireNumber(args[0]!, idx.ty);
                return this.emitSequencedCall(
                    "tsc_str_at",
                    T_STRING,
                    [
                        { value: recv },
                        { value: idx, target: T_NUMBER, node: args[0]! },
                    ],
                );
            }
            case "includes": {
                if (args.length !== 1) unsupported(call, "includes expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_includes",
                    T_BOOLEAN,
                    [
                        { value: recv },
                        { value: needle, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "indexOf": {
                if (args.length !== 1) unsupported(call, "indexOf expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_index_of",
                    T_NUMBER,
                    [
                        { value: recv },
                        { value: needle, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "lastIndexOf": {
                if (args.length !== 1) unsupported(call, "lastIndexOf expects 1 arg");
                const needle = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_last_index_of",
                    T_NUMBER,
                    [
                        { value: recv },
                        { value: needle, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "localeCompare": {
                if (args.length !== 1) unsupported(call, "localeCompare expects 1 arg");
                const other = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_locale_compare",
                    T_NUMBER,
                    [
                        { value: recv },
                        { value: other, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "startsWith": {
                if (args.length !== 1) unsupported(call, "startsWith expects 1 arg");
                const p = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_starts_with",
                    T_BOOLEAN,
                    [
                        { value: recv },
                        { value: p, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "endsWith": {
                if (args.length !== 1) unsupported(call, "endsWith expects 1 arg");
                const p = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_str_ends_with",
                    T_BOOLEAN,
                    [
                        { value: recv },
                        { value: p, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "slice": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args.length >= 1) {
                    const start = this.emitExpr(args[0]!);
                    requireNumber(args[0]!, start.ty);
                    specs.push({ value: start, target: T_NUMBER, node: args[0]! });
                }
                if (args.length >= 2) {
                    const end = this.emitExpr(args[1]!);
                    requireNumber(args[1]!, end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[1]! });
                }
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const s = vals[0]!;
                    const start = vals[1] ?? "0";
                    const end = vals[2] ?? `(double)${s}->len`;
                    return `tsc_str_slice(${s}, ${start}, ${end})`;
                });
            }
            case "substring": {
                if (args.length < 1 || args.length > 2) unsupported(call, "substring expects 1-2 args");
                const start = this.emitExpr(args[0]!);
                requireNumber(args[0]!, start.ty);
                const specs: SequencedCallArg[] = [
                    { value: recv },
                    { value: start, target: T_NUMBER, node: args[0]! },
                ];
                if (args[1]) {
                    const end = this.emitExpr(args[1]);
                    requireNumber(args[1], end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[1] });
                }
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const s = vals[0]!;
                    const end = vals[2] ?? `(double)${s}->len`;
                    return `tsc_str_substring(${s}, ${vals[1]}, ${end})`;
                });
            }
            case "concat": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                for (const arg of args) {
                    specs.push({
                        value: this.emitExpr(arg),
                        target: T_STRING,
                        node: arg,
                    });
                }
                return this.emitSequencedExpr(T_STRING, specs, ([head, ...tail]) => {
                    let expr = head!;
                    for (const part of tail) {
                        expr = `tsc_str_concat(${expr}, ${part})`;
                    }
                    return expr;
                });
            }
            case "toUpperCase":
                return { c: `tsc_str_to_upper(${recv.c})`, ty: T_STRING };
            case "toLowerCase":
                return { c: `tsc_str_to_lower(${recv.c})`, ty: T_STRING };
            case "normalize": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args[0]) {
                    specs.push({
                        value: this.emitExpr(args[0]),
                        target: T_STRING,
                        node: args[0],
                    });
                }
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const form = vals[1] ?? `tsc_str_from_lit("NFC", 3)`;
                    return `tsc_str_normalize(${vals[0]}, ${form})`;
                });
            }
            case "trim":
                return { c: `tsc_str_trim(${recv.c})`, ty: T_STRING };
            case "trimStart":
                if (args.length !== 0) unsupported(call, "trimStart expects no args");
                return { c: `tsc_str_trim_start(${recv.c})`, ty: T_STRING };
            case "trimEnd":
                if (args.length !== 0) unsupported(call, "trimEnd expects no args");
                return { c: `tsc_str_trim_end(${recv.c})`, ty: T_STRING };
            case "repeat": {
                if (args.length !== 1) unsupported(call, "repeat expects 1 arg");
                const n = this.emitExpr(args[0]!);
                requireNumber(args[0]!, n.ty);
                return this.emitSequencedCall(
                    "tsc_str_repeat",
                    T_STRING,
                    [
                        { value: recv },
                        { value: n, target: T_NUMBER, node: args[0]! },
                    ],
                );
            }
            case "padStart":
            case "padEnd": {
                if (args.length < 1) unsupported(call, `${method} expects at least 1 arg`);
                const len = this.emitExpr(args[0]!);
                requireNumber(args[0]!, len.ty);
                const specs: SequencedCallArg[] = [
                    { value: recv },
                    { value: len, target: T_NUMBER, node: args[0]! },
                ];
                if (args[1]) {
                    specs.push({
                        value: this.emitExpr(args[1]),
                        target: T_STRING,
                        node: args[1],
                    });
                }
                const fn = method === "padStart" ? "tsc_str_pad_start" : "tsc_str_pad_end";
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const pad = vals[2] ?? `tsc_str_from_lit(" ", 1)`;
                    return `${fn}(${vals[0]}, ${vals[1]}, ${pad})`;
                });
            }
            case "replace": {
                if (args.length !== 2) unsupported(call, "replace expects 2 args");
                const s = this.emitExpr(args[0]!);
                const r = this.emitExpr(args[1]!);
                if (s.ty.kind === "regexp") {
                    return this.emitSequencedCall(
                        "tsc_str_replace_regex",
                        T_STRING,
                        [
                            { value: recv },
                            { value: s },
                            { value: r, target: T_STRING, node: args[1]! },
                        ],
                    );
                }
                if (s.ty.kind !== "string") {
                    unsupported(args[0]!, "string.replace: unsupported pattern type");
                }
                return this.emitSequencedCall(
                    "tsc_str_replace",
                    T_STRING,
                    [
                        { value: recv },
                        { value: s, target: T_STRING, node: args[0]! },
                        { value: r, target: T_STRING, node: args[1]! },
                    ],
                );
            }
            case "replaceAll": {
                if (args.length !== 2) unsupported(call, "replaceAll expects 2 args");
                const s = this.emitExpr(args[0]!);
                const r = this.emitExpr(args[1]!);
                if (s.ty.kind === "regexp") {
                    // Force global semantics for replaceAll even if /g isn't on the pattern.
                    // Simpler: just call tsc_str_replace_regex; works for /g regexes.
                    return this.emitSequencedCall(
                        "tsc_str_replace_regex",
                        T_STRING,
                        [
                            { value: recv },
                            { value: s },
                            { value: r, target: T_STRING, node: args[1]! },
                        ],
                    );
                }
                return this.emitSequencedCall(
                    "tsc_str_replace_all",
                    T_STRING,
                    [
                        { value: recv },
                        { value: s, target: T_STRING, node: args[0]! },
                        { value: r, target: T_STRING, node: args[1]! },
                    ],
                );
            }
            case "match": {
                if (args.length !== 1) unsupported(call, "match expects 1 arg");
                const re = this.emitExpr(args[0]!);
                if (re.ty.kind !== "regexp")
                    unsupported(args[0]!, "match requires a RegExp");
                return this.emitSequencedCall(
                    "tsc_str_match_regex",
                    arrayType(T_STRING),
                    [{ value: recv }, { value: re }],
                );
            }
            case "matchAll": {
                if (args.length !== 1) unsupported(call, "matchAll expects 1 arg");
                const re = this.emitExpr(args[0]!);
                if (re.ty.kind !== "regexp")
                    unsupported(args[0]!, "matchAll requires a RegExp");
                return this.emitSequencedCall(
                    "tsc_str_match_all_regex",
                    arrayType(arrayType(T_STRING)),
                    [{ value: recv }, { value: re }],
                );
            }
            case "split": {
                if (args.length !== 1) unsupported(call, "split expects 1 arg");
                const sep = this.emitExpr(args[0]!);
                if (sep.ty.kind === "regexp") {
                    return this.emitSequencedCall(
                        "tsc_str_split_regex",
                        arrayType(T_STRING),
                        [{ value: recv }, { value: sep }],
                    );
                }
                return this.emitSequencedCall(
                    "tsc_str_split",
                    arrayType(T_STRING),
                    [
                        { value: recv },
                        { value: sep, target: T_STRING, node: args[0]! },
                    ],
                );
            }
        }
        unsupported(call, `string method .${method} (Phase 2)`);
    }

    private emitStringStatic(call: ts.CallExpression, name: string): EmitResult {
        switch (name) {
            case "fromCharCode": {
                const specs = call.arguments.map((arg) => {
                    const r = this.emitExpr(arg);
                    requireNumber(arg, r.ty);
                    return { value: r, target: T_NUMBER, node: arg };
                });
                return this.emitSequencedCall(
                    "tsc_str_from_char_code_n",
                    T_STRING,
                    specs,
                    [call.arguments.length.toString()],
                );
            }
        }
        unsupported(call, `String.${name}`);
    }

    private emitSymbolConstructor(call: ts.CallExpression): EmitResult {
        if (call.arguments.length > 1) unsupported(call, "Symbol expects 0 or 1 args");
        const specs: SequencedCallArg[] = [];
        if (call.arguments[0]) {
            const desc = this.emitExpr(call.arguments[0]);
            specs.push({ value: desc, target: T_STRING, node: call.arguments[0] });
        }
        return this.emitSequencedExpr(T_SYMBOL, specs, (vals) =>
            `tsc_symbol_new(${vals[0] ?? "NULL"})`,
        );
    }

    private emitSymbolStatic(call: ts.CallExpression, name: string): EmitResult {
        switch (name) {
            case "for": {
                if (call.arguments.length !== 1) unsupported(call, "Symbol.for expects 1 arg");
                const key = this.emitExpr(call.arguments[0]!);
                return this.emitSequencedCall(
                    "tsc_symbol_for",
                    T_SYMBOL,
                    [{ value: key, target: T_STRING, node: call.arguments[0]! }],
                );
            }
            case "keyFor": {
                if (call.arguments.length !== 1) unsupported(call, "Symbol.keyFor expects 1 arg");
                const sym = this.emitExpr(call.arguments[0]!);
                return this.emitSequencedCall(
                    "tsc_symbol_key_for",
                    T_STRING,
                    [{ value: sym, target: T_SYMBOL, node: call.arguments[0]! }],
                );
            }
        }
        unsupported(call, `Symbol.${name}`);
    }

    private emitSymbolMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        switch (method) {
            case "toString": {
                if (call.arguments.length !== 0) unsupported(call, "Symbol.toString expects no args");
                return this.emitSequencedCall("tsc_symbol_to_string", T_STRING, [{ value: recv }]);
            }
        }
        unsupported(call, `Symbol method .${method}`);
    }

    private emitBigIntConstructor(call: ts.CallExpression): EmitResult {
        if (call.arguments.length !== 1) unsupported(call, "BigInt expects 1 arg");
        const arg = call.arguments[0]!;
        const r = this.emitExpr(arg);
        switch (r.ty.kind) {
            case "bigint":
                return r;
            case "string":
                return this.emitSequencedCall("tsc_bigint_from_str", T_BIGINT, [
                    { value: r, target: T_STRING, node: arg },
                ]);
            case "number":
                return this.emitSequencedCall("tsc_bigint_from_num", T_BIGINT, [
                    { value: r, target: T_NUMBER, node: arg },
                ]);
            case "boolean":
                return this.emitSequencedCall("tsc_bigint_from_bool", T_BIGINT, [
                    { value: r, target: T_BOOLEAN, node: arg },
                ]);
            default:
                unsupported(arg, `BigInt cannot convert ${r.ty.c}`);
        }
    }

    private emitBigIntMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        switch (method) {
            case "toString": {
                if (args.length > 1) unsupported(call, "BigInt.toString expects 0 or 1 args");
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args[0]) {
                    const radix = this.emitExpr(args[0]);
                    requireNumber(args[0], radix.ty);
                    specs.push({ value: radix, target: T_NUMBER, node: args[0] });
                }
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const radix = vals[1] ?? "10.0";
                    return `tsc_bigint_to_string(${vals[0]}, ${radix})`;
                });
            }
        }
        unsupported(call, `BigInt.${method}`);
    }

    private emitClassMethodCall(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const recvCls = recv.ty.className!;
        const sig = this.checker.getResolvedSignature(call);
        if (!sig) unsupported(call, "unresolved method signature");
        // If the method is inherited from a base class, use the base class's
        // name (not the receiver's) so we emit the defined function.
        let owningCls = recvCls;
        const mdecl = sig.getDeclaration();
        if (mdecl && mdecl.parent && ts.isClassDeclaration(mdecl.parent) && mdecl.parent.name) {
            owningCls = mdecl.parent.name.text;
        }
        const genericMethod = this.genericMethodDeclaration(sig);
        const erasedGenericClassMethod =
            !genericMethod &&
            mdecl &&
            ts.isMethodDeclaration(mdecl) &&
            mdecl.parent &&
            ts.isClassDeclaration(mdecl.parent) &&
            !!mdecl.parent.typeParameters?.length;
        const genericBindings = genericMethod
            ? this.genericBindingsForCall(call, genericMethod, sig)
            : null;
        const ret = erasedGenericClassMethod && ts.isMethodDeclaration(mdecl) && mdecl.type
            ? this.prepareType(mapTsType(mdecl.type, this.checker.getTypeFromTypeNode(mdecl.type), this.checker))
            : genericBindings
            ? withTypeBindings(genericBindings, () =>
                mapTsType(call, sig.getReturnType(), this.checker),
            )
            : mapTsType(call, sig.getReturnType(), this.checker);
        // Pass self cast to the owning-class type so the signature matches.
        const specs: SequencedCallArg[] = [
            {
                value: recv,
                pass: (tmp) => owningCls === recvCls ? tmp : `((${owningCls}_t*)${tmp})`,
            },
        ];
        if (erasedGenericClassMethod && ts.isMethodDeclaration(mdecl)) {
            for (let i = 0; i < call.arguments.length; i++) {
                const arg = call.arguments[i]!;
                if (ts.isSpreadElement(arg)) unsupported(arg, "spread call into generic class method");
                const param = mdecl.parameters[i];
                const r = this.emitExpr(arg);
                specs.push({
                    value: r,
                    target: param ? this.prepareType(mapType(param, this.checker)) : r.ty,
                    node: arg,
                });
            }
        } else {
            specs.push(...this.callSpecsFromSignature(call, call.arguments, sig.getParameters()));
        }
        const callee = genericMethod && genericBindings
            ? this.ensureGenericMethodSpecialization(genericMethod, owningCls, genericBindings)
            : `${owningCls}_${mangleIdent(method)}`;
        return this.emitSequencedCall(callee, ret, specs);
    }

    private emitMathCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        const one = (build: (x: string) => string): EmitResult => {
            if (args.length !== 1) unsupported(call, `Math.${name} expects 1 arg`);
            const r = this.emitExpr(args[0]!);
            requireNumber(args[0]!, r.ty);
            return this.emitSequencedExpr(
                T_NUMBER,
                [{ value: r, target: T_NUMBER, node: args[0]! }],
                ([x]) => build(x!),
            );
        };
        const two = (build: (a: string, b: string) => string): EmitResult => {
            if (args.length !== 2) unsupported(call, `Math.${name} expects 2 args`);
            const a = this.emitExpr(args[0]!);
            const b = this.emitExpr(args[1]!);
            requireNumber(args[0]!, a.ty);
            requireNumber(args[1]!, b.ty);
            return this.emitSequencedExpr(
                T_NUMBER,
                [
                    { value: a, target: T_NUMBER, node: args[0]! },
                    { value: b, target: T_NUMBER, node: args[1]! },
                ],
                ([x, y]) => build(x!, y!),
            );
        };
        switch (name) {
            case "floor": return one((x) => `floor(${x})`);
            case "ceil": return one((x) => `ceil(${x})`);
            case "round": return one((x) => `floor((${x}) + 0.5)`);
            case "abs": return one((x) => `fabs(${x})`);
            case "sqrt": return one((x) => `sqrt(${x})`);
            case "pow": return two((a, b) => `pow(${a}, ${b})`);
            case "min": {
                if (args.length === 0) return { c: `INFINITY`, ty: T_NUMBER };
                const specs = args.map((a) => {
                    const r = this.emitExpr(a);
                    requireNumber(a, r.ty);
                    return { value: r, target: T_NUMBER, node: a };
                });
                return this.emitSequencedExpr(T_NUMBER, specs, (vals) => {
                    let e = vals[0]!;
                    for (let i = 1; i < vals.length; i++) e = `fmin(${e}, ${vals[i]})`;
                    return e;
                });
            }
            case "max": {
                if (args.length === 0) return { c: `(-INFINITY)`, ty: T_NUMBER };
                const specs = args.map((a) => {
                    const r = this.emitExpr(a);
                    requireNumber(a, r.ty);
                    return { value: r, target: T_NUMBER, node: a };
                });
                return this.emitSequencedExpr(T_NUMBER, specs, (vals) => {
                    let e = vals[0]!;
                    for (let i = 1; i < vals.length; i++) e = `fmax(${e}, ${vals[i]})`;
                    return e;
                });
            }
            case "log": return one((x) => `log(${x})`);
            case "sin": return one((x) => `sin(${x})`);
            case "cos": return one((x) => `cos(${x})`);
            case "tan": return one((x) => `tan(${x})`);
            case "atan": return one((x) => `atan(${x})`);
            case "atan2": return two((a, b) => `atan2(${a}, ${b})`);
            case "exp": return one((x) => `exp(${x})`);
            case "random": return { c: `tsc_math_random()`, ty: T_NUMBER };
            case "trunc": return one((x) => `trunc(${x})`);
            case "sign": return one((x) => `(double)(${x} > 0 ? 1 : (${x} < 0 ? -1 : 0))`);
        }
        unsupported(call, `Math.${name}`);
    }

    private emitFsCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        switch (name) {
            case "readFileSync": {
                if (args.length < 1) unsupported(call, "fs.readFileSync needs a path");
                const p = this.emitExpr(args[0]!);
                return { c: `tsc_fs_read_file_sync(${p.c})`, ty: T_STRING };
            }
            case "writeFileSync": {
                if (args.length < 2)
                    unsupported(call, "fs.writeFileSync needs path + data");
                const p = this.emitExpr(args[0]!);
                const d = this.emitExpr(args[1]!);
                return this.emitSequencedCall(
                    "tsc_fs_write_file_sync",
                    T_VOID,
                    [
                        { value: p, target: T_STRING, node: args[0]! },
                        { value: d, target: T_STRING, node: args[1]! },
                    ],
                );
            }
            case "existsSync": {
                if (args.length !== 1) unsupported(call, "fs.existsSync needs path");
                const p = this.emitExpr(args[0]!);
                return { c: `tsc_fs_exists_sync(${p.c})`, ty: T_BOOLEAN };
            }
            case "readdirSync": {
                if (args.length !== 1) unsupported(call, "fs.readdirSync needs path");
                const p = this.emitExpr(args[0]!);
                return {
                    c: `tsc_fs_readdir_sync(${p.c})`,
                    ty: arrayType(T_STRING),
                };
            }
        }
        unsupported(call, `fs.${name} (Phase 10 sync subset only)`);
    }

    private emitPathCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        const specs = args.map((a) => {
            const r = this.emitExpr(a);
            return { value: r, target: T_STRING, node: a };
        });
        switch (name) {
            case "join":
            case "resolve": {
                const fn = name === "join" ? "tsc_path_join" : "tsc_path_resolve";
                return this.emitSequencedCall(fn, T_STRING, specs, [args.length.toString()]);
            }
            case "basename":
                return this.emitSequencedCall("tsc_path_basename", T_STRING, specs);
            case "dirname":
                return this.emitSequencedCall("tsc_path_dirname", T_STRING, specs);
            case "extname":
                return this.emitSequencedCall("tsc_path_extname", T_STRING, specs);
        }
        unsupported(call, `path.${name} (Phase 10 subset only)`);
    }

    private emitCryptoCall(call: ts.CallExpression, name: string): EmitResult {
        if (name === "createHash") {
            if (call.arguments.length !== 1)
                unsupported(call, "crypto.createHash expects 1 arg");
            const alg = this.emitExpr(call.arguments[0]!);
            return this.emitSequencedCall(
                "tsc_crypto_create_hash",
                T_HASH,
                [{ value: alg, target: T_STRING, node: call.arguments[0]! }],
            );
        }
        unsupported(call, `crypto.${name} (only createHash is supported)`);
    }

    private emitHashMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        switch (method) {
            case "update": {
                if (args.length !== 1) unsupported(call, "Hash.update expects 1 arg");
                const data = this.emitExpr(args[0]!);
                return this.emitSequencedCall(
                    "tsc_hash_update",
                    recv.ty,
                    [
                        { value: recv },
                        { value: data, target: T_STRING, node: args[0]! },
                    ],
                );
            }
            case "digest": {
                const encoding = args[0]
                    ? this.emitExpr(args[0])
                    : { c: `tsc_str_from_lit("hex", 3)`, ty: T_STRING };
                return this.emitSequencedCall(
                    "tsc_hash_digest",
                    T_STRING,
                    [
                        { value: recv },
                        { value: encoding, target: T_STRING, node: args[0] ?? call },
                    ],
                );
            }
        }
        unsupported(call, `Hash.${method} (only update/digest are supported)`);
    }

    private emitBufferStatic(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        switch (name) {
            case "from": {
                if (args.length < 1) unsupported(call, "Buffer.from expects input");
                const input = this.emitExpr(args[0]!);
                if (input.ty.kind === "string") {
                    const specs: SequencedCallArg[] = [{ value: input, target: T_STRING, node: args[0]! }];
                    if (args[1]) {
                        specs.push({
                            value: this.emitExpr(args[1]),
                            target: T_STRING,
                            node: args[1],
                        });
                    }
                    return this.emitSequencedExpr(T_BUFFER, specs, (vals) => {
                        const encoding = vals[1] ?? `tsc_str_from_lit("utf8", 4)`;
                        return `tsc_buffer_from_str(${vals[0]}, ${encoding})`;
                    });
                }
                if (input.ty.kind === "array" && input.ty.elem?.kind === "number") {
                    return this.emitSequencedCall(
                        "tsc_buffer_from_array",
                        T_BUFFER,
                        [{ value: input }],
                    );
                }
                unsupported(args[0]!, "Buffer.from supports string or number[]");
            }
            case "alloc": {
                if (args.length < 1) unsupported(call, "Buffer.alloc expects size");
                const size = this.emitExpr(args[0]!);
                requireNumber(args[0]!, size.ty);
                const specs: SequencedCallArg[] = [
                    { value: size, target: T_NUMBER, node: args[0]! },
                ];
                if (args[1]) {
                    const fill = this.emitExpr(args[1]);
                    requireNumber(args[1], fill.ty);
                    specs.push({ value: fill, target: T_NUMBER, node: args[1] });
                }
                return this.emitSequencedExpr(T_BUFFER, specs, (vals) => {
                    const fill = vals[1] ?? "0";
                    return `tsc_buffer_alloc(${vals[0]}, ${fill})`;
                });
            }
            case "concat": {
                if (args.length !== 1) unsupported(call, "Buffer.concat expects list");
                const list = this.emitExpr(args[0]!);
                if (list.ty.kind !== "array" || list.ty.elem?.kind !== "buffer") {
                    unsupported(args[0]!, "Buffer.concat expects Buffer[]");
                }
                return this.emitSequencedCall(
                    "tsc_buffer_concat",
                    T_BUFFER,
                    [{ value: list }],
                );
            }
            case "isBuffer": {
                if (args.length !== 1) unsupported(call, "Buffer.isBuffer expects value");
                const value = this.emitExpr(args[0]!);
                return { c: value.ty.kind === "buffer" ? "true" : "false", ty: T_BOOLEAN };
            }
        }
        unsupported(call, `Buffer.${name}`);
    }

    private emitBufferMethod(
        call: ts.CallExpression,
        recv: EmitResult,
        method: string,
    ): EmitResult {
        const args = call.arguments;
        switch (method) {
            case "toString": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args[0]) {
                    specs.push({
                        value: this.emitExpr(args[0]),
                        target: T_STRING,
                        node: args[0],
                    });
                }
                return this.emitSequencedExpr(T_STRING, specs, (vals) => {
                    const encoding = vals[1] ?? `tsc_str_from_lit("utf8", 4)`;
                    return `tsc_buffer_to_string(${vals[0]}, ${encoding})`;
                });
            }
            case "slice":
            case "subarray": {
                const specs: SequencedCallArg[] = [{ value: recv }];
                if (args[0]) {
                    const start = this.emitExpr(args[0]);
                    requireNumber(args[0], start.ty);
                    specs.push({ value: start, target: T_NUMBER, node: args[0] });
                }
                if (args[1]) {
                    const end = this.emitExpr(args[1]);
                    requireNumber(args[1], end.ty);
                    specs.push({ value: end, target: T_NUMBER, node: args[1] });
                }
                return this.emitSequencedExpr(T_BUFFER, specs, (vals) => {
                    const b = vals[0]!;
                    const start = vals[1] ?? "0";
                    const end = vals[2] ?? `(double)${b}->len`;
                    return `tsc_buffer_slice(${b}, ${start}, ${end})`;
                });
            }
            case "equals": {
                if (args.length !== 1) unsupported(call, "Buffer.equals expects other");
                const other = this.emitExpr(args[0]!);
                if (other.ty.kind !== "buffer") unsupported(args[0]!, "Buffer.equals expects Buffer");
                return this.emitSequencedCall(
                    "tsc_buffer_equals",
                    T_BOOLEAN,
                    [{ value: recv }, { value: other }],
                );
            }
        }
        unsupported(call, `Buffer method .${method}`);
    }

    private emitJsonCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        if (name === "stringify") {
            if (args.length < 1) unsupported(call, "JSON.stringify needs a value");
            const r = this.emitExpr(args[0]!);
            const tsType = this.checker.getTypeAtLocation(args[0]!);
            return {
                c: this.stringifyJsonValue(r.c, r.ty, tsType, args[0]!),
                ty: T_STRING,
            };
        }
        if (name === "parse") {
            if (args.length !== 1) unsupported(call, "JSON.parse expects 1 arg");
            const text = this.emitExpr(args[0]!);
            return this.emitSequencedCall(
                "tsc_json_parse",
                T_VALUE,
                [{ value: text, target: T_STRING, node: args[0]! }],
            );
        }
        unsupported(call, `JSON.${name}`);
    }

    private stringifyJsonValue(
        cExpr: string,
        ty: CType,
        tsType: ts.Type,
        node: ts.Node,
    ): string {
        switch (ty.kind) {
            case "number":
                return `tsc_json_num(${cExpr})`;
            case "boolean":
                return `tsc_str_from_bool(${cExpr})`;
            case "string":
                return `tsc_json_escape_string(${cExpr})`;
            case "array": {
                const et = ty.elem!;
                const av = this.freshTemp("_ja");
                const iv = this.freshTemp("_ji");
                const inner = this.stringifyJsonValue(
                    `TSC_ARR(${et.c}, ${av}, ${iv})`,
                    et,
                    (tsType as ts.TypeReference).typeArguments?.[0] ?? tsType,
                    node,
                );
                return (
                    `({ tsc_array_t* ${av} = ${cExpr}; ` +
                    `tsc_str_t* _jr = tsc_str_from_lit("[", 1); ` +
                    `for (size_t ${iv} = 0; ${iv} < ${av}->len; ${iv}++) { ` +
                    `if (${iv} > 0) _jr = tsc_str_concat(_jr, tsc_str_from_lit(",", 1)); ` +
                    `_jr = tsc_str_concat(_jr, ${inner}); } ` +
                    `tsc_str_concat(_jr, tsc_str_from_lit("]", 1)); })`
                );
            }
            case "class": {
                const props = this.checker.getPropertiesOfType(tsType);
                const ov = this.freshTemp("_jo");
                const steps: string[] = [`${ty.c} ${ov} = ${cExpr}`];
                steps.push(`tsc_str_t* _jr = tsc_str_from_lit("{", 1)`);
                let first = true;
                for (const p of props) {
                    if (!(p.flags & ts.SymbolFlags.Property)) continue;
                    const decl = p.valueDeclaration ?? p.getDeclarations()?.[0];
                    if (!decl) continue;
                    const pt = this.checker.getTypeOfSymbolAtLocation(p, decl);
                    const pCt = mapTsType(node, pt, this.checker);
                    const key = p.getName();
                    const sep = first ? "" : ",";
                    const keyStr = `${sep}"${jsonEscape(key)}":`;
                    steps.push(
                        `_jr = tsc_str_concat(_jr, tsc_str_from_lit("${escapeCString(keyStr)}", ${utf8ByteLen(keyStr)}))`,
                    );
                    const fieldC = `${ov}->${mangleIdent(key)}`;
                    steps.push(
                        `_jr = tsc_str_concat(_jr, ${this.stringifyJsonValue(fieldC, pCt, pt, node)})`,
                    );
                    first = false;
                }
                steps.push(`tsc_str_concat(_jr, tsc_str_from_lit("}", 1))`);
                return `({ ${steps.join("; ")}; })`;
            }
            case "void":
                return `tsc_str_from_lit("null", 4)`;
            case "value":
                return `tsc_value_json_stringify(${cExpr})`;
            default:
                unsupported(node, `JSON.stringify of ${ty.c}`);
        }
    }

    private emitOsCall(call: ts.CallExpression, name: string): EmitResult {
        switch (name) {
            case "platform": return { c: `tsc_os_platform()`, ty: T_STRING };
            case "arch": return { c: `tsc_os_arch()`, ty: T_STRING };
            case "hostname": return { c: `tsc_os_hostname()`, ty: T_STRING };
            case "tmpdir": return { c: `tsc_os_tmpdir()`, ty: T_STRING };
            case "homedir": return { c: `tsc_os_homedir()`, ty: T_STRING };
            case "cpus": {
                // Minimal: return an array-of-empty-objects of length cpu_count.
                // Most user code just wants os.cpus().length, so this is fine.
                return {
                    c: `({ double _n = tsc_os_cpu_count(); tsc_array_t* _a = tsc_array_new(sizeof(double), (size_t)_n); _a->len = (size_t)_n; _a; })`,
                    ty: arrayType(T_NUMBER),
                };
            }
        }
        unsupported(call, `os.${name}`);
    }

    private objectProperties(tsType: ts.Type): ts.Symbol[] {
        return this.checker
            .getPropertiesOfType(tsType)
            .filter((p) => p.flags & ts.SymbolFlags.Property);
    }

    private homogeneousObjectPropertyType(
        node: ts.Node,
        props: ts.Symbol[],
        label: string,
    ): CType {
        let commonType: CType | null = null;
        for (const p of props) {
            const decl = p.valueDeclaration ?? p.getDeclarations()?.[0];
            if (!decl) continue;
            const pt = this.checker.getTypeOfSymbolAtLocation(p, decl);
            const pCt = mapTsType(node, pt, this.checker);
            if (!commonType) commonType = pCt;
            else if (!sameCType(commonType, pCt)) {
                unsupported(
                    node,
                    `${label} requires homogeneous field types (Phase 3 for mixed)`,
                );
            }
        }
        return commonType ?? T_VOID;
    }

    private objectEntrySet(entryVar: string, ty: CType, value: string): string {
        switch (ty.kind) {
            case "number": return `${entryVar}.num = ${value}`;
            case "boolean": return `${entryVar}.boolean = ${value}`;
            case "void": return `${entryVar}.ptr = NULL`;
            default: return `${entryVar}.ptr = (void*)(${value})`;
        }
    }

    private objectEntryValue(entryVar: string, ty: CType): string {
        switch (ty.kind) {
            case "number": return `${entryVar}.num`;
            case "boolean": return `${entryVar}.boolean`;
            case "void": return "NULL";
            default: return `((${ty.c})${entryVar}.ptr)`;
        }
    }

    private staticPropertyName(name: ts.PropertyName): string | null {
        if (ts.isIdentifier(name)) return name.text;
        if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
            return name.text;
        }
        if (ts.isComputedPropertyName(name)) {
            return this.staticComputedPropertyExpression(name.expression);
        }
        return null;
    }

    private staticComputedPropertyExpression(expr: ts.Expression): string | null {
        if (ts.isStringLiteralLike(expr) || ts.isNumericLiteral(expr)) {
            return expr.text;
        }
        const ty = this.checker.getTypeAtLocation(expr);
        if (ty.isStringLiteral()) return ty.value;
        if (ty.isNumberLiteral()) return String(ty.value);
        return null;
    }

    private classMethodCName(name: ts.PropertyName): string | null {
        if (ts.isIdentifier(name)) return mangleIdent(name.text);
        if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
            return mangleIdent(name.text);
        }
        if (
            ts.isComputedPropertyName(name) &&
            this.isSymbolIteratorExpression(name.expression)
        ) {
            return "__tsc_iterator";
        }
        return null;
    }

    private isSymbolIteratorExpression(expr: ts.Expression): boolean {
        return ts.isPropertyAccessExpression(expr) &&
            ts.isIdentifier(expr.expression) &&
            expr.expression.text === "Symbol" &&
            expr.name.text === "iterator";
    }

    private objectFieldType(
        objectNode: ts.Node,
        objectType: ts.Type,
        fieldName: string,
        fieldNode: ts.Node,
    ): CType {
        const candidates = objectType.isUnion() ? objectType.types : [objectType];
        for (const candidate of candidates) {
            if (
                candidate.flags &
                (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)
            ) {
                continue;
            }
            const sym = candidate.getProperty(fieldName);
            if (!sym) continue;
            const decl = sym.valueDeclaration ?? sym.getDeclarations()?.[0] ?? objectNode;
            return mapTsType(fieldNode, this.checker.getTypeOfSymbolAtLocation(sym, decl), this.checker);
        }
        unsupported(fieldNode, `unknown object literal field ${fieldName}`);
    }

    private defaultValueForType(ty: CType): string {
        switch (ty.kind) {
            case "number": return "0.0";
            case "boolean": return "false";
            case "string": return `tsc_str_from_lit("", 0)`;
            case "void": return "NULL";
            default: return `((${ty.c})NULL)`;
        }
    }

    private emitObjectEntries(
        call: ts.CallExpression,
        arg: ts.Expression,
        mapped: CType,
        tsType: ts.Type,
    ): EmitResult {
        if (mapped.kind !== "class")
            unsupported(arg, "Object.entries on non-object (Phase 3)");
        const obj = this.freshTemp("_oe_obj");
        const arr = this.freshTemp("_oe_arr");
        const argR = this.emitExpr(arg);
        const props = this.objectProperties(tsType);
        const valueType = this.homogeneousObjectPropertyType(
            arg,
            props,
            "Object.entries",
        );
        const elemType = entryType(valueType);
        const pieces: string[] = [
            `${mapped.c} ${obj} = ${argR.c}`,
            `tsc_array_t* ${arr} = tsc_array_new(sizeof(${elemType.c}), ${props.length || 1})`,
        ];
        for (const p of props) {
            const name = p.getName();
            const key = this.freshTemp("_oe_key");
            const entry = this.freshTemp("_oe_entry");
            pieces.push(
                `tsc_str_t* ${key} = tsc_str_from_lit("${escapeCString(name)}", ${utf8ByteLen(name)})`,
            );
            pieces.push(`${elemType.c} ${entry}`);
            pieces.push(`${entry}.key = ${key}`);
            pieces.push(
                this.objectEntrySet(
                    entry,
                    valueType,
                    `${obj}->${mangleIdent(name)}`,
                ),
            );
            pieces.push(`tsc_array_push_raw(${arr}, &${entry})`);
        }
        pieces.push(arr);
        return { c: `({ ${pieces.join("; ")}; })`, ty: arrayType(elemType) };
    }

    private emitObjectFromEntries(
        call: ts.CallExpression,
        arg: ts.Expression,
    ): EmitResult {
        const targetTsType =
            this.checker.getContextualType(call) ??
            this.checker.getTypeAtLocation(call);
        const target = mapTsType(call, targetTsType, this.checker);
        if (target.kind !== "class") {
            unsupported(
                call,
                "Object.fromEntries needs a contextual named interface/class target",
            );
        }

        const entries = this.emitExpr(arg);
        if (entries.ty.kind !== "array" || entries.ty.elem?.kind !== "entry") {
            unsupported(arg, "Object.fromEntries expects Object.entries-style tuples");
        }
        const entryValueType = entries.ty.elem.elem ?? T_VOID;
        const props = this.objectProperties(targetTsType);
        const valueType = this.homogeneousObjectPropertyType(
            call,
            props,
            "Object.fromEntries",
        );
        if (!sameCType(entryValueType, valueType)) {
            unsupported(
                arg,
                `Object.fromEntries value type ${entryValueType.c} does not match target field type ${valueType.c}`,
            );
        }

        const obj = this.freshTemp("_of_obj");
        const arr = this.freshTemp("_of_arr");
        const idx = this.freshTemp("_of_i");
        const entry = this.freshTemp("_of_entry");
        const pieces: string[] = [
            `tsc_array_t* ${arr} = ${entries.c}`,
            `${target.c} ${obj} = (${target.c})TSC_GC_MALLOC(sizeof(${target.className!}_t))`,
        ];
        for (const p of props) {
            const name = p.getName();
            pieces.push(
                `${obj}->${mangleIdent(name)} = ${this.defaultValueForType(valueType)}`,
            );
        }
        const assigns = props
            .map((p) => {
                const name = p.getName();
                return `if (tsc_str_eq(${entry}.key, tsc_str_from_lit("${escapeCString(name)}", ${utf8ByteLen(name)}))) ${obj}->${mangleIdent(name)} = ${this.objectEntryValue(entry, valueType)}`;
            })
            .join("; ");
        pieces.push(
            `for (size_t ${idx} = 0; ${idx} < ${arr}->len; ${idx}++) { ${entries.ty.elem.c} ${entry} = TSC_ARR(${entries.ty.elem.c}, ${arr}, ${idx}); ${assigns}; }`,
        );
        pieces.push(obj);
        return { c: `({ ${pieces.join("; ")}; })`, ty: target };
    }

    private emitObjectCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        if (args.length < 1) unsupported(call, `Object.${name} needs an argument`);
        const arg = args[0]!;
        const tsType = this.checker.getTypeAtLocation(arg);
        const mapped = this.prepareType(mapTsType(arg, tsType, this.checker));
        if (name === "assign") {
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.assign currently supports dynamic targets only");
            }
            const specs: SequencedCallArg[] = [
                { value: this.emitExpr(arg), target: T_VALUE, node: arg },
            ];
            for (const source of args.slice(1)) {
                specs.push({ value: this.emitExpr(source), target: T_VALUE, node: source });
            }
            return this.emitSequencedExpr(T_VALUE, specs, ([target, ...sources]) => {
                const targetArg = target!;
                if (sources.length === 0) return targetArg;
                const calls = sources.map((source) => `tsc_value_object_assign(${targetArg}, ${source})`);
                return `({ ${calls.join("; ")}; ${targetArg}; })`;
            });
        }
        if (name === "is") {
            if (args.length !== 2) unsupported(call, "Object.is expects two values");
            const left = this.emitExpr(args[0]!);
            const right = this.emitExpr(args[1]!);
            return this.emitSequencedCall("tsc_value_object_is", T_BOOLEAN, [
                { value: left, target: T_VALUE, node: args[0]! },
                { value: right, target: T_VALUE, node: args[1]! },
            ]);
        }
        if (name === "keys") {
            if (mapped.kind === "value") {
                const value = this.emitExpr(arg);
                return this.emitSequencedExpr(arrayType(T_STRING), [{ value }], ([v]) =>
                    `tsc_value_object_keys(${v!})`,
                );
            }
            if (mapped.kind !== "class")
                unsupported(arg, "Object.keys on non-object (Phase 3)");
            const props = this.objectProperties(tsType);
            const av = this.freshTemp("_ok");
            const pieces: string[] = [
                `tsc_array_t* ${av} = tsc_array_new(sizeof(tsc_str_t*), ${props.length || 1})`,
            ];
            for (const p of props) {
                const key = p.getName();
                const kv = this.freshTemp("_k");
                pieces.push(
                    `tsc_str_t* ${kv} = tsc_str_from_lit("${escapeCString(key)}", ${utf8ByteLen(key)})`,
                );
                pieces.push(`tsc_array_push_raw(${av}, &${kv})`);
            }
            pieces.push(av);
            return {
                c: `({ ${pieces.join("; ")}; })`,
                ty: arrayType(T_STRING),
            };
        }
        if (name === "values") {
            if (mapped.kind === "value") {
                const value = this.emitExpr(arg);
                return this.emitSequencedExpr(arrayType(T_VALUE), [{ value }], ([v]) =>
                    `tsc_value_object_values(${v!})`,
                );
            }
            if (mapped.kind !== "class")
                unsupported(arg, "Object.values on non-object (Phase 3)");
            // Evaluate arg once.
            const ov = this.freshTemp("_ov");
            const argR = this.emitExpr(arg);
            const props = this.objectProperties(tsType);
            const commonType = this.homogeneousObjectPropertyType(
                arg,
                props,
                "Object.values",
            );
            const av = this.freshTemp("_ov2");
            const pieces: string[] = [
                `${mapped.c} ${ov} = ${argR.c}`,
                `tsc_array_t* ${av} = tsc_array_new(sizeof(${commonType.c}), ${props.length || 1})`,
            ];
            for (const p of props) {
                const name = p.getName();
                const vv = this.freshTemp("_v");
                pieces.push(
                    `${commonType.c} ${vv} = ${ov}->${mangleIdent(name)}`,
                );
                pieces.push(`tsc_array_push_raw(${av}, &${vv})`);
            }
            pieces.push(av);
            return {
                c: `({ ${pieces.join("; ")}; })`,
                ty: arrayType(commonType),
            };
        }
        if (name === "entries") {
            const value = this.emitExpr(arg);
            const declaredDynamic = ts.isIdentifier(arg) && (
                this.identifierDeclaredType(arg)?.kind === "value" ||
                this.identifierHasDynamicAnnotation(arg)
            );
            if (value.ty.kind === "value" || declaredDynamic) {
                const dynamicValue: EmitResult = declaredDynamic ? { c: value.c, ty: T_VALUE } : value;
                return this.emitSequencedExpr(arrayType(T_VALUE), [{ value: dynamicValue }], ([v]) =>
                    `tsc_value_object_entries(${v!})`,
                );
            }
            return this.emitObjectEntries(call, arg, mapped, tsType);
        }
        if (name === "fromEntries") {
            const entries = this.emitExpr(arg);
            const declaredDynamic = ts.isIdentifier(arg) && (
                this.identifierDeclaredType(arg)?.kind === "value" ||
                this.identifierHasDynamicAnnotation(arg)
            );
            if (entries.ty.kind === "value" || declaredDynamic) {
                const dynamicEntries: EmitResult = declaredDynamic ? { c: entries.c, ty: T_VALUE } : entries;
                return this.emitSequencedCall("tsc_value_object_from_entries", T_VALUE, [
                    { value: dynamicEntries, target: T_VALUE, node: arg },
                ]);
            }
            return this.emitObjectFromEntries(call, arg);
        }
        if (name === "create") {
            if (args.length !== 1) unsupported(call, "Object.create expects prototype");
            const proto = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_object_create", T_VALUE, [
                { value: proto, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "getOwnPropertyNames") {
            if (args.length !== 1) unsupported(call, "Object.getOwnPropertyNames expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.getOwnPropertyNames currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_own_keys", arrayType(T_STRING), [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "getOwnPropertyDescriptor") {
            if (args.length !== 2) unsupported(call, "Object.getOwnPropertyDescriptor expects object and key");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.getOwnPropertyDescriptor currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            const key = this.emitExpr(args[1]!);
            return this.emitSequencedCall("tsc_value_get_own_property_descriptor", T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
                { value: key, target: T_STRING, node: args[1]! },
            ]);
        }
        if (name === "getOwnPropertyDescriptors") {
            if (args.length !== 1) unsupported(call, "Object.getOwnPropertyDescriptors expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.getOwnPropertyDescriptors currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_get_own_property_descriptors", T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "getPrototypeOf") {
            if (args.length !== 1) unsupported(call, "Object.getPrototypeOf expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.getPrototypeOf currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_get_prototype_of", T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "hasOwn") {
            if (args.length !== 2) unsupported(call, "Object.hasOwn expects object and key");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.hasOwn currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            const key = this.emitExpr(args[1]!);
            return this.emitSequencedCall("tsc_value_has_own_prop", T_BOOLEAN, [
                { value: obj, target: T_VALUE, node: arg },
                { value: key, target: T_STRING, node: args[1]! },
            ]);
        }
        if (name === "isExtensible") {
            if (args.length !== 1) unsupported(call, "Object.isExtensible expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.isExtensible currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_is_extensible", T_BOOLEAN, [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "isSealed") {
            if (args.length !== 1) unsupported(call, "Object.isSealed expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.isSealed currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_is_sealed", T_BOOLEAN, [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "isFrozen") {
            if (args.length !== 1) unsupported(call, "Object.isFrozen expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.isFrozen currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedCall("tsc_value_is_frozen", T_BOOLEAN, [
                { value: obj, target: T_VALUE, node: arg },
            ]);
        }
        if (name === "preventExtensions") {
            if (args.length !== 1) unsupported(call, "Object.preventExtensions expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.preventExtensions currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedExpr(T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
            ], ([o]) => `({ tsc_value_prevent_extensions(${o}); ${o}; })`);
        }
        if (name === "seal") {
            if (args.length !== 1) unsupported(call, "Object.seal expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.seal currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedExpr(T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
            ], ([o]) => `({ tsc_value_seal(${o}); ${o}; })`);
        }
        if (name === "setPrototypeOf") {
            if (args.length !== 2) unsupported(call, "Object.setPrototypeOf expects object and prototype");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.setPrototypeOf currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            const proto = this.emitExpr(args[1]!);
            return this.emitSequencedExpr(T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
                { value: proto, target: T_VALUE, node: args[1]! },
            ], ([o, p]) => `({ tsc_value_set_prototype_of(${o}, ${p}); ${o}; })`);
        }
        if (name === "freeze") {
            if (args.length !== 1) unsupported(call, "Object.freeze expects object");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.freeze currently supports dynamic objects only");
            }
            const obj = this.emitExpr(arg);
            return this.emitSequencedExpr(T_VALUE, [
                { value: obj, target: T_VALUE, node: arg },
            ], ([o]) => `({ tsc_value_freeze(${o}); ${o}; })`);
        }
        if (name === "defineProperty") {
            if (args.length !== 3) unsupported(call, "Object.defineProperty expects object, key, descriptor");
            if (mapped.kind !== "value") {
                unsupported(arg, "Object.defineProperty currently supports dynamic objects only");
            }
            const key = this.emitExpr(args[1]!);
            const desc = this.descriptorData(args[2]!);
            const obj = this.emitExpr(arg);
            if (desc.kind === "accessor") {
                return this.emitSequencedExpr(
                    T_VALUE,
                    [
                        { value: obj, target: T_VALUE, node: arg },
                        { value: key, target: T_STRING, node: args[1]! },
                    ],
                    ([o, k]) => `({ tsc_value_define_accessor_desc(${o}, ${k}, ${desc.getter}, ${desc.setter}, ${desc.enumerable}, ${desc.configurable}); ${o}; })`,
                );
            }
            const value = this.emitExpr(desc.value);
            return this.emitSequencedExpr(
                T_VALUE,
                [
                    { value: obj, target: T_VALUE, node: arg },
                    { value: key, target: T_STRING, node: args[1]! },
                    { value, target: T_VALUE, node: desc.value },
                ],
                ([o, k, v]) => `({ tsc_value_define_property_desc(${o}, ${k}, ${v}, ${desc.writable}, ${desc.enumerable}, ${desc.configurable}); ${o}; })`,
            );
        }
        unsupported(call, `Object.${name}`);
    }

    private emitReflectCall(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        switch (name) {
            case "defineProperty": {
                if (args.length !== 3) unsupported(call, "Reflect.defineProperty expects target, key, and descriptor");
                const desc = this.descriptorData(args[2]!);
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                if (desc.kind === "accessor") {
                    return this.emitSequencedExpr(
                        T_BOOLEAN,
                        [
                            { value: target, target: T_VALUE, node: args[0]! },
                            { value: key, target: T_STRING, node: args[1]! },
                        ],
                        ([t, k]) => `tsc_value_define_accessor_desc(${t}, ${k}, ${desc.getter}, ${desc.setter}, ${desc.enumerable}, ${desc.configurable})`,
                    );
                }
                const value = this.emitExpr(desc.value);
                return this.emitSequencedExpr(
                    T_BOOLEAN,
                    [
                        { value: target, target: T_VALUE, node: args[0]! },
                        { value: key, target: T_STRING, node: args[1]! },
                        { value, target: T_VALUE, node: desc.value },
                    ],
                    ([t, k, v]) => `tsc_value_define_property_desc(${t}, ${k}, ${v}, ${desc.writable}, ${desc.enumerable}, ${desc.configurable})`,
                );
            }
            case "deleteProperty": {
                if (args.length !== 2) unsupported(call, "Reflect.deleteProperty expects target and key");
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                return this.emitSequencedCall("tsc_value_delete_prop", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: key, target: T_STRING, node: args[1]! },
                ]);
            }
            case "get": {
                if (args.length !== 2) unsupported(call, "Reflect.get expects target and key");
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                return this.emitSequencedCall("tsc_value_get_prop", T_VALUE, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: key, target: T_STRING, node: args[1]! },
                ]);
            }
            case "getOwnPropertyDescriptor": {
                if (args.length !== 2) unsupported(call, "Reflect.getOwnPropertyDescriptor expects target and key");
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                return this.emitSequencedCall("tsc_value_get_own_property_descriptor", T_VALUE, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: key, target: T_STRING, node: args[1]! },
                ]);
            }
            case "getPrototypeOf": {
                if (args.length !== 1) unsupported(call, "Reflect.getPrototypeOf expects target");
                const target = this.emitExpr(args[0]!);
                return this.emitSequencedCall("tsc_value_get_prototype_of", T_VALUE, [
                    { value: target, target: T_VALUE, node: args[0]! },
                ]);
            }
            case "has": {
                if (args.length !== 2) unsupported(call, "Reflect.has expects target and key");
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                return this.emitSequencedCall("tsc_value_has_prop", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: key, target: T_STRING, node: args[1]! },
                ]);
            }
            case "isExtensible": {
                if (args.length !== 1) unsupported(call, "Reflect.isExtensible expects target");
                const target = this.emitExpr(args[0]!);
                return this.emitSequencedCall("tsc_value_is_extensible", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                ]);
            }
            case "ownKeys": {
                if (args.length !== 1) unsupported(call, "Reflect.ownKeys expects target");
                const target = this.emitExpr(args[0]!);
                return this.emitSequencedCall("tsc_value_own_keys", arrayType(T_STRING), [
                    { value: target, target: T_VALUE, node: args[0]! },
                ]);
            }
            case "preventExtensions": {
                if (args.length !== 1) unsupported(call, "Reflect.preventExtensions expects target");
                const target = this.emitExpr(args[0]!);
                return this.emitSequencedCall("tsc_value_prevent_extensions", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                ]);
            }
            case "set": {
                if (args.length !== 3) unsupported(call, "Reflect.set expects target, key, value");
                const target = this.emitExpr(args[0]!);
                const key = this.emitExpr(args[1]!);
                const value = this.emitExpr(args[2]!);
                return this.emitSequencedCall("tsc_value_set_prop", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: key, target: T_STRING, node: args[1]! },
                    { value, target: T_VALUE, node: args[2]! },
                ]);
            }
            case "setPrototypeOf": {
                if (args.length !== 2) unsupported(call, "Reflect.setPrototypeOf expects target and prototype");
                const target = this.emitExpr(args[0]!);
                const proto = this.emitExpr(args[1]!);
                return this.emitSequencedCall("tsc_value_set_prototype_of", T_BOOLEAN, [
                    { value: target, target: T_VALUE, node: args[0]! },
                    { value: proto, target: T_VALUE, node: args[1]! },
                ]);
            }
        }
        unsupported(call, `Reflect.${name}`);
    }

    private descriptorData(desc: ts.Expression): { kind: "data"; value: ts.Expression; writable: string; enumerable: string; configurable: string } | { kind: "accessor"; getter: string; setter: string; enumerable: string; configurable: string } {
        if (!ts.isObjectLiteralExpression(desc)) {
            unsupported(desc, "Object.defineProperty descriptor must be an object literal");
        }
        let value: ts.Expression | null = null;
        let getter = "NULL";
        let setter = "NULL";
        let hasAccessor = false;
        let hasWritable = false;
        let writable = "false";
        let enumerable = "false";
        let configurable = "false";
        for (const prop of desc.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;
            const name = this.staticPropertyName(prop.name);
            if (name === "value") {
                value = prop.initializer;
            } else if (name === "get") {
                getter = this.descriptorAccessorAdapter(prop.initializer, "get");
                hasAccessor = true;
            } else if (name === "set") {
                setter = this.descriptorAccessorAdapter(prop.initializer, "set");
                hasAccessor = true;
            } else if (name === "writable") {
                writable = this.descriptorBoolean(prop.initializer, "writable");
                hasWritable = true;
            } else if (name === "enumerable") {
                enumerable = this.descriptorBoolean(prop.initializer, "enumerable");
            } else if (name === "configurable") {
                configurable = this.descriptorBoolean(prop.initializer, "configurable");
            }
        }
        if (hasAccessor) {
            if (value) unsupported(desc, "Object.defineProperty descriptor cannot mix value with get/set");
            if (hasWritable) unsupported(desc, "Object.defineProperty accessor descriptor cannot include writable");
            return { kind: "accessor", getter, setter, enumerable, configurable };
        }
        if (!value) unsupported(desc, "Object.defineProperty descriptor needs a value property");
        return { kind: "data", value, writable, enumerable, configurable };
    }

    private descriptorAccessorAdapter(expr: ts.Expression, kind: "get" | "set"): string {
        if (!ts.isIdentifier(expr)) {
            unsupported(expr, `Object.defineProperty ${kind} accessor must be a named function`);
        }
        const sym = this.symbolForIdentifier(expr);
        const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
        if (!decl || !ts.isFunctionDeclaration(decl) || !decl.name) {
            unsupported(expr, `Object.defineProperty ${kind} accessor must reference a function declaration`);
        }
        const type = this.prepareType(mapType(expr, this.checker));
        if (type.kind !== "function" || !type.ret) {
            unsupported(expr, `Object.defineProperty ${kind} accessor must be a function`);
        }
        const params = type.params ?? [];
        if (kind === "get" && params.length !== 0) {
            unsupported(expr, "Object.defineProperty getter must take no arguments");
        }
        if (kind === "set" && params.length !== 1) {
            unsupported(expr, "Object.defineProperty setter must take one argument");
        }
        const callee = this.identifierName(expr);
        const key = `${kind}:${callee}:${this.typeKey(type)}`;
        const existing = this.accessorAdapters.get(key);
        if (existing) return existing;
        const name = `${callee}__access_${kind}_${this.accessorAdapters.size}`;
        this.accessorAdapters.set(key, name);
        const buf = new CBuf();
        if (kind === "get") {
            const ret = this.prepareType(type.ret);
            if (ret.kind === "void") unsupported(expr, "Object.defineProperty getter must return a value");
            this.protos.line(`tsc_value_t ${name}(void);`);
            buf.open(`tsc_value_t ${name}(void)`);
            const boxed = this.coerce({ c: `${callee}()`, ty: ret }, T_VALUE, expr);
            buf.line(`return ${boxed};`);
        } else {
            const param = this.prepareType(params[0]!);
            this.protos.line(`bool ${name}(tsc_value_t value);`);
            buf.open(`bool ${name}(tsc_value_t value)`);
            const arg = this.coerce({ c: "value", ty: T_VALUE }, param, expr);
            buf.line(`${callee}(${arg});`);
            buf.line("return true;");
        }
        buf.close();
        buf.line();
        this.closureDefs.write(buf.toString());
        return name;
    }

    private descriptorBoolean(expr: ts.Expression, name: string): string {
        if (expr.kind === ts.SyntaxKind.TrueKeyword) return "true";
        if (expr.kind === ts.SyntaxKind.FalseKeyword) return "false";
        unsupported(expr, `Object.defineProperty descriptor ${name} must be a boolean literal`);
    }

    private emitNumberStatic(call: ts.CallExpression, name: string): EmitResult {
        const args = call.arguments;
        if (args.length !== 1) unsupported(call, `Number.${name} expects 1 arg`);
        const r = this.emitExpr(args[0]!);
        switch (name) {
            case "isInteger": {
                requireNumber(args[0]!, r.ty);
                return {
                    c: `(!isnan(${r.c}) && !isinf(${r.c}) && (${r.c}) == floor(${r.c}))`,
                    ty: T_BOOLEAN,
                };
            }
            case "isFinite": {
                requireNumber(args[0]!, r.ty);
                return { c: `(isfinite(${r.c}))`, ty: T_BOOLEAN };
            }
            case "isNaN": {
                requireNumber(args[0]!, r.ty);
                return { c: `(isnan(${r.c}))`, ty: T_BOOLEAN };
            }
            case "parseFloat":
                return { c: `tsc_parse_float(${r.c})`, ty: T_NUMBER };
            case "parseInt":
                return { c: `tsc_parse_int(${r.c}, 10)`, ty: T_NUMBER };
        }
        unsupported(call, `Number.${name}`);
    }

    private emitParseNumber(
        call: ts.CallExpression,
        which: "parseInt" | "parseFloat",
    ): EmitResult {
        if (call.arguments.length < 1)
            unsupported(call, `${which} expects at least 1 arg`);
        const r = this.emitExpr(call.arguments[0]!);
        const fn = which === "parseInt" ? "tsc_parse_int" : "tsc_parse_float";
        const specs: SequencedCallArg[] = [
            { value: r, target: T_STRING, node: call.arguments[0]! },
        ];
        if (which === "parseFloat") {
            return this.emitSequencedCall(fn, T_NUMBER, specs);
        }
        if (call.arguments.length >= 2) {
            const radix = this.emitExpr(call.arguments[1]!);
            specs.push({ value: radix, target: T_NUMBER, node: call.arguments[1]! });
            return this.emitSequencedCall(fn, T_NUMBER, specs);
        }
        return this.emitSequencedExpr(T_NUMBER, specs, (args) => `${fn}(${args[0]}, 10)`);
    }

    private emitConsole(call: ts.CallExpression, which: string): EmitResult {
        const fn =
            which === "error" ? "tsc_console_error_n" : "tsc_console_log_n";
        const specs: SequencedCallArg[] = [];
        for (const a of call.arguments) {
            const r = this.emitExpr(a);
            specs.push({ value: r, stringify: true, node: a });
        }
        return this.emitSequencedCall(fn, T_VOID, specs, [call.arguments.length.toString()]);
    }

    private emitProcessExit(call: ts.CallExpression): EmitResult {
        if (call.arguments.length === 0) {
            return { c: `tsc_process_exit(0)`, ty: T_VOID };
        }
        const r = this.emitExpr(call.arguments[0]!);
        requireNumber(call.arguments[0]!, r.ty);
        return { c: `tsc_process_exit(${r.c})`, ty: T_VOID };
    }

    private emitNew(n: ts.NewExpression): EmitResult {
        if (!ts.isIdentifier(n.expression))
            unsupported(n, "new expression must use a class identifier");
        const cls = n.expression.text;
        // Built-in Map / Set constructors.
        if (cls === "Map") {
            const ty = this.checker.getTypeAtLocation(n);
            const mapped = mapTsType(n, ty, this.checker);
            if (mapped.kind !== "map")
                unsupported(n, "new Map() requires <K, V> type parameters");
            const k = mapped.key!;
            const v = mapped.elem!;
            return {
                c: `tsc_map_new(sizeof(${k.c}), sizeof(${v.c}), ${keyKindOf(k)}, 0)`,
                ty: mapped,
            };
        }
        if (cls === "Set") {
            const ty = this.checker.getTypeAtLocation(n);
            const mapped = mapTsType(n, ty, this.checker);
            if (mapped.kind !== "set")
                unsupported(n, "new Set() requires <T> type parameter");
            const e = mapped.elem!;
            return {
                c: `tsc_set_new(sizeof(${e.c}), ${keyKindOf(e)}, 0)`,
                ty: mapped,
            };
        }
        if (cls === "WeakMap") {
            const ty = this.checker.getTypeAtLocation(n);
            const mapped = mapTsType(n, ty, this.checker);
            if (mapped.kind !== "weakmap")
                unsupported(n, "new WeakMap() requires <K, V> type parameters");
            const k = mapped.key!;
            const v = mapped.elem!;
            requireWeakObjectKey(n, k, "WeakMap");
            return {
                c: `tsc_map_new(sizeof(${k.c}), sizeof(${v.c}), ${keyKindOf(k)}, 0)`,
                ty: mapped,
            };
        }
        if (cls === "WeakSet") {
            const ty = this.checker.getTypeAtLocation(n);
            const mapped = mapTsType(n, ty, this.checker);
            if (mapped.kind !== "weakset")
                unsupported(n, "new WeakSet() requires <T> type parameter");
            const e = mapped.elem!;
            requireWeakObjectKey(n, e, "WeakSet");
            return {
                c: `tsc_set_new(sizeof(${e.c}), ${keyKindOf(e)}, 0)`,
                ty: mapped,
            };
        }
        if (cls === "WeakRef") {
            const target = n.arguments?.[0];
            if (!target) unsupported(n, "new WeakRef() expects target");
            const ty = this.checker.getTypeAtLocation(n);
            const mapped = mapTsType(n, ty, this.checker);
            if (mapped.kind !== "weakref" || !mapped.elem)
                unsupported(n, "new WeakRef() requires <T> type parameter");
            requireWeakObjectKey(n, mapped.elem, "WeakRef");
            const r = this.emitExpr(target);
            return this.emitSequencedExpr(mapped, [
                { value: r, target: mapped.elem, node: target },
            ], ([value]) => `tsc_weakref_new((void*)${value!})`);
        }
        if (cls === "Error") {
            // Simple Error as a string carrier.
            const msg = n.arguments?.[0];
            if (msg) {
                const r = this.emitExpr(msg);
                return { c: this.coerceToString(r, msg), ty: T_STRING };
            }
            return { c: `tsc_str_from_lit("Error", 5)`, ty: T_STRING };
        }
        if (cls === "URL") {
            const input = n.arguments?.[0];
            if (!input) unsupported(n, "new URL() expects input");
            const r = this.emitExpr(input);
            return this.emitSequencedCall(
                "tsc_url_new",
                T_URL,
                [{ value: r, target: T_STRING, node: input }],
            );
        }
        const sig = this.checker.getResolvedSignature(n);
        if (!sig) unsupported(n, "unresolved constructor");
        const params = sig.getParameters();
        const specs: SequencedCallArg[] = [];
        const argList = n.arguments ?? [];
        for (let i = 0; i < argList.length; i++) {
            const a = argList[i]!;
            const r = this.emitExpr(a);
            const pd = params[i]?.valueDeclaration;
            let pt: CType;
            if (pd && ts.isParameter(pd)) pt = mapType(pd, this.checker);
            else pt = r.ty;
            specs.push({ value: r, target: pt, node: a });
        }
        return this.emitSequencedCall(`${cls}_new`, classType(cls), specs);
    }

    private emitPropertyAccess(pa: ts.PropertyAccessExpression): EmitResult {
        const enumValue = this.enumConstantValue(pa);
        if (typeof enumValue === "number") {
            return { c: enumValue.toString(), ty: T_NUMBER };
        }

        if (ts.isIdentifier(pa.expression)) {
            if (pa.expression.text === "Math") {
                const name = pa.name.text;
                switch (name) {
                    case "PI": return { c: `((double)M_PI)`, ty: T_NUMBER };
                    case "E": return { c: `((double)M_E)`, ty: T_NUMBER };
                    case "LN2": return { c: `((double)M_LN2)`, ty: T_NUMBER };
                    case "LN10": return { c: `((double)M_LN10)`, ty: T_NUMBER };
                    case "LOG2E": return { c: `((double)M_LOG2E)`, ty: T_NUMBER };
                    case "LOG10E": return { c: `((double)M_LOG10E)`, ty: T_NUMBER };
                    case "SQRT2": return { c: `((double)M_SQRT2)`, ty: T_NUMBER };
                }
            }
            if (pa.expression.text === "process" && pa.name.text === "argv") {
                return { c: `tsc_process_argv()`, ty: arrayType(T_STRING) };
            }
            if (pa.expression.text === "Symbol" && pa.name.text === "iterator") {
                return { c: `tsc_symbol_iterator()`, ty: T_SYMBOL };
            }
            if (pa.expression.text === "Symbol" && pa.name.text === "asyncIterator") {
                return { c: `tsc_symbol_async_iterator()`, ty: T_SYMBOL };
            }
        }
        // process.env.VAR → tsc_process_env_get("VAR")
        if (
            ts.isPropertyAccessExpression(pa.expression) &&
            ts.isIdentifier(pa.expression.expression) &&
            pa.expression.expression.text === "process" &&
            pa.expression.name.text === "env"
        ) {
            const varName = pa.name.text;
            return {
                c: `tsc_process_env_get(tsc_str_from_lit("${escapeCString(varName)}", ${utf8ByteLen(varName)}))`,
                ty: T_STRING,
            };
        }
        if (ts.isIdentifier(pa.name)) {
            const nsName = this.namespaceMemberName(pa.name);
            if (nsName) {
                const ty = mapType(pa, this.checker);
                return { c: nsName, ty };
            }
        }
        if (ts.isIdentifier(pa.expression)) {
            // Static class property access: MyClass.staticField.
            // Must come BEFORE emitting pa.expression since a class used as a
            // value (rather than an instance) has no runtime representation.
            const sym = this.checker.getSymbolAtLocation(pa.expression);
            const classDecl = sym
                ?.getDeclarations()
                ?.find(ts.isClassDeclaration);
            if (classDecl && classDecl.name) {
                const field = classDecl.members.find(
                    (m) =>
                        ts.isPropertyDeclaration(m) &&
                        m.name &&
                        ts.isIdentifier(m.name) &&
                        m.name.text === pa.name.text &&
                        isStatic(m),
                );
                if (field) {
                    const ft = mapType(pa, this.checker);
                    return {
                        c: `${classDecl.name.text}_${mangleIdent(pa.name.text)}`,
                        ty: ft,
                    };
                }
            }
        }
        const recv = this.emitExpr(pa.expression);
        const isOpt = !!pa.questionDotToken;
        if (recv.ty.kind === "string" && pa.name.text === "length") {
            return { c: `tsc_str_length(${recv.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "array" && pa.name.text === "length") {
            return { c: `tsc_array_length(${recv.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "map" && pa.name.text === "size") {
            return { c: `tsc_map_size(${recv.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "set" && pa.name.text === "size") {
            return { c: `tsc_set_size(${recv.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "symbol" && pa.name.text === "description") {
            return { c: `tsc_symbol_description(${recv.c})`, ty: T_STRING };
        }
        if (recv.ty.kind === "buffer" && pa.name.text === "length") {
            return { c: `tsc_buffer_length(${recv.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "value") {
            if (pa.name.text === "length") {
                return { c: `tsc_value_length(${recv.c})`, ty: T_NUMBER };
            }
            const key = pa.name.text;
            return {
                c: `tsc_value_get_prop(${recv.c}, tsc_str_from_lit("${escapeCString(key)}", ${utf8ByteLen(key)}))`,
                ty: T_VALUE,
            };
        }
        if (recv.ty.kind === "entry" && pa.name.text === "length") {
            const tv = this.freshTemp("_entry");
            return {
                c: `({ ${recv.ty.c} ${tv} = ${recv.c}; (void)${tv}; 2.0; })`,
                ty: T_NUMBER,
            };
        }
        if (recv.ty.kind === "url") {
            const fields = [
                "href",
                "protocol",
                "host",
                "hostname",
                "port",
                "pathname",
                "search",
                "hash",
                "origin",
            ];
            if (fields.includes(pa.name.text)) {
                if (isOpt) {
                    const tv = this.freshTemp("_ou");
                    return {
                        c: `({ ${recv.ty.c} ${tv} = ${recv.c}; ${tv} != NULL ? ${tv}->${mangleIdent(pa.name.text)} : tsc_str_from_lit("", 0); })`,
                        ty: T_STRING,
                    };
                }
                return { c: `${recv.c}->${mangleIdent(pa.name.text)}`, ty: T_STRING };
            }
        }
        if (recv.ty.kind === "class") {
            const ty = mapType(pa, this.checker);
            if (isOpt) {
                const tv = this.freshTemp("_oc");
                const zero = ty.kind === "number" ? "0.0" : ty.kind === "boolean" ? "false" : `(${ty.c})0`;
                return {
                    c: `({ ${recv.ty.c} ${tv} = ${recv.c}; ${tv} != NULL ? ${tv}->${mangleIdent(pa.name.text)} : ${zero}; })`,
                    ty,
                };
            }
            return { c: `${recv.c}->${mangleIdent(pa.name.text)}`, ty };
        }
        unsupported(pa, `property .${pa.name.text} on ${recv.ty.c}`);
    }

    private enumConstantValue(pa: ts.PropertyAccessExpression): number | undefined {
        if (!ts.isIdentifier(pa.expression)) return undefined;
        const sym = this.checker.getSymbolAtLocation(pa.expression);
        const decl = sym?.getDeclarations()?.find(ts.isEnumDeclaration);
        if (!decl) return undefined;

        let nextValue = 0;
        for (const member of decl.members) {
            const value = member.initializer
                ? this.numericEnumInitializer(member.initializer)
                : nextValue;
            if (ts.isIdentifier(member.name) && member.name.text === pa.name.text) {
                return value;
            }
            nextValue = value + 1;
        }
        unsupported(pa, `enum member ${pa.name.text} not found`);
    }

    private numericEnumInitializer(expr: ts.Expression): number {
        if (ts.isNumericLiteral(expr)) return Number(expr.text);
        if (
            ts.isPrefixUnaryExpression(expr) &&
            ts.isNumericLiteral(expr.operand) &&
            (expr.operator === ts.SyntaxKind.MinusToken ||
                expr.operator === ts.SyntaxKind.PlusToken)
        ) {
            const n = Number(expr.operand.text);
            return expr.operator === ts.SyntaxKind.MinusToken ? -n : n;
        }
        unsupported(expr, "only numeric enum initializers are supported");
    }

    private emitElementAccess(ea: ts.ElementAccessExpression): EmitResult {
        const recv = this.emitExpr(ea.expression);
        if (recv.ty.kind === "array") {
            const idx = this.emitExpr(ea.argumentExpression);
            requireNumber(ea.argumentExpression, idx.ty);
            const et = recv.ty.elem!;
            return {
                c: `TSC_ARR(${et.c}, ${recv.c}, (size_t)(${idx.c}))`,
                ty: et,
            };
        }
        if (recv.ty.kind === "entry") {
            if (!ts.isNumericLiteral(ea.argumentExpression)) {
                unsupported(ea.argumentExpression, "Object.entries tuple index must be 0 or 1");
            }
            const idx = Number(ea.argumentExpression.text);
            const tv = this.freshTemp("_entry");
            if (idx === 0) {
                return {
                    c: `({ ${recv.ty.c} ${tv} = ${recv.c}; ${tv}.key; })`,
                    ty: T_STRING,
                };
            }
            if (idx === 1) {
                const valueType = recv.ty.elem ?? T_VOID;
                return {
                    c: `({ ${recv.ty.c} ${tv} = ${recv.c}; ${this.objectEntryValue(tv, valueType)}; })`,
                    ty: valueType,
                };
            }
            unsupported(ea.argumentExpression, "Object.entries tuple index must be 0 or 1");
        }
        if (recv.ty.kind === "string") {
            const idx = this.emitExpr(ea.argumentExpression);
            requireNumber(ea.argumentExpression, idx.ty);
            return { c: `tsc_str_char_at(${recv.c}, ${idx.c})`, ty: T_STRING };
        }
        if (recv.ty.kind === "buffer") {
            const idx = this.emitExpr(ea.argumentExpression);
            requireNumber(ea.argumentExpression, idx.ty);
            return { c: `tsc_buffer_get(${recv.c}, ${idx.c})`, ty: T_NUMBER };
        }
        if (recv.ty.kind === "value") {
            const idx = this.emitExpr(ea.argumentExpression);
            if (idx.ty.kind === "number") {
                return { c: `tsc_value_get_index(${recv.c}, ${idx.c})`, ty: T_VALUE };
            }
            if (idx.ty.kind === "string") {
                return { c: `tsc_value_get_prop(${recv.c}, ${idx.c})`, ty: T_VALUE };
            }
            unsupported(ea.argumentExpression, "dynamic index must be number or string");
        }
        unsupported(ea, `index access on ${recv.ty.c}`);
    }

    private emitObjectLiteral(ol: ts.ObjectLiteralExpression): EmitResult {
        const targetType =
            this.checker.getContextualType(ol) ??
            this.checker.getTypeAtLocation(ol);
        const mapped = this.prepareType(mapTsType(ol, targetType, this.checker));
        if (mapped.kind === "value") {
            const obj = this.freshTemp("_dynobj");
            const pieces: string[] = [`tsc_object_t* ${obj} = tsc_object_new()`];
            for (const prop of ol.properties) {
                let fieldName: string;
                let expr: ts.Expression;
                if (ts.isPropertyAssignment(prop)) {
                    const staticName = this.staticPropertyName(prop.name);
                    if (!staticName) {
                        unsupported(prop.name, "dynamic object key must be a string/number literal");
                    }
                    fieldName = staticName;
                    expr = prop.initializer;
                } else if (ts.isShorthandPropertyAssignment(prop)) {
                    fieldName = prop.name.text;
                    expr = prop.name;
                } else {
                    unsupported(prop, `object literal property kind ${ts.SyntaxKind[prop.kind]}`);
                }
                const value = this.emitExpr(expr);
                pieces.push(
                    `tsc_object_set(${obj}, tsc_str_from_lit("${escapeCString(fieldName)}", ${utf8ByteLen(fieldName)}), ${this.coerce(value, T_VALUE, expr)})`,
                );
            }
            pieces.push(`tsc_value_object(${obj})`);
            return { c: `({ ${pieces.join("; ")}; })`, ty: T_VALUE };
        }
        if (mapped.kind !== "class") {
            unsupported(
                ol,
                "object literal requires a named interface/class as its type",
            );
        }
        const cls = mapped.className!;
        const tmp = this.freshTemp("_obj");
        const pieces: string[] = [
            `${cls}_t* ${tmp} = (${cls}_t*)TSC_GC_MALLOC(sizeof(${cls}_t))`,
        ];
        for (const prop of ol.properties) {
            if (ts.isPropertyAssignment(prop)) {
                const fieldName = this.staticPropertyName(prop.name);
                if (!fieldName) {
                    unsupported(
                        prop.name,
                        "computed property name must resolve to a string or number literal",
                    );
                }
                const val = this.emitExpr(prop.initializer);
                const fieldType = this.objectFieldType(ol, targetType, fieldName, prop.name);
                pieces.push(
                    `${tmp}->${mangleIdent(fieldName)} = ${this.coerce(val, fieldType, prop.initializer)}`,
                );
            } else if (ts.isShorthandPropertyAssignment(prop)) {
                const val = this.emitExpr(prop.name);
                const fieldType = this.objectFieldType(ol, targetType, prop.name.text, prop.name);
                pieces.push(
                    `${tmp}->${mangleIdent(prop.name.text)} = ${this.coerce(val, fieldType, prop.name)}`,
                );
            } else {
                unsupported(
                    prop,
                    `object literal property kind ${ts.SyntaxKind[prop.kind]}`,
                );
            }
        }
        pieces.push(tmp);
        return { c: `({ ${pieces.join("; ")}; })`, ty: mapped };
    }

    private emitArrayLiteral(al: ts.ArrayLiteralExpression): EmitResult {
        const litType =
            this.checker.getContextualType(al) ??
            this.checker.getTypeAtLocation(al);
        const mapped = mapTsType(al, litType, this.checker);
        if (mapped.kind === "value") {
            const pieces: string[] = [];
            const av = this.freshTemp("_dynarr");
            pieces.push(
                `tsc_array_t* ${av} = tsc_array_new(sizeof(tsc_value_t), ${Math.max(1, al.elements.length)})`,
            );
            for (const e of al.elements) {
                if (e.kind === ts.SyntaxKind.OmittedExpression)
                    unsupported(e, "sparse array literals");
                if (ts.isSpreadElement(e)) {
                    unsupported(e, "spread in dynamic array literals is not implemented yet");
                }
                const r = this.emitExpr(e as ts.Expression);
                const tmp = this.freshTemp("_dynv");
                pieces.push(`${T_VALUE.c} ${tmp} = ${this.coerce(r, T_VALUE, e as ts.Expression)}`);
                pieces.push(`tsc_array_push_raw(${av}, &${tmp})`);
            }
            pieces.push(`tsc_value_array(${av})`);
            return { c: `({ ${pieces.join("; ")}; })`, ty: T_VALUE };
        }
        if (mapped.kind === "entry") {
            return this.emitEntryLiteral(al, mapped);
        }
        if (mapped.kind !== "array") {
            unsupported(al, `array literal inferred non-array type ${mapped.c}`);
        }
        const et = mapped.elem!;
        const pieces: string[] = [];
        const av = this.freshTemp("_al");
        pieces.push(
            `tsc_array_t* ${av} = tsc_array_new(sizeof(${et.c}), ${Math.max(1, al.elements.length)})`,
        );
        for (const e of al.elements) {
            if (e.kind === ts.SyntaxKind.OmittedExpression)
                unsupported(e, "sparse array literals");
            if (ts.isSpreadElement(e)) {
                const r = this.emitExpr(e.expression);
                if (r.ty.kind !== "array")
                    unsupported(e, "spread must be an array");
                pieces.push(`tsc_array_append(${av}, ${r.c})`);
                continue;
            }
            const r = this.emitExpr(e as ts.Expression);
            const coerced = this.coerce(r, et, e as ts.Expression);
            const tv = this.freshTemp("_el");
            pieces.push(`${et.c} ${tv} = ${coerced}`);
            pieces.push(`tsc_array_push_raw(${av}, &${tv})`);
        }
        pieces.push(av);
        return { c: `({ ${pieces.join("; ")}; })`, ty: mapped };
    }

    private emitEntryLiteral(
        al: ts.ArrayLiteralExpression,
        mapped: CType,
    ): EmitResult {
        if (al.elements.length !== 2) {
            unsupported(al, "Object.entries tuple literal must have exactly two elements");
        }
        const [keyExpr, valueExpr] = al.elements;
        if (
            !keyExpr ||
            !valueExpr ||
            keyExpr.kind === ts.SyntaxKind.OmittedExpression ||
            valueExpr.kind === ts.SyntaxKind.OmittedExpression ||
            ts.isSpreadElement(keyExpr) ||
            ts.isSpreadElement(valueExpr)
        ) {
            unsupported(al, "Object.entries tuple literal cannot be sparse or spread");
        }
        const key = this.emitExpr(keyExpr as ts.Expression);
        const valueType = mapped.elem ?? T_VOID;
        const value = this.emitExpr(valueExpr as ts.Expression);
        const tmp = this.freshTemp("_entry");
        const pieces = [
            `${mapped.c} ${tmp}`,
            `${tmp}.key = ${this.coerce(key, T_STRING, keyExpr as ts.Expression)}`,
            this.objectEntrySet(
                tmp,
                valueType,
                this.coerce(value, valueType, valueExpr as ts.Expression),
            ),
            tmp,
        ];
        return { c: `({ ${pieces.join("; ")}; })`, ty: mapped };
    }

    // ---------------- coercion helpers ----------------

    private coerceToString(r: EmitResult, node: ts.Node): string {
        if (r.ty.kind === "string") return r.c;
        if (r.ty.kind === "number") return `tsc_str_from_num(${r.c})`;
        if (r.ty.kind === "bigint") return `tsc_bigint_to_string(${r.c}, 10.0)`;
        if (r.ty.kind === "symbol") return `tsc_symbol_to_string(${r.c})`;
        if (r.ty.kind === "boolean") return `tsc_str_from_bool(${r.c})`;
        if (r.ty.kind === "array") return `tsc_str_from_lit("[array]", 7)`;
        if (r.ty.kind === "weakmap") return `tsc_str_from_lit("[object WeakMap]", 16)`;
        if (r.ty.kind === "weakset") return `tsc_str_from_lit("[object WeakSet]", 16)`;
        if (r.ty.kind === "weakref") return `tsc_str_from_lit("[object WeakRef]", 16)`;
        if (r.ty.kind === "url") return `${r.c}->href`;
        if (r.ty.kind === "buffer") return `tsc_buffer_to_string(${r.c}, tsc_str_from_lit("utf8", 4))`;
        if (r.ty.kind === "function") return `tsc_str_from_lit("[function]", 10)`;
        if (r.ty.kind === "value") return `tsc_value_to_string(${r.c})`;
        if (r.ty.kind === "class") {
            const cls = r.ty.className!;
            const s = `[object ${cls}]`;
            return `tsc_str_from_lit("${escapeCString(s)}", ${utf8ByteLen(s)})`;
        }
        unsupported(node, `cannot stringify ${r.ty.c}`);
    }

    private coerce(r: EmitResult, target: CType, node: ts.Node): string {
        if (r.ty.kind === target.kind) {
            if (
                target.kind === "class" &&
                r.ty.className &&
                target.className &&
                r.ty.className !== target.className
            ) {
                return `((${target.c})${r.c})`;
            }
            if (
                target.kind === "entry" &&
                r.ty.elem &&
                target.elem &&
                !sameCType(r.ty.elem, target.elem)
            ) {
                unsupported(node, `cannot coerce ${r.ty.c} to ${target.c}`);
            }
            if (target.kind === "function" && !sameCType(r.ty, target)) {
                unsupported(node, `cannot coerce ${r.ty.c} to ${target.c}`);
            }
            return r.c;
        }
        // null (void) → any pointer type: emit typed NULL. Check before the
        // string-coerce branch since string is a pointer type too.
        const pointerKinds: readonly CType["kind"][] = [
            "string", "bigint", "symbol", "array", "class", "map", "set", "weakmap", "weakset", "weakref", "regexp", "hash", "url", "buffer", "function",
        ];
        if (r.ty.kind === "void" && pointerKinds.includes(target.kind)) {
            return `((${target.c})NULL)`;
        }
        if (r.ty.kind === "value") {
            switch (target.kind) {
                case "number":
                    return `tsc_value_as_num(${r.c})`;
                case "boolean":
                    return `tsc_value_as_bool(${r.c})`;
                case "string":
                    return `tsc_value_as_string(${r.c})`;
                case "array":
                    return `tsc_value_as_array(${r.c})`;
            }
        }
        if (target.kind === "value") {
            switch (r.ty.kind) {
                case "number":
                    return `tsc_value_num(${r.c})`;
                case "boolean":
                    return `tsc_value_bool(${r.c})`;
                case "string":
                    return `tsc_value_string(${r.c})`;
                case "array":
                    return `tsc_value_array(${r.c})`;
                case "void":
                    return `tsc_value_null()`;
                case "value":
                    return r.c;
                default:
                    unsupported(node, `cannot box ${r.ty.c} as tsc_value_t`);
            }
        }
        if (target.kind === "string") return this.coerceToString(r, node);
        if (target.kind === "void") return r.c;
        unsupported(node, `cannot coerce ${r.ty.c} to ${target.c}`);
    }
}

function requireNumber(node: ts.Node, t: CType): void {
    if (t.kind !== "number") {
        unsupported(node, `expected number, got ${t.c}`);
    }
}

function requireWeakObjectKey(node: ts.Node, t: CType, label: string): void {
    if (!isWeakObjectKey(t)) {
        unsupported(node, `${label} keys must be object pointer types`);
    }
}

function isWeakObjectKey(t: CType): boolean {
    return [
        "array",
        "class",
        "map",
        "set",
        "weakmap",
        "weakset",
        "weakref",
        "regexp",
        "hash",
        "url",
        "buffer",
    ].includes(t.kind);
}

function isPointerKind(t: CType): boolean {
    const pointerKinds: readonly CType["kind"][] = [
        "string", "bigint", "symbol", "array", "class", "map", "set", "weakmap", "weakset", "weakref", "regexp", "hash", "url", "buffer", "function",
    ];
    return pointerKinds.includes(t.kind);
}

function sameCType(a: CType, b: CType): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === "class") return a.className === b.className;
    if (
        a.kind === "array" ||
        a.kind === "set" ||
        a.kind === "weakset" ||
        a.kind === "weakref" ||
        a.kind === "entry"
    ) {
        if (!a.elem || !b.elem) return a.elem === b.elem;
        return sameCType(a.elem, b.elem);
    }
    if (a.kind === "map" || a.kind === "weakmap") {
        if (!a.key || !b.key || !a.elem || !b.elem) return false;
        return sameCType(a.key, b.key) && sameCType(a.elem, b.elem);
    }
    if (a.kind === "function") {
        if (!a.ret || !b.ret) return false;
        const aParams = a.params ?? [];
        const bParams = b.params ?? [];
        if (aParams.length !== bParams.length) return false;
        return (
            sameCType(a.ret, b.ret) &&
            aParams.every((p, i) => sameCType(p, bParams[i]!))
        );
    }
    return true;
}

function isStatic(m: ts.Node): boolean {
    const mods = ts.canHaveModifiers(m) ? ts.getModifiers(m) : undefined;
    return !!mods?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword);
}

function jsonEscape(s: string): string {
    let out = "";
    for (const c of s) {
        if (c === '"') out += '\\"';
        else if (c === "\\") out += "\\\\";
        else out += c;
    }
    return out;
}

function bitwiseOp(k: ts.SyntaxKind): string {
    switch (k) {
        case ts.SyntaxKind.AmpersandToken: return "&";
        case ts.SyntaxKind.BarToken: return "|";
        case ts.SyntaxKind.CaretToken: return "^";
        case ts.SyntaxKind.LessThanLessThanToken: return "<<";
        case ts.SyntaxKind.GreaterThanGreaterThanToken: return ">>";
    }
    throw new Error("unreachable bitwise op");
}

function formatNumericLiteral(text: string): string {
    const s = text.replace(/_/g, "");
    if (/^0x/i.test(s) || /^0o/i.test(s) || /^0b/i.test(s)) {
        return Number(s).toString() + ".0";
    }
    if (!/[.eE]/.test(s)) return s + ".0";
    return s;
}

function formatBigIntLiteral(text: string): string {
    const s = text.replace(/_/g, "");
    return s.endsWith("n") ? s.slice(0, -1) : s;
}
