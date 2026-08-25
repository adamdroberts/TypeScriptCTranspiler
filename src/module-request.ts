import ts from "typescript";
import { staticStringExpressionTexts } from "./module-specifiers";

/** ECMA-262 ImportAttribute Record, normalized in UTF-16 key order. */
export interface ImportAttributeRecord {
    readonly key: string;
    readonly value: string;
}

/** ECMA-262 ModuleRequest Record. */
export interface ModuleRequest {
    readonly specifier: string;
    readonly attributes: readonly ImportAttributeRecord[];
}

export type ModuleRequestParseResult =
    | { readonly request: ModuleRequest; readonly error: null }
    | { readonly request: null; readonly error: string };

type StaticModuleDeclaration = ts.ImportDeclaration | ts.ExportDeclaration;

export type DynamicImportSpecifiersParseResult =
    | { readonly specifiers: readonly string[]; readonly error: null }
    | { readonly specifiers: null; readonly error: string };

/**
 * Derive the finite canonical target-specifier collection for one ImportCall.
 *
 * Import options are deliberately absent from this AOT proof: ECMAScript
 * evaluates and validates that ordinary runtime value after both argument
 * expressions have completed. Only the set of code records that may need to
 * be linked is a compile-time concern.
 */
export function dynamicImportSpecifiersFromCall(
    call: ts.CallExpression,
): DynamicImportSpecifiersParseResult | null {
    if (call.expression.kind !== ts.SyntaxKind.ImportKeyword) return null;
    const specifier = call.arguments[0];
    if (!specifier) return { specifiers: null, error: "dynamic import requires a module specifier" };
    const specifiers = staticStringExpressionTexts(specifier);
    if (specifiers.length === 0) {
        return { specifiers: null, error: "dynamic import needs a finite AOT specifier proof" };
    }
    return {
        specifiers,
        error: null,
    };
}

/** Locate every ImportCall through one explicit source-tree worklist. */
export function dynamicImportCalls(root: ts.Node): ts.CallExpression[] {
    const calls: ts.CallExpression[] = [];
    const worklist: ts.Node[] = [root];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            calls.push(node);
        }
        node.forEachChild((child) => {
            worklist.push(child);
        });
    }
    return calls;
}

/**
 * Derive one canonical ModuleRequest Record from every static module edge.
 * Attribute keys and values come from the parser's decoded StringValue/PropName,
 * so escaped spellings participate in duplicate detection and equality exactly
 * like their unescaped equivalents.
 */
export function moduleRequestFromDeclaration(
    declaration: StaticModuleDeclaration,
): ModuleRequestParseResult | null {
    const specifier = declaration.moduleSpecifier;
    if (!specifier || !ts.isStringLiteralLike(specifier)) return null;

    const clause = declaration.attributes;
    if (!clause) {
        return {
            request: { specifier: specifier.text, attributes: [] },
            error: null,
        };
    }
    if (clause.token !== ts.SyntaxKind.WithKeyword) {
        return {
            request: null,
            error: "legacy import assertions are not valid ECMAScript 2026 import attributes",
        };
    }

    const attributes: ImportAttributeRecord[] = [];
    const keys = new Set<string>();
    for (const element of clause.elements) {
        const key = element.name.text;
        if (!ts.isStringLiteralLike(element.value)) {
            return {
                request: null,
                error: `import attribute ${JSON.stringify(key)} must have a string literal value`,
            };
        }
        if (keys.has(key)) {
            return {
                request: null,
                error: `duplicate import attribute key ${JSON.stringify(key)}`,
            };
        }
        keys.add(key);
        attributes.push({ key, value: element.value.text });
    }
    attributes.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
    return {
        request: { specifier: specifier.text, attributes },
        error: null,
    };
}

export function moduleRequestsEqual(left: ModuleRequest, right: ModuleRequest): boolean {
    return moduleRequestKey(left) === moduleRequestKey(right);
}

/** Stable order-independent identity for ModuleRequest Records. */
export function moduleRequestKey(request: ModuleRequest): string {
    const attributes = [...request.attributes].sort((left, right) => {
        if (left.key !== right.key) return left.key < right.key ? -1 : 1;
        return left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
    });
    return JSON.stringify([
        request.specifier,
        attributes.map((attribute) => [attribute.key, attribute.value]),
    ]);
}

/**
 * ECMA-262 ModuleRequests list accumulation, independent of declaration count.
 * The first equal request retains its source order and all distinct requests are
 * represented by the same map-backed path.
 */
export function uniqueModuleRequests(requests: Iterable<ModuleRequest>): ModuleRequest[] {
    const unique = new Map<string, ModuleRequest>();
    for (const request of requests) {
        const key = moduleRequestKey(request);
        if (!unique.has(key)) unique.set(key, request);
    }
    return [...unique.values()];
}

/**
 * Native AOT host selection for static Module Requests.
 *
 * The host supports the `type` key with `json` and `javascript` values. JSON
 * resources require `json`; ordinary ECMAScript Modules accept no type or
 * `javascript`. Unknown keys and mismatched pairs fail during resolution.
 */
export function staticModuleRequestResolutionError(
    request: ModuleRequest,
    resolvedFileName: string,
): string | null {
    const unsupported = request.attributes.find((attribute) => attribute.key !== "type");
    if (unsupported) {
        return `unsupported import attribute ${JSON.stringify(unsupported.key)}`;
    }
    const type = request.attributes.find((attribute) => attribute.key === "type")?.value;
    const json = /\.json$/i.test(resolvedFileName);
    if (json && type !== "json") {
        return "JSON modules require import attribute type \"json\"";
    }
    if (!json && type !== undefined && type !== "javascript") {
        return `import attribute type ${JSON.stringify(type)} does not match an ECMAScript Module`;
    }
    return null;
}
