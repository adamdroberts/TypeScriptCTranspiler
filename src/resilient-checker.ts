import ts from "typescript";

/* The TypeScript checker exhausts the stack on a few inputs (5.9.3 loops
 * between the contextual type of a `yield` inside a generator method's
 * computed key and the auto-typed variable the enclosing literal is assigned
 * to). Every consumer already handles the unknown shape (any, no symbol, no
 * members), so a query that overflows answers with it and reports once per
 * program; the input then compiles through the dynamic paths instead of
 * crashing the compiler. */

export function isStackOverflow(error: unknown): boolean {
    return error instanceof RangeError && /call stack/iu.test(error.message);
}

const ARRAY_RESULTS = new Set([
    "getSymbolsInScope", "getPropertiesOfType", "getSignaturesOfType", "getTypeArguments", "getAugmentedPropertiesOfType",
    "getIndexInfosOfType", "getExportsOfModule", "getRootSymbols", "getExportsAndPropertiesOfModule", "getAmbientModules",
    "getBaseTypes", "getExpandedParameters", "getIndexInfosOfIndexSymbol",
]);
const STRING_RESULTS = new Set(["typeToString", "symbolToString", "signatureToString", "typePredicateToString", "getFullyQualifiedName"]);

function fallback(checker: ts.TypeChecker, method: string): unknown {
    if (ARRAY_RESULTS.has(method)) return [];
    if (STRING_RESULTS.has(method)) return "any";
    if (method.startsWith("is")) return false;
    if (method.startsWith("get") && /Type(?:s|Of|At|From|$)|ConstraintOf/u.test(method) && !method.startsWith("getTypeArguments")) return checker.getAnyType();
    return undefined;
}

export function resilientTypeChecker(checker: ts.TypeChecker, onOverflow: (location: ts.Node | undefined) => void): ts.TypeChecker {
    const wrapped = new Map<PropertyKey, unknown>();
    return new Proxy(checker, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver) as unknown;
            if (typeof value !== "function" || typeof property !== "string") return value;
            let method = wrapped.get(property);
            if (!method) {
                method = (...args: unknown[]) => {
                    try {
                        return (value as (...inner: unknown[]) => unknown).apply(target, args);
                    } catch (error) {
                        if (!isStackOverflow(error)) throw error;
                        const first = args[0];
                        onOverflow(first && typeof first === "object" && "kind" in first && "pos" in first ? first as ts.Node : undefined);
                        return fallback(target, property);
                    }
                };
                wrapped.set(property, method);
            }
            return method;
        },
    });
}

/** getPreEmitDiagnostics with per-file semantic fallback when the checker overflows. */
export function preEmitDiagnostics(program: ts.Program, onOverflow: (location: ts.Node | undefined) => void): readonly ts.Diagnostic[] {
    try {
        return ts.getPreEmitDiagnostics(program);
    } catch (error) {
        if (!isStackOverflow(error)) throw error;
    }
    const diagnostics: ts.Diagnostic[] = [
        ...program.getConfigFileParsingDiagnostics(), ...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics(),
    ];
    try { diagnostics.push(...program.getGlobalDiagnostics()); } catch (error) { if (!isStackOverflow(error)) throw error; onOverflow(undefined); }
    for (const file of program.getSourceFiles()) {
        try { diagnostics.push(...program.getSemanticDiagnostics(file)); }
        catch (error) { if (!isStackOverflow(error)) throw error; onOverflow(file); }
    }
    return ts.sortAndDeduplicateDiagnostics(diagnostics);
}
