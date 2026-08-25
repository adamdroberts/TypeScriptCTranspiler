import ts from "typescript";

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
