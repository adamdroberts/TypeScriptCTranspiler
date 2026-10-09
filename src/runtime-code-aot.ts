import * as fs from "node:fs/promises";
import ts from "typescript";
import { createEcmaSourceFile } from "./ecmascript-source";
import type { FunctionConstructorSource } from "./function-constructor-source";

export type AotRuntimeConstant =
    | { kind: "number"; value: number }
    | { kind: "string"; value: string }
    | { kind: "boolean"; value: boolean }
    | { kind: "null" }
    | { kind: "undefined" };

export interface AotRuntimeCodeEntry {
    source: string;
    constant: AotRuntimeConstant;
}

export interface RuntimeCodeManifest {
    eval: AotRuntimeCodeEntry[];
    functions: FunctionConstructorSource[];
}

export function emptyRuntimeCodeManifest(): RuntimeCodeManifest {
    return { eval: [], functions: [] };
}

export function runtimeCodeManifestHasEval(manifest: RuntimeCodeManifest): boolean {
    return manifest.eval.length > 0;
}

export function runtimeCodeManifestHasFunctions(manifest: RuntimeCodeManifest): boolean {
    return manifest.functions.length > 0;
}

export async function loadRuntimeCodeManifest(
    manifestPath: string | undefined,
): Promise<RuntimeCodeManifest> {
    if (!manifestPath) return emptyRuntimeCodeManifest();
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { eval?: unknown; functions?: unknown };
    return {
        eval: parseManifestList(parsed.eval, "eval", parseAotEvalConstant),
        functions: parseFunctionManifest(parsed.functions),
    };
}

export function parseAotEvalConstant(source: string): AotRuntimeConstant | null {
    if (source.trim() === "") return { kind: "undefined" };
    const expr = parseExpression(source);
    return expr ? evaluateConstant(expr) : null;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
    while (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression)
    ) {
        expression = expression.expression;
    }
    return expression;
}

function parseExpression(source: string): ts.Expression | null {
    const sf = createEcmaSourceFile(
        "runtime-code-aot.ts",
        `(${source});`,
        ts.ScriptTarget.ES2022,
        true,
        ts.ScriptKind.TS,
    );
    const stmt = sf.statements[0];
    if (!stmt || !ts.isExpressionStatement(stmt)) return null;
    const expr = stmt.expression;
    return ts.isParenthesizedExpression(expr) ? expr.expression : expr;
}

function evaluateConstant(expr: ts.Expression): AotRuntimeConstant | null {
    expr = unwrapExpression(expr);

    if (ts.isNumericLiteral(expr)) return { kind: "number", value: Number(expr.text) };
    if (ts.isStringLiteralLike(expr)) return { kind: "string", value: expr.text };
    if (expr.kind === ts.SyntaxKind.TrueKeyword) return { kind: "boolean", value: true };
    if (expr.kind === ts.SyntaxKind.FalseKeyword) return { kind: "boolean", value: false };
    if (expr.kind === ts.SyntaxKind.NullKeyword) return { kind: "null" };
    if (ts.isIdentifier(expr) && expr.text === "undefined") return { kind: "undefined" };
    if (ts.isVoidExpression(expr)) return { kind: "undefined" };

    if (ts.isTemplateExpression(expr)) {
        let out = expr.head.text;
        for (const span of expr.templateSpans) {
            const value = evaluateConstant(span.expression);
            if (!value) return null;
            out += String(constantToJsValue(value));
            out += span.literal.text;
        }
        return { kind: "string", value: out };
    }

    if (ts.isConditionalExpression(expr)) {
        const condition = evaluateConstant(expr.condition);
        if (!condition) return null;
        return Boolean(constantToJsValue(condition))
            ? evaluateConstant(expr.whenTrue)
            : evaluateConstant(expr.whenFalse);
    }

    if (ts.isPrefixUnaryExpression(expr)) {
        const value = evaluateConstant(expr.operand);
        if (value?.kind !== "number") return null;
        switch (expr.operator) {
            case ts.SyntaxKind.PlusToken:
                return value;
            case ts.SyntaxKind.MinusToken:
                return { kind: "number", value: -value.value };
            default:
                return null;
        }
    }

    if (ts.isBinaryExpression(expr)) {
        const left = evaluateConstant(expr.left);
        if (!left) return null;
        switch (expr.operatorToken.kind) {
            case ts.SyntaxKind.BarBarToken:
                return Boolean(constantToJsValue(left)) ? left : evaluateConstant(expr.right);
            case ts.SyntaxKind.AmpersandAmpersandToken:
                return Boolean(constantToJsValue(left)) ? evaluateConstant(expr.right) : left;
            case ts.SyntaxKind.QuestionQuestionToken:
                return left.kind === "null" || left.kind === "undefined"
                    ? evaluateConstant(expr.right)
                    : left;
        }

        const right = evaluateConstant(expr.right);
        if (!right) return null;
        switch (expr.operatorToken.kind) {
            case ts.SyntaxKind.PlusToken:
                if (left.kind === "string" || right.kind === "string") {
                    return { kind: "string", value: String(constantToJsValue(left)) + String(constantToJsValue(right)) };
                }
                if (left.kind === "number" && right.kind === "number") {
                    return { kind: "number", value: left.value + right.value };
                }
                return null;
            case ts.SyntaxKind.MinusToken:
                return numberBinary(left, right, (a, b) => a - b);
            case ts.SyntaxKind.AsteriskToken:
                return numberBinary(left, right, (a, b) => a * b);
            case ts.SyntaxKind.SlashToken:
                return numberBinary(left, right, (a, b) => a / b);
            case ts.SyntaxKind.PercentToken:
                return numberBinary(left, right, (a, b) => a % b);
            default:
                return null;
        }
    }

    return null;
}

function numberBinary(
    left: AotRuntimeConstant,
    right: AotRuntimeConstant,
    op: (left: number, right: number) => number,
): AotRuntimeConstant | null {
    if (left.kind !== "number" || right.kind !== "number") return null;
    return { kind: "number", value: op(left.value, right.value) };
}

function constantToJsValue(value: AotRuntimeConstant): unknown {
    switch (value.kind) {
        case "number":
        case "string":
        case "boolean":
            return value.value;
        case "null":
            return null;
        case "undefined":
            return undefined;
    }
}

function parseFunctionManifest(raw: unknown): FunctionConstructorSource[] {
    if (raw === undefined) return [];
    const entries = manifestSourceEntries(raw);
    if (!entries) throw new Error("runtime code manifest field 'functions' must be an array or object map");
    return entries.map(entry => {
        if (typeof entry === "string") return { parameters: "", body: entry };
        if (entry && typeof entry === "object" && "body" in entry && "parameters" in entry) {
            const { body, parameters } = entry as { body: unknown; parameters: unknown };
            if (typeof body === "string" && (typeof parameters === "string" ||
                Array.isArray(parameters) && parameters.every(value => typeof value === "string"))) {
                return { parameters: typeof parameters === "string" ? parameters : parameters.join(","), body };
            }
        }
        throw new Error("runtime code manifest function entries require a body string and parameter strings");
    });
}

function parseManifestList(
    raw: unknown,
    fieldName: string,
    parse: (source: string) => AotRuntimeConstant | null,
): AotRuntimeCodeEntry[] {
    if (raw === undefined) return [];
    const rawEntries = manifestSourceEntries(raw);
    if (!rawEntries) {
        throw new Error(`runtime code manifest field '${fieldName}' must be an array or object map of strings`);
    }
    const entries: AotRuntimeCodeEntry[] = [];
    const seen = new Set<string>();
    for (const item of rawEntries) {
        if (typeof item !== "string" || item.length === 0) {
            throw new Error(`runtime code manifest field '${fieldName}' entries must be non-empty strings`);
        }
        if (seen.has(item)) continue;
        const constant = parse(item);
        if (!constant) {
            throw new Error(`runtime code manifest field '${fieldName}' entry is not supported for AOT: ${item}`);
        }
        seen.add(item);
        entries.push({ source: item, constant });
    }
    return entries;
}

function manifestSourceEntries(raw: unknown): unknown[] | null {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") return Object.values(raw);
    return null;
}
