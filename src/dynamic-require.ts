import * as fs from "node:fs/promises";

export interface DynamicRequireManifest {
    specifiers: string[];
}

export function emptyDynamicRequireManifest(): DynamicRequireManifest {
    return { specifiers: [] };
}

export function dynamicRequireManifestHasEntries(manifest: DynamicRequireManifest): boolean {
    return manifest.specifiers.length > 0;
}

export async function loadDynamicRequireManifest(
    manifestPath: string | undefined,
): Promise<DynamicRequireManifest> {
    if (!manifestPath) return emptyDynamicRequireManifest();
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { requires?: unknown };
    const rawSpecifiers = manifestRequireSpecifiers(parsed.requires);
    if (!rawSpecifiers) {
        throw new Error("dynamic require manifest must contain 'requires' as an array or object map");
    }

    const seen = new Set<string>();
    const specifiers: string[] = [];
    for (const rawSpecifier of rawSpecifiers) {
        if (typeof rawSpecifier !== "string" || rawSpecifier.length === 0) {
            throw new Error("dynamic require manifest entries must be non-empty strings");
        }
        if (seen.has(rawSpecifier)) continue;
        seen.add(rawSpecifier);
        specifiers.push(rawSpecifier);
    }
    if (specifiers.length === 0) {
        throw new Error("dynamic require manifest requires at least one specifier");
    }
    return { specifiers };
}

function manifestRequireSpecifiers(requires: unknown): unknown[] | null {
    if (Array.isArray(requires)) return requires;
    if (requires && typeof requires === "object") return Object.values(requires);
    return null;
}
