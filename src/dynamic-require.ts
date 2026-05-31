import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface DynamicRequireManifest {
    specifiers: string[];
    byFile?: Record<string, string[]>;
    baseDir?: string;
}

export function emptyDynamicRequireManifest(): DynamicRequireManifest {
    return { specifiers: [] };
}

export function dynamicRequireManifestHasEntries(manifest: DynamicRequireManifest): boolean {
    return manifest.specifiers.length > 0 || Object.keys(manifest.byFile ?? {}).length > 0;
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
    const byFile = manifestRequireSpecifiersByFile(parsed.requires);
    return {
        specifiers,
        ...(byFile ? { byFile, baseDir: path.dirname(path.resolve(manifestPath)) } : {}),
    };
}

function manifestRequireSpecifiers(requires: unknown): unknown[] | null {
    if (Array.isArray(requires)) return requires;
    if (!requires || typeof requires !== "object") return null;
    const values = Object.values(requires);
    if (values.every((value) => Array.isArray(value))) {
        return values.flatMap((value) => value as unknown[]);
    }
    if (values.some((value) => Array.isArray(value))) return null;
    return values;
}

function manifestRequireSpecifiersByFile(requires: unknown): Record<string, string[]> | null {
    if (!requires || typeof requires !== "object" || Array.isArray(requires)) return null;
    const entries = Object.entries(requires);
    if (!entries.every(([, value]) => Array.isArray(value))) return null;
    const byFile: Record<string, string[]> = {};
    for (const [fileName, rawSpecifiers] of entries) {
        if (fileName.length === 0) {
            throw new Error("dynamic require manifest file keys must be non-empty strings");
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
            throw new Error("dynamic require manifest file entries require at least one specifier");
        }
        byFile[fileName] = specifiers;
    }
    return byFile;
}

export function dynamicRequireSpecifiersForFile(
    manifest: DynamicRequireManifest,
    fileName: string,
): string[] {
    if (!manifest.byFile) return manifest.specifiers;
    const matched = dynamicRequireMappedSpecifiersForFile(manifest, fileName);
    return matched ?? [];
}

function dynamicRequireMappedSpecifiersForFile(
    manifest: DynamicRequireManifest,
    fileName: string,
): string[] | null {
    if (!manifest.byFile) return null;
    const normalizedFile = normalizeManifestPath(path.resolve(fileName));
    const baseDir = manifest.baseDir ?? process.cwd();
    for (const [rawPattern, specifiers] of Object.entries(manifest.byFile)) {
        const normalizedPattern = normalizeManifestPath(rawPattern);
        const absolutePattern = normalizeManifestPath(path.resolve(baseDir, rawPattern));
        if (
            normalizedFile === absolutePattern ||
            normalizedFile === normalizedPattern ||
            normalizedFile.endsWith(`/${normalizedPattern}`)
        ) {
            return specifiers;
        }
    }
    return null;
}

function normalizeManifestPath(fileName: string): string {
    return fileName.replace(/\\/g, "/");
}
