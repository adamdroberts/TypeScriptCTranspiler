import ts from "typescript";
import { unsupported } from "../diagnostics";

export type CTypeKind =
    | "number"
    | "bigint"
    | "symbol"
    | "string"
    | "boolean"
    | "void"
    | "never"
    | "array"
    | "entry"
    | "class"
    | "map"
    | "set"
    | "weakmap"
    | "weakset"
    | "weakref"
    | "finregistry"
    | "promise"
    | "eventemitter"
    | "event"
    | "eventtarget"
    | "regexp"
    | "hash"
    | "hmac"
    | "url"
    | "urlsearchparams"
    | "date"
    | "error"
    | "buffer"
    | "arraybuffer"
    | "dataview"
    | "textencoder"
    | "textdecoder"
    | "fsstats"
    | "fsdirent"
    | "dispatchqueue"
    | "function"
    | "value"
    | "unsupported";

export interface CType {
    kind: CTypeKind;
    /** Spelling used in C declarations (e.g. "double", "tsc_str_t*", "Point_t*"). */
    c: string;
    /** For arrays/sets/object entries: element/value type. For maps: value type. */
    elem?: CType;
    /** For maps and object entries: key type. */
    key?: CType;
    /** For classes only: the C struct base name (e.g. "Point" -> Point_t). */
    className?: string;
    /** For first-class function/closure values. */
    params?: CType[];
    thisParam?: CType;
    ret?: CType;
    closureName?: string;
    /** Typed Promise.withResolvers record metadata while retaining boxed storage. */
    resolverElem?: CType;
}

export type TypeBindings = Map<string, CType>;

const typeBindingStack: TypeBindings[] = [];

export function withTypeBindings<T>(
    bindings: TypeBindings,
    fn: () => T,
): T {
    typeBindingStack.push(bindings);
    try {
        return fn();
    } finally {
        typeBindingStack.pop();
    }
}

export const T_NUMBER: CType = { kind: "number", c: "double" };
/** Same TS-level type (`number`) but stored as `int64_t` in C — used by the
 *  int-shape specialization path so chains of arithmetic stay in integer
 *  registers without per-op cvttsd2si/cvtsi2sd round trips. */
export const T_NUMBER_INT: CType = { kind: "number", c: "int64_t" };
export const T_BIGINT: CType = { kind: "bigint", c: "tsc_bigint_t*" };
export const T_SYMBOL: CType = { kind: "symbol", c: "tsc_symbol_t*" };
export const T_STRING: CType = { kind: "string", c: "tsc_str_t*" };
export const T_BOOLEAN: CType = { kind: "boolean", c: "bool" };
export const T_VOID: CType = { kind: "void", c: "void" };
export const T_NEVER: CType = { kind: "never", c: "void" };

export function arrayType(elem: CType): CType {
    return { kind: "array", c: "tsc_array_t*", elem };
}

export function entryType(elem: CType, key: CType = T_STRING): CType {
    return { kind: "entry", c: "tsc_object_entry_t", key, elem };
}

export function mapType_(key: CType, value: CType): CType {
    return { kind: "map", c: "tsc_map_t*", key, elem: value };
}

export function setType(elem: CType): CType {
    return { kind: "set", c: "tsc_set_t*", elem };
}

export function weakMapType(key: CType, value: CType): CType {
    return { kind: "weakmap", c: "tsc_map_t*", key, elem: value };
}

export function weakSetType(elem: CType): CType {
    return { kind: "weakset", c: "tsc_set_t*", elem };
}

export function weakRefType(elem: CType): CType {
    return { kind: "weakref", c: "tsc_weakref_t*", elem };
}

export function finRegistryType(elem: CType): CType {
    return { kind: "finregistry", c: "tsc_finregistry_t*", elem };
}

export function promiseType(elem: CType): CType {
    return { kind: "promise", c: "tsc_promise_t*", elem };
}

export function promiseResolverType(elem: CType): CType {
    return { kind: "value", c: "tsc_value_t", resolverElem: elem };
}

export const T_EVENT_EMITTER: CType = { kind: "eventemitter", c: "tsc_event_emitter_t*" };
export const T_EVENT: CType = { kind: "event", c: "tsc_event_t*" };
export const T_EVENT_TARGET: CType = { kind: "eventtarget", c: "tsc_event_target_t*" };
export const T_REGEXP: CType = { kind: "regexp", c: "tsc_regexp_t*" };
export const T_HASH: CType = { kind: "hash", c: "tsc_hash_t*" };
export const T_HMAC: CType = { kind: "hmac", c: "tsc_hmac_t*" };
export const T_URL: CType = { kind: "url", c: "tsc_url_t*" };
export const T_URL_SEARCH_PARAMS: CType = { kind: "urlsearchparams", c: "tsc_url_search_params_t*" };
export const T_DATE: CType = { kind: "date", c: "tsc_date_t*" };
export const T_ERROR: CType = { kind: "error", c: "tsc_error_t*" };
export const T_BUFFER: CType = { kind: "buffer", c: "tsc_buffer_t*" };
export const T_ARRAY_BUFFER: CType = { kind: "arraybuffer", c: "tsc_array_buffer_t*" };
export const T_DATA_VIEW: CType = { kind: "dataview", c: "tsc_data_view_t*" };
export const T_TEXT_ENCODER: CType = { kind: "textencoder", c: "tsc_text_encoder_t*" };
export const T_TEXT_DECODER: CType = { kind: "textdecoder", c: "tsc_text_decoder_t*" };
export const T_FS_STATS: CType = { kind: "fsstats", c: "tsc_fs_stats_t*" };
export const T_FS_DIRENT: CType = { kind: "fsdirent", c: "tsc_fs_dirent_t*" };
export const T_DISPATCH_QUEUE: CType = { kind: "dispatchqueue", c: "tsc_dispatch_queue_t*" };
export const T_VALUE: CType = { kind: "value", c: "tsc_value_t" };

export function classType(className: string): CType {
    return { kind: "class", c: `${className}_t*`, className };
}

export function functionType(params: readonly CType[], ret: CType, thisParam?: CType): CType {
    const thisPart = thisParam ? `this_${typeNamePart(thisParam)}_` : "";
    const closureName = `tsc_fn_${thisPart}${params.length ? params.map(typeNamePart).join("_") : "void"}_to_${typeNamePart(ret)}_t`;
    return {
        kind: "function",
        c: `${closureName}*`,
        params: [...params],
        thisParam,
        ret,
        closureName,
    };
}

function isThisParameter(p: ts.ParameterDeclaration): boolean {
    return ts.isIdentifier(p.name) && p.name.text === "this";
}

function explicitThisParameter(node: ts.Node): ts.ParameterDeclaration | null {
    if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node)
    ) {
        return node.parameters.find(isThisParameter) ?? null;
    }
    return null;
}

/** Convert CType.kind to the tsc_key_kind_t enum used in runtime. */
export function keyKindOf(t: CType): number {
    switch (t.kind) {
        case "number": return 0;
        case "string": return 1;
        case "value": return 4;
        case "boolean": return 3;
        default: return 2; /* pointer — class, array, map, set */
    }
}

export function mapType(node: ts.Node, checker: ts.TypeChecker): CType {
    // For identifier references, prefer the DECLARED type over the narrowed
    // one so code like `const s: string | null = null; s ?? "x"` compiles
    // (the declared storage type is `string | null`, mapped to string; the
    // narrowed type at that point would be just `null`, which we'd reject).
    // Exception: if storage is the dynamic value type and TS has narrowed the
    // current reference to a concrete primitive/pointer type, use the narrowed
    // type. The emitter will insert the unbox bridge at that identifier read.
    if (ts.isIdentifier(node)) {
        const contextual = checker.getContextualType(node);
        if (contextual?.getCallSignatures().length) {
            try {
                return mapTsType(node, contextual, checker);
            } catch {
                // fall through to declared/current type
            }
        }
        const sym = checker.getSymbolAtLocation(node);
        if (sym && sym.valueDeclaration) {
            try {
                const declType = checker.getTypeOfSymbolAtLocation(
                    sym,
                    sym.valueDeclaration,
                );
                // If the declared type is valid (not just `null`), use it.
                if (
                    !(declType.flags & ts.TypeFlags.Null) &&
                    !(declType.flags & ts.TypeFlags.Undefined)
                ) {
                    const declCt = mapTsType(node, declType, checker);
                    if (declCt.kind === "value") {
                        const narrowedCt = mapTsType(
                            node,
                            checker.getTypeAtLocation(node),
                            checker,
                        );
                        if (
                            narrowedCt.kind === "number" ||
                            narrowedCt.kind === "boolean" ||
                            narrowedCt.kind === "string" ||
                            narrowedCt.kind === "array"
                        ) {
                            return narrowedCt;
                        }
                    }
                    return declCt;
                }
            } catch {
                // fall through
            }
        }
    }
    const t = checker.getTypeAtLocation(node);
    return mapTsType(node, t, checker);
}

export function mapTsType(node: ts.Node, t: ts.Type, checker: ts.TypeChecker): CType {
    const boundTypeParam = lookupTypeBinding(t, checker);
    if (boundTypeParam) return boundTypeParam;
    if (t.flags & ts.TypeFlags.TypeParameter) return T_VALUE;

    // Strip literal narrowings first.
    if (t.flags & ts.TypeFlags.BigIntLiteral) return T_BIGINT;
    if (t.flags & ts.TypeFlags.UniqueESSymbol) return T_SYMBOL;
    if (t.flags & ts.TypeFlags.NumberLiteral) return T_NUMBER;
    if (t.flags & ts.TypeFlags.StringLiteral) return T_STRING;
    if (t.flags & ts.TypeFlags.BooleanLiteral) return T_BOOLEAN;

    if (t.flags & ts.TypeFlags.BigInt) return T_BIGINT;
    if (t.flags & ts.TypeFlags.ESSymbol) return T_SYMBOL;
    if (t.flags & ts.TypeFlags.Number) return T_NUMBER;
    if (t.flags & ts.TypeFlags.String) return T_STRING;
    if (t.flags & ts.TypeFlags.Boolean) return T_BOOLEAN;
    if (t.flags & ts.TypeFlags.EnumLike) return enumLikeTypeIsString(t) ? T_STRING : T_NUMBER;
    if (t.flags & ts.TypeFlags.Void) return T_VOID;
    if (t.flags & ts.TypeFlags.Undefined) return T_VOID;
    if (t.flags & ts.TypeFlags.Null) return T_VOID;
    if (t.flags & ts.TypeFlags.Never) return T_NEVER;
    if (t.flags & ts.TypeFlags.Unknown) return T_VALUE;
    if (t.flags & ts.TypeFlags.Any) return T_VALUE;

    if (t.isUnion()) {
        const parts = t.types;
        const allBool = parts.every(
            (p) => p.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.Boolean),
        );
        if (allBool) return T_BOOLEAN;
        const allBigInt = parts.every(
            (p) => p.flags & (ts.TypeFlags.BigIntLiteral | ts.TypeFlags.BigInt),
        );
        if (allBigInt) return T_BIGINT;
        const allString = parts.every(
            (p) => p.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.String),
        );
        if (allString) return T_STRING;
        const allNumber = parts.every(
            (p) => p.flags & (ts.TypeFlags.NumberLiteral | ts.TypeFlags.Number),
        );
        if (allNumber) return T_NUMBER;
        // Treat pointer-like `T | undefined` (and `T | null`) as just `T`
        // for typed contexts. Numeric/boolean nullish unions need boxed
        // storage so the nullish arm does not collapse to NaN/false.
        const concrete = parts.filter(
            (p) => !(p.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)),
        );
        if (concrete.length === 1) {
            const concreteType = mapTsType(node, concrete[0]!, checker);
            const hasNullish = concrete.length !== parts.length;
            if (
                hasNullish &&
                (concreteType.kind === "number" || concreteType.kind === "boolean")
            ) {
                return T_VALUE;
            }
            return concreteType;
        }
        if (concrete.length > 1) {
            return T_VALUE;
        }
    }

    const tupleElems = getTupleElementTypes(t, checker);
    if (tupleElems) {
        if (tupleElems.length !== 2) {
            unsupported(node, "only 2-element tuples are supported");
        }
        const keyType = mapTsType(node, tupleElems[0]!, checker);
        return entryType(mapTsType(node, tupleElems[1]!, checker), keyType);
    }

    // Array<T> / T[]
    const arrayElem = getArrayElementType(t);
    if (arrayElem) {
        return arrayType(mapTsType(node, arrayElem, checker));
    }

    const callSig =
        checker.getSignaturesOfType(t, ts.SignatureKind.Call)[0] ??
        t.getCallSignatures()[0];
    if (callSig) {
        let thisParamType: CType | undefined;
        if (callSig.thisParameter) {
            const decl = callSig.thisParameter.valueDeclaration ?? node;
            thisParamType = mapTsType(
                decl,
                checker.getTypeOfSymbolAtLocation(callSig.thisParameter, decl),
                checker,
            );
            if (thisParamType.kind === "void") {
                thisParamType = undefined;
            }
            if (thisParamType && thisParamType.kind !== "value" && thisParamType.kind !== "class" && thisParamType.kind !== "eventemitter" && thisParamType.kind !== "eventtarget") {
                unsupported(decl, "function this parameters are currently supported only as any/unknown, class instances, EventEmitter, or EventTarget");
            }
        } else {
            const decl = explicitThisParameter(callSig.getDeclaration() ?? node);
            if (decl) {
                thisParamType = mapTsType(decl, checker.getTypeAtLocation(decl), checker);
                if (thisParamType.kind === "void") {
                    thisParamType = undefined;
                }
                if (thisParamType && thisParamType.kind !== "value" && thisParamType.kind !== "class" && thisParamType.kind !== "eventemitter" && thisParamType.kind !== "eventtarget") {
                    unsupported(decl, "function this parameters are currently supported only as any/unknown, class instances, EventEmitter, or EventTarget");
                }
            }
        }
        const params = callSig.getParameters().map((param) => {
            const decl = param.valueDeclaration ?? node;
            return mapTsType(
                decl,
                checker.getTypeOfSymbolAtLocation(param, decl),
                checker,
            );
        });
        return functionType(params, mapTsType(node, callSig.getReturnType(), checker), thisParamType);
    }

    // Map<K, V>
    {
        const sym = t.getSymbol();
        if (sym?.getName() === "Map") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 2) {
                return mapType_(
                    mapTsType(node, ta[0]!, checker),
                    mapTsType(node, ta[1]!, checker),
                );
            }
            return mapType_(T_VALUE, T_VALUE);
        }
        if (sym?.getName() === "Set") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return setType(mapTsType(node, ta[0]!, checker));
            }
            return setType(T_VALUE);
        }
        if (sym?.getName() === "WeakMap") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 2) {
                return weakMapType(
                    mapTsType(node, ta[0]!, checker),
                    mapTsType(node, ta[1]!, checker),
                );
            }
            return weakMapType(T_VALUE, T_VALUE);
        }
        if (sym?.getName() === "WeakSet") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return weakSetType(mapTsType(node, ta[0]!, checker));
            }
            return weakSetType(T_VALUE);
        }
        if (sym?.getName() === "WeakRef") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return weakRefType(mapTsType(node, ta[0]!, checker));
            }
            return weakRefType(T_VALUE);
        }
        if (sym?.getName() === "FinalizationRegistry") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return finRegistryType(mapTsType(node, ta[0]!, checker));
            }
            return finRegistryType(T_VALUE);
        }
        if (sym?.getName() === "Promise") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return promiseType(mapTsType(node, ta[0]!, checker));
            }
            return promiseType(T_VALUE);
        }
        if (sym?.getName() === "PromiseWithResolvers") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            return promiseResolverType(ta && ta.length >= 1 ? mapTsType(node, ta[0]!, checker) : T_VALUE);
        }
        if (sym?.getName() === "EventEmitter") return T_EVENT_EMITTER;
        if (sym?.getName() === "Event") return T_EVENT;
        if (sym?.getName() === "EventTarget") return T_EVENT_TARGET;
        if (sym?.getName() === "IterableIterator" || sym?.getName() === "Iterator" || sym?.getName() === "Generator") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return arrayType(mapTsType(node, ta[0]!, checker));
            }
        }
        if (sym?.getName() === "RegExp") return T_REGEXP;
        if (sym?.getName() === "CryptoHash") return T_HASH;
        if (sym?.getName() === "CryptoHmac") return T_HMAC;
        if (sym?.getName() === "URL") return T_URL;
        if (sym?.getName() === "URLSearchParams") return T_URL_SEARCH_PARAMS;
        if (sym?.getName() === "Date") return T_DATE;
        if (
            sym?.getName() === "Error" ||
            sym?.getName() === "TypeError" ||
            sym?.getName() === "RangeError" ||
            sym?.getName() === "SyntaxError" ||
            sym?.getName() === "ReferenceError" ||
            sym?.getName() === "EvalError" ||
            sym?.getName() === "URIError" ||
            sym?.getName() === "AggregateError" ||
            sym?.getName() === "SuppressedError"
        ) return T_ERROR;
        if (sym?.getName() === "Buffer") return T_BUFFER;
        if (sym?.getName() === "ArrayBuffer") return T_ARRAY_BUFFER;
        if (sym?.getName() === "DataView") return T_DATA_VIEW;
        if (sym?.getName() === "TextEncoder") return T_TEXT_ENCODER;
        if (sym?.getName() === "TextDecoder") return T_TEXT_DECODER;
        if (sym?.getName() === "FSStats") return T_FS_STATS;
        if (sym?.getName() === "FSDirent") return T_FS_DIRENT;
        if (sym?.getName() === "FSDirHandleEntry") return T_VALUE;
        if (sym?.getName() === "FSDir") return T_VALUE;
        if (sym?.getName() === "FSFileHandle") return T_VALUE;
        if (sym?.getName() === "DispatchQueue") return T_DISPATCH_QUEUE;
        if (sym?.getName() === "TemplateStringsArray") return arrayType(T_STRING);
        if (sym?.getName() === "ProxyHandler") return T_VALUE;
        if (sym?.getName() === "SocketAddress") return T_VALUE;
        if (sym?.getName() === "SocketAddressInitOptions") return T_VALUE;
        if (sym?.getName() === "ClassDecoratorContext") return T_VALUE;
        if (sym?.getName() === "ClassMethodDecoratorContext") return T_VALUE;
        if (sym?.getName() === "ClassFieldDecoratorContext") return T_VALUE;
        if (sym?.getName() === "ClassGetterDecoratorContext") return T_VALUE;
        if (sym?.getName() === "ClassSetterDecoratorContext") return T_VALUE;
    }

    // User-defined class or interface?
    const sym = t.getSymbol();
    if (sym) {
        const decls = sym.getDeclarations();
        if (decls) {
            for (const d of decls) {
                if (ts.isClassDeclaration(d) && d.name) {
                    return classType(d.name.text);
                }
                if (ts.isClassExpression(d) && d.name) {
                    return classType(d.name.text);
                }
                if (ts.isInterfaceDeclaration(d) && d.name) {
                    // Skip declarations from .d.ts (lib shims) - those are
                    // handled by runtime intercepts, not user-defined structs.
                    if (!d.getSourceFile().isDeclarationFile) {
                        return classType(d.name.text);
                    }
                }
                if (ts.isTypeLiteralNode(d)) {
                    return T_VALUE;
                }
            }
        }
    }
    if (checker.typeToString(t).startsWith("typeof import(")) {
        return T_VALUE;
    }
    if (t.flags & ts.TypeFlags.NonPrimitive) {
        return T_VALUE;
    }
    if (t.flags & ts.TypeFlags.Object) {
        return T_VALUE;
    }

    unsupported(node, `type not supported yet: ${checker.typeToString(t)}`);
}

function enumLikeTypeIsString(t: ts.Type): boolean {
    const declarations = t.symbol?.getDeclarations() ?? t.aliasSymbol?.getDeclarations() ?? [];
    const enumDecl = declarations.find(ts.isEnumDeclaration);
    if (!enumDecl) return false;
    if (enumDecl.members.length === 0) return false;
    return enumDecl.members.every((member) => member.initializer && ts.isStringLiteralLike(member.initializer));
}

function typeNamePart(t: CType): string {
    switch (t.kind) {
        case "array":
            return `array_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "entry":
            return `entry_${t.key ? typeNamePart(t.key) : "void"}_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "map":
            return `map_${t.key ? typeNamePart(t.key) : "void"}_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "set":
            return `set_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "weakmap":
            return `weakmap_${t.key ? typeNamePart(t.key) : "void"}_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "weakset":
            return `weakset_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "weakref":
            return `weakref_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "finregistry":
            return `finregistry_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "promise":
            return `promise_${t.elem ? typeNamePart(t.elem) : "void"}`;
        case "eventemitter":
            return "eventemitter";
        case "fsstats":
            return "fsstats";
        case "fsdirent":
            return "fsdirent";
        case "class":
            return sanitizeTypeName(`class_${t.className ?? t.c}`);
        case "function":
            return sanitizeTypeName(
                `fn_${t.params?.map(typeNamePart).join("_") || "void"}_to_${t.ret ? typeNamePart(t.ret) : "void"}`,
            );
        case "value":
            return "value";
        default:
            return sanitizeTypeName(t.kind);
    }
}

function sanitizeTypeName(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function lookupTypeBinding(
    t: ts.Type,
    checker: ts.TypeChecker,
): CType | undefined {
    if (!(t.flags & ts.TypeFlags.TypeParameter)) return undefined;
    const name = t.getSymbol()?.getName() ?? checker.typeToString(t);
    for (let i = typeBindingStack.length - 1; i >= 0; i--) {
        const binding = typeBindingStack[i]!.get(name);
        if (binding) return binding;
    }
    return undefined;
}

/** If t is an Array<T>, return T. Otherwise undefined. */
export function getArrayElementType(t: ts.Type): ts.Type | undefined {
    const sym = t.getSymbol();
    if (!sym) return undefined;
    if (sym.getName() !== "Array" && sym.getName() !== "ReadonlyArray") return undefined;
    const tr = t as ts.TypeReference;
    const args = tr.typeArguments;
    if (!args || args.length === 0) return undefined;
    return args[0];
}

function getTupleElementTypes(
    t: ts.Type,
    checker: ts.TypeChecker,
): readonly ts.Type[] | undefined {
    const tupleAwareChecker = checker as ts.TypeChecker & {
        isTupleType?: (type: ts.Type) => boolean;
    };
    if (!tupleAwareChecker.isTupleType?.(t)) return undefined;
    const tr = t as ts.TypeReference;
    return tr.typeArguments ?? checker.getTypeArguments(tr);
}
