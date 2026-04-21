/** Reserve common C keywords so TS identifiers don't collide. */
const C_RESERVED = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
    "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
    "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct",
    "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
    "_Alignas", "_Alignof", "_Atomic", "_Bool", "_Complex", "_Generic", "_Imaginary",
    "_Noreturn", "_Static_assert", "_Thread_local",
    "bool", "true", "false", "NULL",
    // Our own runtime prefix.
    "main", "argc", "argv",
]);

/** Produce a safe C identifier for a TS user identifier. */
export function mangleIdent(name: string): string {
    // Keep letters/digits/underscore; replace anything else with '_'.
    let safe = "";
    for (const c of name) {
        if (/[A-Za-z0-9_]/.test(c)) safe += c;
        else safe += "_";
    }
    // Disallow leading digit.
    if (/^[0-9]/.test(safe)) safe = "_" + safe;
    if (C_RESERVED.has(safe) || safe.startsWith("tsc_")) return "ts_" + safe;
    return safe;
}
