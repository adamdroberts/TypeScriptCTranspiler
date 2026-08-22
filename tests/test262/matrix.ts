import Ajv2020 from "ajv/dist/2020";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    complianceDir,
    loadBaseline,
    pathExists,
    projectRoot,
    readJson,
    requireFullSha,
    sha256File,
    verifyPinnedCheckout,
} from "./model";
import type { ClauseCatalog } from "./spec-catalog";
import { deriveEcma402FeatureTags, type FeatureMap } from "./feature-map";
import { parseFeatureRegistry } from "./metadata";
import { propertyEvidenceFiles } from "../property/manifest";
import { discoverE2eCaseManifest } from "../e2e/case-manifest";

export type TrackingState = "todo" | "in-progress" | "ready-for-verification";

export interface EvidenceRefs {
    property: string[];
    generatedRegression: string[];
    stress: string[];
    e2e: string[];
    negativeDiagnostics: string[];
    declarationSurface: string[];
    implementation: string[];
}

export interface MatrixGroup {
    id: string;
    title: string;
    rootClause: string;
    scope: "required" | "non-observable";
    tracking: TrackingState;
    semanticPartitions: string[];
    localEvidence: EvidenceRefs;
    knownGaps: string[];
    rationale?: string;
}

export interface ComplianceMatrix {
    schemaVersion: 1;
    baseline: "baseline.json";
    clauseEvidence: ClauseEvidence[];
    groups: MatrixGroup[];
}

export interface ClauseEvidence {
    clause: string;
    disposition: "evidence" | "spec-permitted-choice";
    partitions: ClausePartition[];
    rationale: string;
    choice?: {
        kind: "normative-optional-exclusion";
        specBasis: string;
        selection: string;
    };
}

export interface ClausePartition {
    id: string;
    title: string;
    surface: "syntax" | "algorithm" | "intrinsic" | "module" | "jobs-memory-model" | "definition";
    cardinality: "finite" | "unbounded";
    cardinalityMechanism?: "canonical-collection" | "tree" | "graph" | "worklist";
    test262Queries: Array<{
        allOf: Array<{ field: "clause" | "esid" | "feature" | "flag" | "mode"; equals: string }>;
    }>;
    coveredBy: Array<{
        clause: string;
        partition: string;
        relation: "references" | "referenced-by";
    }>;
    localEvidence: EvidenceRefs;
    rationale: string;
    upstreamTestGap?: string;
}

interface HostProfile {
    schemaVersion: number;
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
}

interface OverridesFile {
    schemaVersion: number;
    esidAliases: Array<Record<string, unknown>>;
    pathRules: Array<Record<string, unknown>>;
    testOverrides: Array<Record<string, unknown>>;
}

interface WaiversFile {
    schemaVersion: number;
    waivers: Array<Record<string, unknown>>;
}

function uniqueStrings(values: unknown, label: string, allowEmpty = true): string[] {
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.trim() === "")) {
        throw new Error(`${label} must be an array of non-empty strings`);
    }
    if (!allowEmpty && values.length === 0) throw new Error(`${label} must not be empty`);
    if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates`);
    return values as string[];
}

function requireSha256(value: unknown, label: string): void {
    if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} must be a lowercase SHA-256`);
}

function assertNoAuthoredVerdict(value: unknown, location = "matrix"): void {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (["status", "supported", "conformant", "complete", "verified", "claimEligible"].includes(key)) {
            throw new Error(`${location}.${key} is a computed verdict and must not be hand-authored in matrix.json`);
        }
        assertNoAuthoredVerdict(child, `${location}.${key}`);
    }
}

export async function loadAndValidateMatrix(test262Checkout?: string): Promise<{
    catalog: ClauseCatalog;
    matrix: ComplianceMatrix;
    featureMap: FeatureMap;
}> {
    const baseline = await loadBaseline();
    requireFullSha(baseline.ecma262.commit, "baseline.ecma262.commit");
    requireFullSha(baseline.ecma262.tree, "baseline.ecma262.tree");
    requireFullSha(baseline.test262.commit, "baseline.test262.commit");
    requireFullSha(baseline.test262.tree, "baseline.test262.tree");
    requireSha256(baseline.ecma262.specSourceSha256, "baseline ECMA-262 source digest");
    requireSha256(baseline.ecma262.clauseCatalogSha256, "baseline clause catalog digest");
    requireSha256(baseline.test262.interpretationSha256, "baseline Test262 interpretation digest");
    requireSha256(baseline.test262.featureRegistrySha256, "baseline Test262 feature registry digest");
    if (
        baseline.claim.standard !== "ECMA-262" ||
        baseline.claim.edition !== 17 ||
        baseline.claim.name !== "ECMAScript 2026" ||
        !baseline.claim.includesNormativeAnnexB
    ) {
        throw new Error("baseline claim scope is not the complete ECMAScript 2026 language plus normative Annex B");
    }
    uniqueStrings(baseline.test262.discoveryRoots, "baseline Test262 discovery roots", false);
    uniqueStrings(baseline.test262.ecma402Roots, "baseline ECMA-402 roots", false);
    uniqueStrings(baseline.test262.ecma402FeatureTags, "baseline ECMA-402 feature tags", false);
    uniqueStrings(baseline.test262.postEditionFeatureTags, "baseline post-edition feature tags", false);
    uniqueStrings(baseline.runnerContract.requiredCapabilities, "runner required capabilities", false);
    const requiredCapabilities = [
        "fresh-realm-per-scenario",
        "separate-global-script-setup",
        "script-goal",
        "module-goal-and-fixtures",
        "raw-source-preservation",
        "strict-variant-transform",
        "async-done-protocol",
        "structured-negative-phases",
        "exact-error-constructor",
        "host-print",
        "host-$262-global",
        "host-$262-AbstractModuleSource",
        "host-$262-createRealm",
        "host-$262-evalScript",
        "host-$262-detachArrayBuffer",
        "host-$262-agent",
        "can-block-agent-selection",
        "host-$262-gc",
        "host-$262-IsHTMLDDA",
        "no-semantic-delegation",
    ];
    if (JSON.stringify(baseline.runnerContract.requiredCapabilities) !== JSON.stringify(requiredCapabilities)) {
        throw new Error("runner capability contract differs from the complete reviewed Test262 host surface");
    }
    const requiredDiscoveryRoots = ["test/language", "test/built-ins", "test/annexB", "test/staging", "test/harness"];
    const requiredEcma402Roots = ["test/intl402", "test/staging/intl402"];
    if (JSON.stringify(baseline.test262.discoveryRoots) !== JSON.stringify(requiredDiscoveryRoots)) {
        throw new Error("baseline Test262 discovery roots must match the complete reviewed ECMA-262 suite surface");
    }
    if (JSON.stringify(baseline.test262.ecma402Roots) !== JSON.stringify(requiredEcma402Roots)) {
        throw new Error("baseline ECMA-402 exclusions differ from the exact reviewed policy");
    }
    const requiredStatuses = ["pass", "fail", "timeout", "crash", "unsupported", "infrastructure-error"];
    if (
        baseline.runnerContract.claimPassingStatus !== "pass" ||
        JSON.stringify(baseline.runnerContract.allowedResultStatuses) !== JSON.stringify(requiredStatuses)
    ) {
        throw new Error("runner result policy must fail closed on every outcome other than pass");
    }
    const expectedExecutionProfile = {
        id: "linux-x64-gcc-native",
        platform: "linux",
        architecture: "x64",
        compiler: "gcc",
        environment: { TSC2C_CC: "gcc", TSC2C_CXX: "g++", TZ: "UTC", LC_ALL: "C.UTF-8" },
    };
    if (JSON.stringify(baseline.executionProfile) !== JSON.stringify(expectedExecutionProfile)) {
        throw new Error("baseline execution profile differs from the reviewed native claim scope");
    }
    const expectedLocalGates = [
        { id: "build", command: ["bun", "run", "build"] },
        { id: "compliance-types", command: ["bun", "run", "check:compliance-types"] },
        { id: "compliance-self-test", command: ["bun", "run", "compliance:self-test"] },
        { id: "emitter-reachability", command: ["bun", "run", "check:emitter-reachability"] },
        { id: "property", command: ["bun", "run", "test:property"] },
        { id: "e2e-gc", command: ["bun", "tests/e2e/run.ts", "--fail-on-skip"], environment: { TSC2C_NO_GC: "0" } },
        { id: "e2e-no-gc", command: ["bun", "tests/e2e/run.ts", "--fail-on-skip"], environment: { TSC2C_NO_GC: "1" } },
    ];
    if (
        baseline.localGates.length !== expectedLocalGates.length ||
        expectedLocalGates.some((expected, index) => {
            const actual = baseline.localGates[index];
            return !actual ||
                actual.id !== expected.id ||
                JSON.stringify(actual.command) !== JSON.stringify(expected.command) ||
                JSON.stringify(actual.environment ?? undefined) !== JSON.stringify(expected.environment ?? undefined) ||
                !Number.isInteger(actual.timeoutMs) || actual.timeoutMs < 1;
        })
    ) {
        throw new Error("baseline local gates must retain the exact build, compliance, property, reachability, GC, and no-GC evidence worklist");
    }

    const [catalog, matrixRaw, matrixSchema, featureMap, overrides, waivers, hostProfile] = await Promise.all([
        readJson<ClauseCatalog>(path.join(complianceDir, "clauses.json")),
        readJson<unknown>(path.join(complianceDir, "matrix.json")),
        readJson<Record<string, unknown>>(path.join(complianceDir, "matrix.schema.json")),
        readJson<FeatureMap>(path.join(complianceDir, "feature-map.json")),
        readJson<OverridesFile>(path.join(complianceDir, "mapping-overrides.json")),
        readJson<WaiversFile>(path.join(complianceDir, "waivers.json")),
        readJson<HostProfile>(path.join(complianceDir, "host-profile.json")),
    ]);
    const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(matrixSchema);
    if (!validateSchema(matrixRaw)) {
        throw new Error(`matrix.json schema validation failed: ${JSON.stringify(validateSchema.errors)}`);
    }
    const matrix = matrixRaw as ComplianceMatrix;
    if (catalog.commit !== baseline.ecma262.commit || catalog.tree !== baseline.ecma262.tree) {
        throw new Error("clauses.json does not identify the pinned ECMAScript 2026 revision");
    }
    if (catalog.specSourceSha256 !== baseline.ecma262.specSourceSha256) {
        throw new Error("clauses.json source digest does not match baseline.json");
    }
    if (await sha256File(path.join(complianceDir, "clauses.json")) !== baseline.ecma262.clauseCatalogSha256) {
        throw new Error("clauses.json content digest does not match baseline.json");
    }
    if (matrix.schemaVersion !== 1 || matrix.baseline !== "baseline.json" || !Array.isArray(matrix.clauseEvidence)) {
        throw new Error("matrix.json has an unsupported schema or baseline reference");
    }
    assertNoAuthoredVerdict(matrix);
    const clauseById = new Map(catalog.clauses.map((clause) => [clause.id, clause]));
    if (clauseById.size !== catalog.clauses.length) throw new Error("clauses.json contains duplicate IDs");
    const e2eManifest = await discoverE2eCaseManifest();
    const generatedNames = new Set(e2eManifest.flatMap((entry) => entry.generator ? [entry.generator] : []));
    const e2eCases = new Map(e2eManifest.map((entry) => [entry.name, entry]));
    const propertyFiles = new Set(
        (await propertyEvidenceFiles()).map((filename) => path.relative(projectRoot, filename).split(path.sep).join("/")),
    );
    if (featureMap.schemaVersion !== 1 || featureMap.test262Commit !== baseline.test262.commit) {
        throw new Error("feature-map.json does not identify the pinned Test262 revision");
    }
    const featureTags = new Set<string>();
    for (const feature of featureMap.features) {
        if (featureTags.has(feature.tag) || feature.tag.trim() === "") throw new Error(`duplicate/invalid feature mapping ${feature.tag}`);
        if (!["standard", "ecma402-only", "harness-only", "post-edition"].includes(feature.disposition)) {
            throw new Error(`feature ${feature.tag} has an invalid disposition ${String(feature.disposition)}`);
        }
        if (!(feature.tracking === "todo" || feature.tracking === "ready-for-verification")) {
            throw new Error(`feature ${feature.tag} has an invalid tracking state ${String(feature.tracking)}`);
        }
        featureTags.add(feature.tag);
        uniqueStrings(feature.clauses, `feature ${feature.tag} clauses`);
        if (feature.clauses.some((clause) => !clauseById.has(clause))) {
            throw new Error(`feature ${feature.tag} maps to an unknown pinned clause`);
        }
        if (feature.rationale.trim() === "") throw new Error(`feature ${feature.tag} needs a rationale`);
        if (feature.disposition === "standard") {
            if (feature.tracking === "ready-for-verification" && feature.clauses.length === 0) {
                throw new Error(`standard feature ${feature.tag} is ready without clause mappings`);
            }
        } else if (feature.tracking !== "ready-for-verification" || feature.clauses.length !== 0) {
            throw new Error(`${feature.disposition} feature ${feature.tag} must be classified without clause mappings`);
        }
    }
    const proposedTags = featureMap.features
        .filter((feature) => feature.disposition === "post-edition")
        .map((feature) => feature.tag)
        .sort();
    if (JSON.stringify(proposedTags) !== JSON.stringify([...baseline.test262.postEditionFeatureTags].sort())) {
        throw new Error("feature-map post-edition classification differs from baseline.json");
    }
    if (test262Checkout) {
        await verifyPinnedCheckout("Test262", test262Checkout, baseline.test262);
        const registry = parseFeatureRegistry(await fs.readFile(path.join(test262Checkout, "features.txt"), "utf8"));
        if (JSON.stringify([...featureTags].sort()) !== JSON.stringify([...registry.all].sort())) {
            throw new Error("feature-map.json does not exactly cover the pinned Test262 registry");
        }
        const ecma402Features = new Set(baseline.test262.ecma402FeatureTags);
        if (
            JSON.stringify(await deriveEcma402FeatureTags(test262Checkout, baseline, registry.standard)) !==
            JSON.stringify([...ecma402Features].sort())
        ) {
            throw new Error("baseline ECMA-402-only feature classification differs from independent pinned-corpus usage");
        }
        for (const feature of featureMap.features) {
            const expected = registry.proposed.has(feature.tag)
                ? "post-edition"
                : registry.harness.has(feature.tag)
                    ? "harness-only"
                    : ecma402Features.has(feature.tag)
                        ? "ecma402-only"
                        : "standard";
            if (feature.disposition !== expected) {
                throw new Error(`feature ${feature.tag} disposition ${feature.disposition} differs from pinned registry/scope ${expected}`);
            }
        }
    }
    const validateEvidenceRefs = async (label: string, evidence: EvidenceRefs): Promise<void> => {
        for (const key of [
            "property",
            "generatedRegression",
            "stress",
            "e2e",
            "negativeDiagnostics",
            "declarationSurface",
            "implementation",
        ] as const) {
            uniqueStrings(evidence[key], `${label}.${key}`);
        }
        for (const filename of evidence.property) {
            if (
                path.isAbsolute(filename) ||
                filename.includes("..") ||
                !filename.startsWith("tests/property/") ||
                !filename.endsWith(".property.test.ts") ||
                !propertyFiles.has(filename)
            ) {
                throw new Error(`${label} references missing/unsafe property evidence ${filename}`);
            }
        }
        for (const name of evidence.generatedRegression) {
            if (!generatedNames.has(name)) throw new Error(`${label} references unknown generated evidence ${name}`);
        }
        for (const name of evidence.stress) {
            if (!generatedNames.has(name) && !e2eCases.has(name)) {
                throw new Error(`${label} references unknown stress evidence ${name}`);
            }
        }
        for (const name of evidence.e2e) {
            if (!e2eCases.has(name)) {
                throw new Error(`${label} references missing e2e case ${name}`);
            }
        }
        for (const name of evidence.negativeDiagnostics) {
            const entry = e2eCases.get(name);
            if (
                !entry ||
                entry.expectedExitCode === undefined ||
                entry.expectedExitCode === 0 ||
                !entry.expectedStderrContains ||
                entry.expectedStderrContains.trim() === ""
            ) {
                throw new Error(`${label} negative evidence ${name} must be a discovered nonzero-exit case with an exact diagnostic assertion`);
            }
        }
        for (const filename of evidence.implementation) {
            if (path.isAbsolute(filename) || filename.includes("..") || !(await pathExists(path.join(projectRoot, filename)))) {
                throw new Error(`${label} references missing/unsafe implementation path ${filename}`);
            }
        }
        for (const reference of evidence.declarationSurface) {
            const separator = reference.lastIndexOf("#");
            const filename = separator < 0 ? "" : reference.slice(0, separator);
            const symbol = separator < 0 ? "" : reference.slice(separator + 1);
            if (
                filename !== "stdlib/lib.core.d.ts" ||
                symbol.trim() === "" ||
                !(await pathExists(path.join(projectRoot, filename)))
            ) {
                throw new Error(`${label} has invalid declaration-surface reference ${reference}`);
            }
            const declaration = await fs.readFile(path.join(projectRoot, filename), "utf8");
            if (!new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(declaration)) {
                throw new Error(`${label} declaration-surface symbol is absent: ${reference}`);
            }
        }
    };
    const groupIds = new Set<string>();
    const groupRoots = new Set<string>();
    for (const group of matrix.groups) {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(group.id) || groupIds.has(group.id)) {
            throw new Error(`invalid or duplicate matrix group id ${group.id}`);
        }
        groupIds.add(group.id);
        if (groupRoots.has(group.rootClause)) throw new Error(`duplicate matrix root ${group.rootClause}`);
        groupRoots.add(group.rootClause);
        const root = clauseById.get(group.rootClause);
        if (!root || root.parentId !== null) throw new Error(`${group.id} rootClause is not a pinned top-level clause`);
        if (!(group.scope === "required" || group.scope === "non-observable")) {
            throw new Error(`${group.id} has invalid scope`);
        }
        if (!(group.tracking === "todo" || group.tracking === "in-progress" || group.tracking === "ready-for-verification")) {
            throw new Error(`${group.id} has invalid tracking state`);
        }
        uniqueStrings(group.semanticPartitions, `${group.id}.semanticPartitions`, false);
        uniqueStrings(group.knownGaps, `${group.id}.knownGaps`);
        if (group.scope === "non-observable" && (!group.rationale || group.rationale.trim() === "")) {
            throw new Error(`${group.id} non-observable scope requires a rationale`);
        }
        const evidence = group.localEvidence;
        await validateEvidenceRefs(`${group.id}.localEvidence`, evidence);
    }
    for (const clause of catalog.clauses) {
        if ((clause.classification === "required" || clause.classification === "normative-optional") && !groupRoots.has(clause.rootId)) {
            throw new Error(`normative clause ${clause.id} is not owned by a matrix group`);
        }
    }
    const exactEvidence = new Map<string, ClauseEvidence>();
    for (const evidence of matrix.clauseEvidence) {
        const clause = clauseById.get(evidence.clause);
        if (exactEvidence.has(evidence.clause) || !clause) {
            throw new Error(`duplicate or unknown exact clause evidence ${evidence.clause}`);
        }
        if (!(clause.classification === "required" || clause.classification === "normative-optional")) {
            throw new Error(`${evidence.clause} is not a normative clause evidence target`);
        }
        exactEvidence.set(evidence.clause, evidence);
        if (evidence.rationale.trim() === "") throw new Error(`${evidence.clause} evidence needs a rationale`);
        if (evidence.disposition === "spec-permitted-choice") {
            if (evidence.partitions.length !== 0 || !evidence.choice) {
                throw new Error(`${evidence.clause} spec-permitted choice must have one choice and no evidence partitions`);
            }
            if (evidence.choice.kind !== "normative-optional-exclusion" || clause.classification !== "normative-optional") {
                throw new Error(`${evidence.clause} is not a normative-optional clause eligible for an exact disclosed exclusion`);
            }
            continue;
        }
        if (evidence.choice || evidence.partitions.length === 0) {
            throw new Error(`${evidence.clause} evidence disposition requires independently evidenced partitions`);
        }
        const partitionIds = new Set<string>();
        for (const partition of evidence.partitions) {
            if (partitionIds.has(partition.id)) throw new Error(`${evidence.clause} has duplicate partition ${partition.id}`);
            partitionIds.add(partition.id);
            await validateEvidenceRefs(`${evidence.clause}.${partition.id}.localEvidence`, partition.localEvidence);
            const terminalPartition = partition.test262Queries.length > 0 || partition.upstreamTestGap !== undefined;
            if (terminalPartition) {
                if (!partition.cardinalityMechanism) {
                    throw new Error(`${evidence.clause}.${partition.id} terminal evidence needs a cardinality-independent canonical mechanism`);
                }
                if (
                    partition.localEvidence.property.length === 0 ||
                    partition.localEvidence.stress.length === 0 ||
                    partition.localEvidence.implementation.length === 0
                ) {
                    throw new Error(`${evidence.clause}.${partition.id} terminal evidence needs property, representative stress, and implementation evidence`);
                }
                const property = new Set(partition.localEvidence.property);
                if (partition.localEvidence.stress.some((item) => property.has(item))) {
                    throw new Error(`${evidence.clause}.${partition.id} cannot use the same evidence as property and stress proof`);
                }
            } else if (partition.coveredBy.length === 0) {
                throw new Error(`${evidence.clause}.${partition.id} is neither a terminal proof nor a structural coveredBy node`);
            }
            if (
                partition.surface === "intrinsic" &&
                (partition.localEvidence.declarationSurface.length === 0 || partition.localEvidence.implementation.length === 0)
            ) {
                throw new Error(`${evidence.clause}.${partition.id} intrinsic evidence needs declaration and runtime implementation references`);
            }
            if (
                partition.test262Queries.length === 0 &&
                partition.coveredBy.length === 0 &&
                partition.upstreamTestGap === undefined
            ) {
                throw new Error(`${evidence.clause}.${partition.id} has no executable evidence route`);
            }
            if (partition.upstreamTestGap !== undefined) {
                const local = partition.localEvidence;
                if (
                    local.implementation.length === 0 ||
                    local.property.length + local.generatedRegression.length + local.stress.length + local.e2e.length === 0
                ) {
                    throw new Error(`${evidence.clause}.${partition.id} upstream gap needs local executable and implementation evidence`);
                }
            }
            for (const query of partition.test262Queries) {
                const identity = JSON.stringify(query);
                if (query.allOf.length === 0 || query.allOf.some((term) => term.equals.trim() === "")) {
                    throw new Error(`${evidence.clause}.${partition.id} has an empty Test262 query`);
                }
                if (query.allOf.some((term) => term.field === "clause" && !clauseById.has(term.equals))) {
                    throw new Error(`${evidence.clause}.${partition.id} queries an unknown clause`);
                }
                if (query.allOf.some((term) => term.field === "mode" && !["sloppy", "strict", "module", "raw"].includes(term.equals))) {
                    throw new Error(`${evidence.clause}.${partition.id} queries an unknown Test262 mode`);
                }
                if (partition.test262Queries.filter((candidate) => JSON.stringify(candidate) === identity).length !== 1) {
                    throw new Error(`${evidence.clause}.${partition.id} has duplicate Test262 queries`);
                }
            }
        }
    }
    const partitions = new Map<string, ClausePartition>();
    for (const evidence of exactEvidence.values()) {
        for (const partition of evidence.partitions) partitions.set(`${evidence.clause}#${partition.id}`, partition);
    }
    for (const evidence of exactEvidence.values()) {
        const sourceClause = clauseById.get(evidence.clause)!;
        for (const partition of evidence.partitions) {
            for (const edge of partition.coveredBy) {
                const targetClause = clauseById.get(edge.clause);
                if (!targetClause || !partitions.has(`${edge.clause}#${edge.partition}`)) {
                    throw new Error(`${evidence.clause}.${partition.id} has a dangling coveredBy partition`);
                }
                const relationshipValid = edge.relation === "references"
                    ? sourceClause.references.includes(edge.clause)
                    : targetClause.references.includes(evidence.clause);
                if (!relationshipValid) {
                    throw new Error(`${evidence.clause}.${partition.id} coveredBy edge has no matching pinned specification xref`);
                }
            }
        }
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visitCoverage = (key: string): void => {
        if (visited.has(key)) return;
        if (visiting.has(key)) throw new Error(`cycle in exact partition coveredBy graph at ${key}`);
        visiting.add(key);
        for (const edge of partitions.get(key)?.coveredBy ?? []) visitCoverage(`${edge.clause}#${edge.partition}`);
        visiting.delete(key);
        visited.add(key);
    };
    for (const key of partitions.keys()) visitCoverage(key);
    if (
        overrides.schemaVersion !== 1 ||
        !Array.isArray(overrides.esidAliases) ||
        !Array.isArray(overrides.pathRules) ||
        !Array.isArray(overrides.testOverrides)
    ) {
        throw new Error("mapping-overrides.json has an unsupported schema");
    }
    const validateMappingBase = (mapping: Record<string, unknown>, label: string): void => {
        const clauses = uniqueStrings(mapping.clauses, `${label}.clauses`, false);
        if (clauses.some((clause) => !clauseById.has(clause))) throw new Error(`${label} references unknown clauses`);
        for (const key of ["reason", "reviewedBy"] as const) {
            if (typeof mapping[key] !== "string" || (mapping[key] as string).trim() === "") {
                throw new Error(`${label} is missing ${key}`);
            }
        }
    };
    const aliasIds = new Set<string>();
    for (const mapping of overrides.esidAliases) {
        validateMappingBase(mapping, "esid alias");
        if (typeof mapping.esid !== "string" || mapping.esid.trim() === "" || aliasIds.has(mapping.esid)) {
            throw new Error("esid aliases must be unique non-empty identifiers");
        }
        if (catalog.anchors.some((anchor) => anchor.id === mapping.esid)) {
            throw new Error(`esid alias ${mapping.esid} duplicates a current pinned specification anchor`);
        }
        aliasIds.add(mapping.esid);
    }
    const prefixes = new Set<string>();
    for (const mapping of overrides.pathRules) {
        validateMappingBase(mapping, "path rule");
        const prefix = mapping.prefix;
        if (
            typeof prefix !== "string" ||
            !prefix.startsWith("test/") ||
            !prefix.endsWith("/") ||
            prefix.includes("..") ||
            /[*?\[\]]/.test(prefix) ||
            prefixes.has(prefix)
        ) {
            throw new Error("path rules must be unique exact semantic directory prefixes; globs are forbidden");
        }
        prefixes.add(prefix);
    }
    const tests = new Set<string>();
    for (const mapping of overrides.testOverrides) {
        validateMappingBase(mapping, "test override");
        const test = mapping.test;
        if (
            typeof test !== "string" ||
            !test.startsWith("test/") ||
            test.includes("..") ||
            /[*?\[\]]/.test(test) ||
            tests.has(test) ||
            !/^[0-9a-f]{64}$/.test(String(mapping.sourceSha256)) ||
            mapping.reasonKind !== "ambiguous-metadata"
        ) {
            throw new Error("test overrides must be unique exact source-hashed ambiguity mappings; globs are forbidden");
        }
        tests.add(test);
    }
    if (waivers.schemaVersion !== 1 || !Array.isArray(waivers.waivers)) {
        throw new Error("waivers.json has an unsupported schema");
    }
    if (waivers.waivers.length !== 0) {
        throw new Error("waiver application and stale/unexpected-pass validation are not implemented; non-empty waivers fail closed");
    }
    const allowedWaivers = new Set([
        "invalid-test",
        "spec-erratum",
        "host-defined",
        "implementation-defined-choice",
        "normative-optional-exclusion",
    ]);
    for (const waiver of waivers.waivers) {
        if (!allowedWaivers.has(String(waiver.kind))) throw new Error(`forbidden waiver kind ${String(waiver.kind)}`);
        if (typeof waiver.scenario !== "string" || /[*?\[\]]/.test(waiver.scenario)) {
            throw new Error("waivers must identify exact scenarios; globs are forbidden");
        }
        for (const field of ["clause", "upstreamIssue", "specBasis", "owner", "introduced", "expires"] as const) {
            if (typeof waiver[field] !== "string" || (waiver[field] as string).trim() === "") {
                throw new Error(`waiver ${String(waiver.scenario)} is missing ${field}`);
            }
        }
    }
    if (hostProfile.schemaVersion !== 1 || hostProfile.semanticDelegation) {
        throw new Error("host profile schema is invalid or permits semantic delegation");
    }
    uniqueStrings(hostProfile.command, "host profile command", false);
    uniqueStrings(hostProfile.implementationFiles, "host profile implementation files", false);
    if (hostProfile.command[0] !== "bun" || hostProfile.command.some((part) => part.includes(".."))) {
        throw new Error("host profile command must bind the reviewed in-repository Bun host");
    }
    for (const filename of hostProfile.implementationFiles) {
        if (path.isAbsolute(filename) || filename.includes("..") || !(await pathExists(path.join(projectRoot, filename)))) {
            throw new Error(`host profile implementation path is missing/unsafe: ${filename}`);
        }
    }
    for (const argument of hostProfile.command.slice(1).filter((part) => part.startsWith("tests/") || part.startsWith("src/"))) {
        if (!hostProfile.implementationFiles.includes(argument)) {
            throw new Error(`host command source is not bound by implementationFiles: ${argument}`);
        }
    }
    const capabilityKeys = Object.keys(hostProfile.capabilities).sort();
    const requiredKeys = [...baseline.runnerContract.requiredCapabilities].sort();
    if (JSON.stringify(capabilityKeys) !== JSON.stringify(requiredKeys)) {
        throw new Error("host profile capability keys do not exactly match the runner contract");
    }
    if (hostProfile.claimEligible && requiredKeys.some((key) => hostProfile.capabilities[key] !== true)) {
        throw new Error("host profile claims eligibility without every required capability");
    }
    return { catalog, matrix, featureMap };
}

function evidenceSummary(evidence: EvidenceRefs): string {
    const parts: string[] = [];
    if (evidence.property.length > 0) parts.push(`property: ${evidence.property.join(", ")}`);
    if (evidence.generatedRegression.length > 0) parts.push(`generated regression: ${evidence.generatedRegression.join(", ")}`);
    if (evidence.stress.length > 0) parts.push(`stress: ${evidence.stress.join(", ")}`);
    if (evidence.e2e.length > 0) parts.push(`E2E: ${evidence.e2e.join(", ")}`);
    if (evidence.negativeDiagnostics.length > 0) parts.push(`negative: ${evidence.negativeDiagnostics.join(", ")}`);
    return parts.length === 0 ? "none linked yet" : parts.join("; ");
}

export function renderMatrixChecklist(catalog: ClauseCatalog, matrix: ComplianceMatrix, featureMap: FeatureMap): string {
    const lines = [
        "# ECMAScript 2026 compliance checklist",
        "",
        "> Generated from `compliance/ecmascript-2026/matrix.json` and the clause tree extracted from the pinned ECMA-262 source. Edit the JSON matrix, then run `bun run compliance:matrix:render`.",
        "",
        "This is a generated open-work checklist, not a support claim. Its boxes are deliberately never checked from authored state; the generated claim JSON is the sole computed verdict after an exhaustive pinned Test262 result and all local gates. Authored tracking states cannot mark a clause conformant.",
        "",
        `Specification pin: ECMA-262 edition ${catalog.edition}, commit \`${catalog.commit}\`.`,
        "",
        "## Clause and feature groups",
        "",
    ];
    for (const group of matrix.groups) {
        lines.push(`- [ ] **${group.title}** (\`${group.rootClause}\`) — tracking: \`${group.tracking}\`, scope: \`${group.scope}\``);
        lines.push(`  - Semantic partitions: ${group.semanticPartitions.join("; ")}.`);
        lines.push(`  - Linked local regression evidence: ${evidenceSummary(group.localEvidence)}.`);
        if (group.knownGaps.length > 0) lines.push(`  - Known blockers: ${group.knownGaps.join(" ")}`);
        if (group.rationale) lines.push(`  - Scope rationale: ${group.rationale}`);
        const clauses = catalog.clauses.filter(
            (clause) =>
                clause.rootId === group.rootClause &&
                (clause.classification === "required" || clause.classification === "normative-optional"),
        );
        const evidenceByClause = new Map(matrix.clauseEvidence.map((evidence) => [evidence.clause, evidence]));
        for (const clause of clauses) {
            const evidence = evidenceByClause.get(clause.id);
            if (!evidence) {
                lines.push(`  - [ ] \`${clause.id}\` — ${clause.title}: exact disposition and partitions missing.`);
                continue;
            }
            if (evidence.disposition === "spec-permitted-choice") {
                lines.push(`  - \`${clause.id}\` — ${clause.title}: reviewed ${evidence.choice?.kind ?? "choice"}; excluded from work only when disclosed by the claim gate.`);
                continue;
            }
            lines.push(`  - [ ] \`${clause.id}\` — ${clause.title}`);
            for (const partition of evidence.partitions) {
                lines.push(`    - [ ] \`${partition.id}\` (${partition.surface}, ${partition.cardinality}): ${partition.title}.`);
            }
        }
    }
    lines.push(
        "",
        "## Test262 feature-tag mapping",
        "",
    );
    for (const feature of featureMap.features) {
        const mapping = feature.clauses.length > 0 ? feature.clauses.map((clause) => `\`${clause}\``).join(", ") : "no clause mapping";
        const marker = feature.disposition === "standard" ? "- [ ]" : "-";
        lines.push(`${marker} \`${feature.tag}\` — ${feature.disposition}, tracking: \`${feature.tracking}\`; ${mapping}.`);
    }
    lines.push(
        "",
        "## Completion rule",
        "",
        "A group is complete only when every normative descendant clause terminates in executable evidence, every mapped in-scope Test262 scenario/variant passes under a claim-eligible host, and the generated/property, representative stress, negative-diagnostic, and E2E evidence required by the semantic partitions passes for the same clean source revision. Missing mappings, skips, unsupported diagnostics, timeouts, crashes, infrastructure errors, stale results, or a filtered/sharded-only result keep the box open.",
    );
    return `${lines.join("\n")}\n`;
}
