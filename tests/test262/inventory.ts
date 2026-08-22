#!/usr/bin/env bun
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    argumentValue,
    complianceDir,
    defaultArtifactRoot,
    defaultCacheRoot,
    hasArgument,
    git,
    loadBaseline,
    pathExists,
    readJson,
    sha256File,
    sha256Text,
    stableJson,
    verifyPinnedCheckout,
} from "./model";
import {
    expandModes,
    parseFeatureRegistry,
    parseTest262Metadata,
    scenarioSource,
    type NegativePhase,
    type Test262Metadata,
    type Test262Mode,
} from "./metadata";
import type { ClauseCatalog } from "./spec-catalog";
import type { FeatureMap } from "./feature-map";

type ScenarioScope = "in-scope" | "post-edition" | "runner-self-test" | "ecma402";

interface MatrixGroup {
    id: string;
    rootClause: string;
}

interface Matrix {
    schemaVersion: number;
    groups: MatrixGroup[];
}

interface ReviewedMapping {
    clauses: string[];
    reason: string;
    reviewedBy: string;
}

interface EsidAlias extends ReviewedMapping {
    esid: string;
}

interface PathRule extends ReviewedMapping {
    prefix: string;
}

interface TestOverride extends ReviewedMapping {
    test: string;
    sourceSha256: string;
    reasonKind: "ambiguous-metadata";
}

interface MappingOverrides {
    schemaVersion: number;
    esidAliases: EsidAlias[];
    pathRules: PathRule[];
    testOverrides: TestOverride[];
}

export interface InventoryIssue {
    code:
        | "metadata-error"
        | "unknown-feature"
        | "unmapped-feature"
        | "unknown-esid"
        | "missing-clause-mapping"
        | "missing-harness-include"
        | "invalid-override";
    test: string;
    detail: string;
    claimBlocking: boolean;
}

export interface ScenarioRecord {
    id: string;
    test: string;
    mode: Test262Mode;
    scope: ScenarioScope;
    scopeReason: string;
    sourceSha256: string;
    scenarioSourceSha256: string;
    flags: string[];
    features: string[];
    includes: Array<{ path: string; sha256: string }>;
    esid?: string;
    es5id?: string;
    es6id?: string;
    esidResolution?: { anchor: string; clause: string; kind: "exact" };
    mappingSources: string[];
    negative?: { phase: NegativePhase; type: string };
    raw: boolean;
    async: boolean;
    canBlock: boolean | null;
    nonDeterministic: boolean;
    clauseIds: string[];
    matrixGroups: string[];
    moduleDependencies: Array<{ path: string; sha256: string }>;
}

export interface Test262Inventory {
    schemaVersion: 1;
    kind: "test262-inventory";
    baseline: {
        edition: 17;
        ecma262Commit: string;
        test262Commit: string;
        test262Tree: string;
    };
    selection: {
        exhaustive: boolean;
        filter: string | null;
        shard: { index: number; total: number } | null;
        scenarioSetSha256: string;
    };
    corpusManifestSha256: string;
    catalogSha256: string;
    featureRegistry: {
        proposed: string[];
        standard: string[];
        harness: string[];
    };
    issues: InventoryIssue[];
    scenarios: ScenarioRecord[];
}

async function walkFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    const worklist = [directory];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (let index = entries.length - 1; index >= 0; index--) {
            const entry = entries[index]!;
            const entryPath = path.join(current, entry.name);
            if (entry.isDirectory()) worklist.push(entryPath);
            else if (entry.isFile()) files.push(entryPath);
        }
    }
    return files.sort((a, b) => a.localeCompare(b));
}

function gitBlobSha1(content: Uint8Array): string {
    const header = Buffer.from(`blob ${content.byteLength}\0`);
    return createHash("sha1").update(header).update(content).digest("hex");
}

export async function verifyTest262Corpus(test262: string, roots: readonly string[]): Promise<{
    files: string[];
    entries: Array<{ path: string; blob: string; sha256: string }>;
    manifestSha256: string;
}> {
    const listed = await git(test262, ["ls-tree", "-r", "HEAD", "--", ...roots]);
    const blobs = new Map<string, string>();
    for (const line of listed.split("\n").filter(Boolean)) {
        const match = line.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/);
        if (!match) continue;
        blobs.set(match[2]!, match[1]!);
    }
    const filesystemFiles: string[] = [];
    for (const root of roots) {
        filesystemFiles.push(...(await walkFiles(path.join(test262, root))).map((filename) => relativeTestPath(test262, filename)));
    }
    const actualFiles = [...new Set(filesystemFiles)].sort();
    const gitFiles = [...blobs.keys()].sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(gitFiles)) {
        throw new Error("filesystem Test262 discovery differs from the independent pinned Git tree set");
    }
    const manifest: Array<{ path: string; blob: string; sha256: string }> = [];
    for (const filename of gitFiles) {
        const content = await fs.readFile(path.join(test262, filename));
        const expectedBlob = blobs.get(filename)!;
        if (gitBlobSha1(content) !== expectedBlob) {
            throw new Error(`${filename} worktree bytes differ from the pinned Git blob`);
        }
        manifest.push({ path: filename, blob: expectedBlob, sha256: sha256Text(content) });
    }
    return {
        files: gitFiles.filter((filename) => filename.endsWith(".js")),
        entries: manifest,
        manifestSha256: sha256Text(JSON.stringify(manifest)),
    };
}

function relativeTestPath(test262: string, filename: string): string {
    return path.relative(test262, filename).split(path.sep).join("/");
}

function parseShard(raw: string | undefined): { index: number; total: number } | null {
    if (!raw) return null;
    const match = raw.match(/^(\d+)\/(\d+)$/);
    if (!match) throw new Error("--shard must use zero-based INDEX/TOTAL syntax");
    const index = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
        throw new Error("--shard must satisfy 0 <= INDEX < TOTAL");
    }
    return { index, total };
}

function belongsToShard(id: string, shard: { index: number; total: number } | null): boolean {
    if (!shard) return true;
    const bucket = Number.parseInt(sha256Text(id).slice(0, 8), 16) % shard.total;
    return bucket === shard.index;
}

function scopeFor(
    test: string,
    features: readonly string[],
    proposed: ReadonlySet<string>,
): { scope: ScenarioScope; reason: string } {
    if (test.startsWith("test/intl402/") || test.startsWith("test/staging/intl402/")) {
        return { scope: "ecma402", reason: "ECMA-402 is outside the ECMA-262 claim" };
    }
    if (test.startsWith("test/harness/")) {
        return { scope: "runner-self-test", reason: "Test262 harness validation, required as runner evidence" };
    }
    const proposal = features.find((feature) => proposed.has(feature));
    if (proposal) {
        return { scope: "post-edition", reason: `feature ${proposal} is post-ECMAScript-2026 at the pin` };
    }
    return { scope: "in-scope", reason: "ECMA-262 2026 language/built-in/Annex B evidence" };
}

function normalizeMappings(
    overrides: MappingOverrides,
    clauseIds: ReadonlySet<string>,
    issues: InventoryIssue[],
): {
    aliases: Map<string, EsidAlias>;
    pathRules: PathRule[];
    tests: Map<string, TestOverride>;
} {
    const aliases = new Map<string, EsidAlias>();
    const rules = new Map<string, PathRule>();
    const tests = new Map<string, TestOverride>();
    const validBase = (mapping: ReviewedMapping): boolean =>
        Array.isArray(mapping.clauses) &&
        mapping.clauses.length > 0 &&
        new Set(mapping.clauses).size === mapping.clauses.length &&
        mapping.clauses.every((id) => clauseIds.has(id)) &&
        typeof mapping.reason === "string" &&
        mapping.reason.trim() !== "" &&
        typeof mapping.reviewedBy === "string" &&
        mapping.reviewedBy.trim() !== "";
    const invalid = (name: string, detail: string): void => {
        issues.push({ code: "invalid-override", test: name, detail, claimBlocking: true });
    };
    for (const alias of overrides.esidAliases ?? []) {
        if (!validBase(alias) || typeof alias.esid !== "string" || alias.esid.trim() === "" || aliases.has(alias.esid)) {
            invalid(String(alias.esid), "esid alias must be unique, reviewed, reasoned, and map to pinned clauses");
        } else aliases.set(alias.esid, alias);
    }
    for (const rule of overrides.pathRules ?? []) {
        if (
            !validBase(rule) ||
            typeof rule.prefix !== "string" ||
            !rule.prefix.startsWith("test/") ||
            !rule.prefix.endsWith("/") ||
            rule.prefix.includes("..") ||
            /[*?\[\]]/.test(rule.prefix) ||
            rules.has(rule.prefix)
        ) {
            invalid(String(rule.prefix), "path rule must be one unique reviewed semantic directory prefix and reference pinned clauses");
        } else rules.set(rule.prefix, rule);
    }
    for (const override of overrides.testOverrides ?? []) {
        if (
            !validBase(override) ||
            typeof override.test !== "string" ||
            !override.test.startsWith("test/") ||
            /[*?\[\]]/.test(override.test) ||
            !/^[0-9a-f]{64}$/.test(override.sourceSha256) ||
            override.reasonKind !== "ambiguous-metadata" ||
            tests.has(override.test)
        ) {
            issues.push({
                code: "invalid-override",
                test: String(override.test),
                detail: "test override must be unique, exact, source-hashed, ambiguity-only, reviewed, and reference pinned clauses",
                claimBlocking: true,
            });
        } else tests.set(override.test, override);
    }
    return { aliases, pathRules: [...rules.values()].sort((a, b) => b.prefix.length - a.prefix.length), tests };
}

export function harnessIncludeNames(flags: readonly string[], includes: readonly string[]): string[] {
    if (flags.includes("raw")) return [];
    return ["assert.js", "sta.js", ...(flags.includes("async") ? ["doneprintHandle.js"] : []), ...includes];
}

export function needsModuleDirectory(metadata: Pick<Test262Metadata, "flags" | "features">, source: string): boolean {
    return metadata.flags.includes("module") ||
        metadata.features.includes("dynamic-import") ||
        /\bimport\s*\(/.test(source);
}

export function siblingModuleResources(
    test: string,
    entries: ReadonlyArray<{ path: string; sha256: string }>,
): Array<{ path: string; sha256: string }> {
    return entries
        .filter((entry) => entry.path !== test && path.posix.dirname(entry.path) === path.posix.dirname(test))
        .map((entry) => ({ path: entry.path, sha256: entry.sha256 }))
        .sort((left, right) => left.path.localeCompare(right.path));
}

async function harnessIncludes(
    test262: string,
    test: string,
    flags: readonly string[],
    includes: readonly string[],
    issues: InventoryIssue[],
): Promise<Array<{ path: string; sha256: string }>> {
    const names = harnessIncludeNames(flags, includes);
    const result: Array<{ path: string; sha256: string }> = [];
    for (const name of names) {
        const normalized = path.posix.normalize(name);
        if (normalized !== name || name.includes("\\") || path.posix.isAbsolute(name) || name === "." || name === ".." || name.startsWith("../")) {
            issues.push({
                code: "missing-harness-include",
                test,
                detail: `invalid harness include path ${name}`,
                claimBlocking: true,
            });
            continue;
        }
        const filename = path.join(test262, "harness", name);
        if (!(await pathExists(filename))) {
            issues.push({
                code: "missing-harness-include",
                test,
                detail: `missing harness/${name}`,
                claimBlocking: true,
            });
            continue;
        }
        result.push({ path: `harness/${name}`, sha256: await sha256File(filename) });
    }
    return result;
}

export async function buildInventory(options: {
    test262: string;
    filter: string | null;
    shard: { index: number; total: number } | null;
}): Promise<Test262Inventory> {
    const baseline = await loadBaseline();
    await verifyPinnedCheckout("Test262", options.test262, baseline.test262);
    const [catalogRaw, matrix, featureMap, overrides, featureSource] = await Promise.all([
        fs.readFile(path.join(complianceDir, "clauses.json"), "utf8"),
        readJson<Matrix>(path.join(complianceDir, "matrix.json")),
        readJson<FeatureMap>(path.join(complianceDir, "feature-map.json")),
        readJson<MappingOverrides>(path.join(complianceDir, "mapping-overrides.json")),
        fs.readFile(path.join(options.test262, "features.txt"), "utf8"),
    ]);
    const catalog = JSON.parse(catalogRaw) as ClauseCatalog;
    const clauseById = new Map(catalog.clauses.map((clause) => [clause.id, clause]));
    const clauseIds = new Set(clauseById.keys());
    const anchorById = new Map(catalog.anchors.map((anchor) => [anchor.id, anchor]));
    const groupByRoot = new Map(matrix.groups.map((group) => [group.rootClause, group.id]));
    const registry = parseFeatureRegistry(featureSource);
    const featureByTag = new Map(featureMap.features.map((feature) => [feature.tag, feature]));
    if (
        featureMap.test262Commit !== baseline.test262.commit ||
        JSON.stringify([...featureByTag.keys()].sort()) !== JSON.stringify([...registry.all].sort())
    ) {
        throw new Error("feature-map.json is stale or incomplete for the pinned Test262 feature registry");
    }
    const expectedProposals = [...baseline.test262.postEditionFeatureTags].sort();
    const actualProposals = [...registry.proposed].sort();
    if (JSON.stringify(expectedProposals) !== JSON.stringify(actualProposals)) {
        throw new Error("Test262 proposed-feature registry differs from the reviewed ES2026 baseline");
    }
    const issues: InventoryIssue[] = [];
    const mappings = normalizeMappings(overrides, clauseIds, issues);
    const usedAliases = new Set<string>();
    const usedPathRules = new Set<string>();
    const usedTestOverrides = new Set<string>();
    const corpus = await verifyTest262Corpus(options.test262, baseline.test262.discoveryRoots);
    const files = corpus.files.map((filename) => path.join(options.test262, filename));
    const scenarios: ScenarioRecord[] = [];
    for (const filename of [...new Set(files)].sort()) {
        const test = relativeTestPath(options.test262, filename);
        if (test.includes("_FIXTURE")) continue;
        if (options.filter && !test.includes(options.filter)) continue;
        const source = await fs.readFile(filename, "utf8");
        let metadata;
        let modes: Test262Mode[];
        try {
            metadata = parseTest262Metadata(source, test);
            modes = expandModes(metadata, test);
        } catch (error) {
            issues.push({
                code: "metadata-error",
                test,
                detail: error instanceof Error ? error.message : String(error),
                claimBlocking: true,
            });
            continue;
        }
        const scope = scopeFor(test, metadata.features, registry.proposed);
        let mappedClauses: string[] = [];
        const mappingSources: string[] = [];
        for (const feature of metadata.features) {
            if (!registry.all.has(feature)) {
                issues.push({
                    code: "unknown-feature",
                    test,
                    detail: `feature ${feature} is absent from pinned features.txt`,
                    claimBlocking: scope.scope === "in-scope",
                });
            } else {
                const mapping = featureByTag.get(feature)!;
                if (scope.scope === "in-scope" && mapping.disposition === "standard") {
                    if (mapping.tracking !== "ready-for-verification" || mapping.clauses.length === 0) {
                        issues.push({
                            code: "unmapped-feature",
                            test,
                            detail: `standard feature ${feature} has no reviewed ready clause mapping`,
                            claimBlocking: true,
                        });
                    }
                    mappedClauses = [...new Set([...mappedClauses, ...mapping.clauses])].sort();
                    if (mapping.clauses.length > 0) mappingSources.push(`feature:${feature}`);
                }
            }
        }
        let esidResolution: ScenarioRecord["esidResolution"];
        const exactAnchor = metadata.esid ? anchorById.get(metadata.esid) : undefined;
        if (metadata.esid && exactAnchor) {
            mappedClauses = [...new Set([...mappedClauses, exactAnchor.clauseId])].sort();
            mappingSources.push(`esid:${metadata.esid}`);
            esidResolution = {
                anchor: exactAnchor.id,
                clause: exactAnchor.clauseId,
                kind: "exact",
            };
        } else if (scope.scope === "in-scope") {
            const alias = metadata.esid ? mappings.aliases.get(metadata.esid) : undefined;
            const pathRule = metadata.esid === undefined
                ? mappings.pathRules.find((rule) => test.startsWith(rule.prefix))
                : undefined;
            const override = mappings.tests.get(test);
            if (alias) {
                mappedClauses = [...new Set([...mappedClauses, ...alias.clauses])].sort();
                mappingSources.push(`esid-alias:${alias.esid}`);
                usedAliases.add(alias.esid);
            } else if (pathRule) {
                mappedClauses = [...new Set([...mappedClauses, ...pathRule.clauses])].sort();
                mappingSources.push(`path-rule:${pathRule.prefix}`);
                usedPathRules.add(pathRule.prefix);
            } else if (override) {
                if (override.sourceSha256 !== sha256Text(source)) {
                    issues.push({
                        code: "invalid-override",
                        test,
                        detail: "exact test override source hash differs from the pinned corpus",
                        claimBlocking: true,
                    });
                } else {
                    mappedClauses = [...new Set([...mappedClauses, ...override.clauses])].sort();
                    mappingSources.push(`test-override:${test}`);
                    usedTestOverrides.add(test);
                }
            } else if (metadata.esid) {
                issues.push({
                    code: "unknown-esid",
                    test,
                    detail: `esid ${metadata.esid} is absent from the pinned ECMAScript 2026 catalog and has no reviewed alias`,
                    claimBlocking: true,
                });
            }
        }
        if (mappedClauses.length === 0 && scope.scope === "in-scope") {
            issues.push({
                code: "missing-clause-mapping",
                test,
                detail: "no current esid, standard feature mapping, structural mapping rule, or reviewed exact ambiguity override",
                claimBlocking: true,
            });
        }
        const matrixGroups = new Set<string>();
        for (const clauseId of mappedClauses) {
            const root = clauseById.get(clauseId)?.rootId;
            const group = root ? groupByRoot.get(root) : undefined;
            if (group) matrixGroups.add(group);
        }
        const includes = await harnessIncludes(options.test262, test, metadata.flags, metadata.includes, issues);
        const moduleDependencies = needsModuleDirectory(metadata, source)
            ? siblingModuleResources(test, corpus.entries)
            : [];
        const sourceSha256 = sha256Text(source);
        for (const mode of modes) {
            const id = `${test}#${mode}`;
            if (!belongsToShard(id, options.shard)) continue;
            scenarios.push({
                id,
                test,
                mode,
                scope: scope.scope,
                scopeReason: scope.reason,
                sourceSha256,
                scenarioSourceSha256: sha256Text(scenarioSource(source, mode)),
                flags: [...metadata.flags].sort(),
                features: [...metadata.features].sort(),
                includes,
                esid: metadata.esid,
                es5id: metadata.es5id,
                es6id: metadata.es6id,
                esidResolution,
                mappingSources: [...new Set(mappingSources)].sort(),
                negative: metadata.negative,
                raw: metadata.flags.includes("raw"),
                async: metadata.flags.includes("async"),
                canBlock: metadata.flags.includes("CanBlockIsTrue")
                    ? true
                    : metadata.flags.includes("CanBlockIsFalse")
                        ? false
                        : null,
                nonDeterministic: metadata.flags.includes("non-deterministic"),
                clauseIds: mappedClauses,
                matrixGroups: [...matrixGroups].sort(),
                moduleDependencies,
            });
        }
    }
    if (options.filter === null && options.shard === null) {
        for (const esid of mappings.aliases.keys()) {
            if (!usedAliases.has(esid)) issues.push({ code: "invalid-override", test: esid, detail: "esid alias is unused by the pinned eligible corpus", claimBlocking: true });
        }
        for (const rule of mappings.pathRules) {
            if (!usedPathRules.has(rule.prefix)) issues.push({ code: "invalid-override", test: rule.prefix, detail: "path rule is unused by the pinned eligible corpus", claimBlocking: true });
        }
        for (const test of mappings.tests.keys()) {
            if (!usedTestOverrides.has(test)) issues.push({ code: "invalid-override", test, detail: "exact test override is unused by the pinned eligible corpus", claimBlocking: true });
        }
    }
    scenarios.sort((a, b) => a.id.localeCompare(b.id));
    issues.sort((a, b) => a.test.localeCompare(b.test) || a.code.localeCompare(b.code));
    return {
        schemaVersion: 1,
        kind: "test262-inventory",
        baseline: {
            edition: 17,
            ecma262Commit: baseline.ecma262.commit,
            test262Commit: baseline.test262.commit,
            test262Tree: baseline.test262.tree,
        },
        selection: {
            exhaustive: options.filter === null && options.shard === null,
            filter: options.filter,
            shard: options.shard,
            scenarioSetSha256: sha256Text(JSON.stringify(scenarios)),
        },
        corpusManifestSha256: corpus.manifestSha256,
        catalogSha256: sha256Text(catalogRaw),
        featureRegistry: {
            proposed: [...registry.proposed].sort(),
            standard: [...registry.standard].sort(),
            harness: [...registry.harness].sort(),
        },
        issues,
        scenarios,
    };
}

async function main(): Promise<void> {
    const test262 = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "test262-inventory.json"));
    const filter = argumentValue("--filter") ?? null;
    const shard = parseShard(argumentValue("--shard"));
    const inventory = await buildInventory({ test262, filter, shard });
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(inventory), "utf8");
    console.log(`Wrote Test262 scenario inventory to ${output}`);
    if (inventory.issues.length > 0) {
        console.error(`Inventory has claim-blocking classification work; inspect ${output}`);
        if (hasArgument("--fail-on-issues")) process.exit(1);
    }
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`test262 inventory: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
