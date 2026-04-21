import ts from "typescript";
import { unsupported } from "../diagnostics";

export type CTypeKind =
    | "number"
    | "string"
    | "boolean"
    | "void"
    | "never"
    | "array"
    | "class"
    | "map"
    | "set"
    | "regexp"
    | "unsupported";

export interface CType {
    kind: CTypeKind;
    /** Spelling used in C declarations (e.g. "double", "tsc_str_t*", "Point_t*"). */
    c: string;
    /** For arrays/sets: element type. For maps: value type. */
    elem?: CType;
    /** For maps only: key type. */
    key?: CType;
    /** For classes only: the C struct base name (e.g. "Point" -> Point_t). */
    className?: string;
}

export const T_NUMBER: CType = { kind: "number", c: "double" };
export const T_STRING: CType = { kind: "string", c: "tsc_str_t*" };
export const T_BOOLEAN: CType = { kind: "boolean", c: "bool" };
export const T_VOID: CType = { kind: "void", c: "void" };
export const T_NEVER: CType = { kind: "never", c: "void" };

export function arrayType(elem: CType): CType {
    return { kind: "array", c: "tsc_array_t*", elem };
}

export function mapType_(key: CType, value: CType): CType {
    return { kind: "map", c: "tsc_map_t*", key, elem: value };
}

export function setType(elem: CType): CType {
    return { kind: "set", c: "tsc_set_t*", elem };
}

export const T_REGEXP: CType = { kind: "regexp", c: "tsc_regexp_t*" };

export function classType(className: string): CType {
    return { kind: "class", c: `${className}_t*`, className };
}

/** Convert CType.kind to the tsc_key_kind_t enum used in runtime. */
export function keyKindOf(t: CType): number {
    switch (t.kind) {
        case "number": return 0;
        case "string": return 1;
        case "boolean": return 3;
        default: return 2; /* pointer — class, array, map, set */
    }
}

export function mapType(node: ts.Node, checker: ts.TypeChecker): CType {
    // For identifier references, prefer the DECLARED type over the narrowed
    // one so code like `const s: string | null = null; s ?? "x"` compiles
    // (the declared storage type is `string | null`, mapped to string; the
    // narrowed type at that point would be just `null`, which we'd reject).
    if (ts.isIdentifier(node)) {
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
                    return mapTsType(node, declType, checker);
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
    // Strip literal narrowings first.
    if (t.flags & ts.TypeFlags.NumberLiteral) return T_NUMBER;
    if (t.flags & ts.TypeFlags.StringLiteral) return T_STRING;
    if (t.flags & ts.TypeFlags.BooleanLiteral) return T_BOOLEAN;

    if (t.flags & ts.TypeFlags.Number) return T_NUMBER;
    if (t.flags & ts.TypeFlags.String) return T_STRING;
    if (t.flags & ts.TypeFlags.Boolean) return T_BOOLEAN;
    if (t.flags & ts.TypeFlags.Void) return T_VOID;
    if (t.flags & ts.TypeFlags.Undefined) return T_VOID;
    if (t.flags & ts.TypeFlags.Null) return T_VOID;
    if (t.flags & ts.TypeFlags.Never) return T_NEVER;
    // `unknown` shows up on catch bindings (TS 4.4+ default) and as
    // explicit user annotations. Phase 2 runtime only throws strings, so we
    // treat it as string here; Phase 3 will switch to boxed tsc_value_t.
    if (t.flags & ts.TypeFlags.Unknown) return T_STRING;
    if (t.flags & ts.TypeFlags.Any) return T_STRING;

    if (t.isUnion()) {
        const parts = t.types;
        const allBool = parts.every(
            (p) => p.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.Boolean),
        );
        if (allBool) return T_BOOLEAN;
        // Treat `T | undefined` (and `T | null`) as just `T` for typed
        // contexts. Phase 3 will model this properly via boxed values.
        const concrete = parts.filter(
            (p) => !(p.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)),
        );
        if (concrete.length === 1) {
            return mapTsType(node, concrete[0]!, checker);
        }
    }

    // Array<T> / T[]
    const arrayElem = getArrayElementType(t);
    if (arrayElem) {
        return arrayType(mapTsType(node, arrayElem, checker));
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
        }
        if (sym?.getName() === "Set") {
            const tr = t as ts.TypeReference;
            const ta = tr.typeArguments;
            if (ta && ta.length >= 1) {
                return setType(mapTsType(node, ta[0]!, checker));
            }
        }
        if (sym?.getName() === "RegExp") return T_REGEXP;
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
                if (ts.isInterfaceDeclaration(d) && d.name) {
                    // Skip declarations from .d.ts (lib shims) - those are
                    // handled by runtime intercepts, not user-defined structs.
                    if (!d.getSourceFile().isDeclarationFile) {
                        return classType(d.name.text);
                    }
                }
                if (ts.isTypeLiteralNode(d)) {
                    // Anonymous { x: number } object type: treat as unsupported
                    // for now (Phase 3 shapes/dynamic will handle).
                    unsupported(
                        node,
                        "anonymous object types (declare an interface or class)",
                    );
                }
            }
        }
    }

    unsupported(node, `type not supported yet: ${checker.typeToString(t)}`);
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
