#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseFeatureRegistry, parseTest262Metadata } from "./metadata";
import {
    argumentValue,
    complianceDir,
    defaultCacheRoot,
    hasArgument,
    loadBaseline,
    pathExists,
    readJson,
    stableJson,
    verifyPinnedCheckout,
    type Baseline,
} from "./model";

export interface FeatureMapEntry {
    tag: string;
    disposition: "standard" | "ecma402-only" | "harness-only" | "post-edition";
    tracking: "todo" | "ready-for-verification";
    clauses: string[];
    rationale: string;
}

export interface FeatureMap {
    schemaVersion: 1;
    test262Commit: string;
    features: FeatureMapEntry[];
}

async function featureUsage(test262: string, roots: readonly string[], excludedRoots: readonly string[] = []): Promise<Set<string>> {
    const result = new Set<string>();
    const worklist = roots.map((root) => path.join(test262, root));
    const excluded = excludedRoots.map((root) => `${path.join(test262, root)}${path.sep}`);
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        if (excluded.some((root) => `${current}${path.sep}`.startsWith(root))) continue;
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
            throw error;
        }
        for (const entry of entries) {
            const filename = path.join(current, entry.name);
            if (entry.isDirectory()) worklist.push(filename);
            else if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.includes("_FIXTURE")) {
                const metadata = parseTest262Metadata(await fs.readFile(filename, "utf8"), filename);
                for (const feature of metadata.features) result.add(feature);
            }
        }
    }
    return result;
}

export async function deriveEcma402FeatureTags(
    test262: string,
    baseline: Baseline,
    standardFeatures: ReadonlySet<string>,
): Promise<string[]> {
    const [ecma262Usage, ecma402Usage] = await Promise.all([
        featureUsage(test262, baseline.test262.discoveryRoots, baseline.test262.ecma402Roots),
        featureUsage(test262, baseline.test262.ecma402Roots),
    ]);
    return [...standardFeatures]
        .filter((tag) => ecma402Usage.has(tag) && !ecma262Usage.has(tag))
        .sort();
}

async function main(): Promise<void> {
    const baseline = await loadBaseline();
    const test262 = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const output = path.join(complianceDir, "feature-map.json");
    await verifyPinnedCheckout("Test262", test262, baseline.test262);
    const registry = parseFeatureRegistry(await fs.readFile(path.join(test262, "features.txt"), "utf8"));
    const derivedEcma402Features = await deriveEcma402FeatureTags(test262, baseline, registry.standard);
    if (JSON.stringify(derivedEcma402Features) !== JSON.stringify([...baseline.test262.ecma402FeatureTags].sort())) {
        throw new Error("baseline ECMA-402-only feature tags differ from independent pinned-corpus usage");
    }
    const ecma402Features = new Set(derivedEcma402Features);
    const existing = await pathExists(output)
        ? await readJson<FeatureMap>(output)
        : { schemaVersion: 1 as const, test262Commit: baseline.test262.commit, features: [] };
    const existingByTag = new Map(existing.features.map((entry) => [entry.tag, entry]));
    const features: FeatureMapEntry[] = [];
    for (const tag of [...registry.all].sort()) {
        const disposition = registry.proposed.has(tag)
            ? "post-edition"
            : registry.harness.has(tag)
                ? "harness-only"
                : ecma402Features.has(tag)
                    ? "ecma402-only"
                    : "standard";
        const prior = existingByTag.get(tag);
        features.push(prior && prior.disposition === disposition
            ? prior
            : {
                tag,
                disposition,
                tracking: disposition === "standard" ? "todo" : "ready-for-verification",
                clauses: [],
                rationale: disposition === "standard"
                    ? "Map this standard feature tag to every pinned clause it exercises before verification."
                    : disposition === "harness-only"
                        ? "Pinned Test262 host capability tag; clause evidence comes from the tagged test metadata."
                        : disposition === "ecma402-only"
                            ? "Excluded from the ECMA-262 claim because independent pinned-corpus usage is confined to ECMA-402 tests."
                            : "Excluded because the pinned Test262 registry classifies this as a post-edition proposal.",
            });
    }
    const rendered = stableJson({ schemaVersion: 1, test262Commit: baseline.test262.commit, features });
    if (hasArgument("--check")) {
        if (await fs.readFile(output, "utf8") !== rendered) throw new Error(`${output} is stale; regenerate it from pinned features.txt`);
        console.log(`Pinned Test262 feature map is current: ${output}`);
        return;
    }
    await fs.writeFile(output, rendered, "utf8");
    console.log(`Wrote ${output}`);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`feature map: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
