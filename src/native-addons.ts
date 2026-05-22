import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";

export interface NativeAddonManifest {
    entries: Map<string, string>;
}

export function emptyNativeAddonManifest(): NativeAddonManifest {
    return { entries: new Map() };
}

export function nativeAddonManifestHasEntries(manifest: NativeAddonManifest): boolean {
    return manifest.entries.size > 0;
}

export async function loadNativeAddonManifest(
    manifestPath: string | undefined,
): Promise<NativeAddonManifest> {
    if (!manifestPath) return emptyNativeAddonManifest();
    const resolvedManifestPath = path.resolve(manifestPath);
    const raw = await fs.readFile(resolvedManifestPath, "utf8");
    const parsed = JSON.parse(raw) as { addons?: unknown };
    if (!parsed.addons || typeof parsed.addons !== "object" || Array.isArray(parsed.addons)) {
        throw new Error("native addon manifest must contain an object-valued 'addons' field");
    }

    const manifestDir = path.dirname(resolvedManifestPath);
    const entries = new Map<string, string>();
    for (const [specifier, rawTarget] of Object.entries(parsed.addons)) {
        if (typeof rawTarget !== "string") {
            throw new Error(`native addon manifest entry '${specifier}' must be a string path`);
        }
        const resolvedTarget = path.resolve(manifestDir, rawTarget);
        if (!resolvedTarget.endsWith(".node")) {
            throw new Error(`native addon manifest entry '${specifier}' must point to a .node file`);
        }
        if (!fsSync.existsSync(resolvedTarget) || !fsSync.statSync(resolvedTarget).isFile()) {
            throw new Error(`native addon manifest entry '${specifier}' does not exist: ${resolvedTarget}`);
        }
        entries.set(specifier, resolvedTarget);
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
            entries.set(path.resolve(manifestDir, specifier), resolvedTarget);
        }
    }
    return { entries };
}

export function nativeAddonPathForSpecifier(
    manifest: NativeAddonManifest,
    specifier: string,
    containingFile: string,
): string | null {
    const exact = manifest.entries.get(specifier);
    if (exact) return exact;
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
        const resolvedSpecifier = path.resolve(path.dirname(containingFile), specifier);
        return manifest.entries.get(resolvedSpecifier) ?? null;
    }
    return null;
}
