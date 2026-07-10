import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface DynamicRequireManifest {
    specifiers: string[];
    byFile?: Record<string, string[]>;
    exportNamesByFile?: Record<string, string[]>;
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
    const parsed = JSON.parse(raw) as { requires?: unknown; exports?: unknown };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("dynamic require manifest must be a JSON object");
    }
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
    const exportNamesByFile = manifestExportNamesByFile(parsed.exports);
    return {
        specifiers,
        ...((byFile || exportNamesByFile) ? { baseDir: path.dirname(path.resolve(manifestPath)) } : {}),
        ...(byFile ? { byFile } : {}),
        ...(exportNamesByFile ? { exportNamesByFile } : {}),
    };
}

function manifestExportNamesByFile(exports: unknown): Record<string, string[]> | null {
    if (exports === undefined) return null;
    if (!exports || typeof exports !== "object" || Array.isArray(exports)) {
        throw new Error("dynamic require manifest exports must be an object map");
    }
    const byFile: Record<string, string[]> = {};
    for (const [fileName, rawNames] of Object.entries(exports)) {
        if (fileName.length === 0) {
            throw new Error("dynamic require manifest export file keys must be non-empty strings");
        }
        if (!Array.isArray(rawNames) || rawNames.length === 0) {
            throw new Error("dynamic require manifest export entries require at least one name");
        }
        const seen = new Set<string>();
        const names: string[] = [];
        for (const rawName of rawNames) {
            if (typeof rawName !== "string" || rawName.length === 0) {
                throw new Error("dynamic require manifest export names must be non-empty strings");
            }
            if (seen.has(rawName)) continue;
            seen.add(rawName);
            names.push(rawName);
        }
        byFile[fileName] = names;
    }
    return byFile;
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

export function dynamicRequireExportNamesForFile(
    manifest: DynamicRequireManifest,
    fileName: string,
): string[] {
    if (!manifest.exportNamesByFile) return [];
    const normalizedFile = canonicalManifestFilePath(fileName);
    const baseDir = manifest.baseDir ?? process.cwd();
    for (const [rawPattern, names] of Object.entries(manifest.exportNamesByFile)) {
        if (normalizedFile === canonicalManifestFilePath(rawPattern, baseDir)) return names;
    }
    return [];
}

function dynamicRequireMappedSpecifiersForFile(
    manifest: DynamicRequireManifest,
    fileName: string,
): string[] | null {
    if (!manifest.byFile) return null;
    const normalizedFile = canonicalManifestFilePath(fileName);
    const baseDir = manifest.baseDir ?? process.cwd();
    for (const [rawPattern, specifiers] of Object.entries(manifest.byFile)) {
        const absolutePattern = canonicalManifestFilePath(rawPattern, baseDir);
        if (normalizedFile === absolutePattern) {
            return specifiers;
        }
    }
    return null;
}

function canonicalManifestFilePath(fileName: string, baseDir?: string): string {
    return path.normalize(baseDir ? path.resolve(baseDir, fileName) : path.resolve(fileName)).replace(/\\/g, "/");
}
