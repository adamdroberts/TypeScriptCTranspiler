import Ajv2020 from "ajv/dist/2020";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    canonicalEvidenceEnvironmentAllowlist,
    complianceDir,
    loadBaseline,
    pathExists,
    projectRoot,
    readJson,
    requireTrackedRegularProjectFile,
    requireFullSha,
    sha256File,
    sha256Text,
    trackedProjectFiles,
    verifyPinnedCheckout,
} from "./model";
import {
    isNormativeDefinitionBinding,
    isNormativeXrefBinding,
    type ClauseCatalog,
} from "./spec-catalog";
import { deriveEcma402FeatureTags, type FeatureMap } from "./feature-map";
import { parseFeatureRegistry } from "./metadata";
import { propertyEvidenceFiles } from "../property/manifest";
import { discoverE2eCaseManifest, type E2eCaseManifestEntry } from "../e2e/case-manifest";

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
    choiceSelections: ChoiceSelection[];
    normativeOptionalEvidence: NormativeOptionalEvidence[];
    clauseEvidence: ClauseEvidence[];
    groups: MatrixGroup[];
}

export interface ChoiceSelection {
    obligation: string;
    selection: string;
    rationale: string;
    reviewedBy: string;
    evidence: Array<{ clause: string; partition: string }>;
}

export interface NormativeOptionalEvidence {
    family: string;
    policy: "implemented-all";
    rationale: string;
    reviewedBy: string;
    evidence: Array<{ clause: string; partition: string }>;
}

export interface ClauseEvidence {
    clause: string;
    disposition: "evidence";
    partitions: ClausePartition[];
    rationale: string;
}

export interface ClausePartition {
    id: string;
    title: string;
    surface: "syntax" | "algorithm" | "intrinsic" | "module" | "jobs-memory-model" | "definition";
    cardinality: "finite" | "unbounded";
    cardinalityMechanism?: "canonical-collection" | "tree" | "graph" | "worklist";
    choiceObligation: string | null;
    definition: string | null;
    normativeOptionalFamilies: string[];
    normativeOptionalSites: string[];
    test262Queries: Array<{
        allOf: Array<{ field: "clause" | "esid" | "feature" | "flag" | "mode"; equals: string }>;
    }>;
    coveredBy: Array<{
        clause: string;
        partition: string;
        relation: "references" | "referenced-by";
        xref: string;
    }>;
    localEvidence: EvidenceRefs;
    rationale: string;
    upstreamTestGap?: string;
}

type EvidenceKind = keyof EvidenceRefs;

export interface StressReview {
    dimension: string;
    parameter: string;
    representativeHighDepth: number;
    rationale: string;
    reviewedBy: string;
}

interface EvidenceRegistryArtifact {
    kind: EvidenceKind;
    id: string;
    targets: string[];
    stressReview?: StressReview;
}

interface EvidenceRegistry {
    schemaVersion: 1;
    artifacts: EvidenceRegistryArtifact[];
}

interface HostProfile {
    schemaVersion: number;
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
    executionContract: "diagnostic-only-v1" | "tsc2c-runner-owned-native-v1";
    environmentAllowlist: string[];
}

interface OverridesFile {
    schemaVersion: number;
    esidAliases: Array<Record<string, unknown>>;
    legacyIdRules: Array<Record<string, unknown>>;
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

function runtimeEvidenceEligible(entry: E2eCaseManifestEntry): boolean {
    return entry.expectedExitCode === undefined && !entry.emitCOnly && !entry.semanticDelegation;
}

/**
 * Bind a reviewed stress claim to the exact numeric cardinality parameter that
 * the canonical generated-case parser will use. A prose label or ordinary E2E
 * case can never stand in for the representative high-depth input.
 */
export function requireCanonicalStressBinding(
    entry: E2eCaseManifestEntry | undefined,
    review: StressReview | undefined,
    label = "stress evidence",
): void {
    if (!entry || !runtimeEvidenceEligible(entry) || !entry.generator || !entry.generatorParameters) {
        throw new Error(`${label} must name one exact generated positive native runtime case`);
    }
    if (
        !review ||
        review.dimension.trim() === "" ||
        review.parameter.trim() === "" ||
        review.rationale.trim() === "" ||
        review.reviewedBy.trim() === "" ||
        !Number.isInteger(review.representativeHighDepth) ||
        review.representativeHighDepth < 2
    ) {
        throw new Error(`${label} has an invalid independent stress review`);
    }
    const actual = Object.prototype.hasOwnProperty.call(entry.generatorParameters, review.parameter)
        ? entry.generatorParameters[review.parameter]
        : undefined;
    if (actual !== review.representativeHighDepth) {
        throw new Error(
            `${label} reviewed parameter ${review.parameter}=${review.representativeHighDepth} ` +
            `does not equal the canonical generated input value ${String(actual)}`,
        );
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
        !baseline.claim.includesNormativeAnnexB ||
        baseline.claim.normativeOptionalPolicy !== "implemented-all" ||
        baseline.claim.provenance.provider !== "github-artifact-attestation" ||
        baseline.claim.provenance.repository !== "adamdroberts/TypeScriptCTranspiler" ||
        baseline.claim.provenance.signerWorkflow !== ".github/workflows/ecmascript-conformance.yml" ||
        baseline.claim.provenance.verifierCommand !== "/usr/bin/gh" ||
        baseline.claim.provenance.denySelfHostedRunners !== true
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
        "failure-origin",
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
        environmentAllowlist: [...canonicalEvidenceEnvironmentAllowlist],
        environment: {
            TSC2C_CC: "gcc",
            TSC2C_CXX: "g++",
            TSC2C_LIBDISPATCH_PREFIX: "/usr/share/swift/usr",
            TZ: "UTC",
            LC_ALL: "C.UTF-8",
        },
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

    const [
        catalog,
        matrixRaw,
        matrixSchema,
        evidenceRegistryRaw,
        evidenceRegistrySchema,
        featureMap,
        overrides,
        waivers,
        hostProfile,
    ] = await Promise.all([
        readJson<ClauseCatalog>(path.join(complianceDir, "clauses.json")),
        readJson<unknown>(path.join(complianceDir, "matrix.json")),
        readJson<Record<string, unknown>>(path.join(complianceDir, "matrix.schema.json")),
        readJson<unknown>(path.join(complianceDir, "evidence-registry.json")),
        readJson<Record<string, unknown>>(path.join(complianceDir, "evidence-registry.schema.json")),
        readJson<FeatureMap>(path.join(complianceDir, "feature-map.json")),
        readJson<OverridesFile>(path.join(complianceDir, "mapping-overrides.json")),
        readJson<WaiversFile>(path.join(complianceDir, "waivers.json")),
        readJson<HostProfile>(path.join(complianceDir, "host-profile.json")),
    ]);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateMatrixSchema = ajv.compile(matrixSchema);
    if (!validateMatrixSchema(matrixRaw)) {
        throw new Error(`matrix.json schema validation failed: ${JSON.stringify(validateMatrixSchema.errors)}`);
    }
    const validateEvidenceRegistrySchema = ajv.compile(evidenceRegistrySchema);
    if (!validateEvidenceRegistrySchema(evidenceRegistryRaw)) {
        throw new Error(
            `evidence-registry.json schema validation failed: ${JSON.stringify(validateEvidenceRegistrySchema.errors)}`,
        );
    }
    const matrix = matrixRaw as ComplianceMatrix;
    const evidenceRegistry = evidenceRegistryRaw as EvidenceRegistry;
    if (catalog.schemaVersion !== 4 || catalog.commit !== baseline.ecma262.commit || catalog.tree !== baseline.ecma262.tree) {
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
    const anchorById = new Map(catalog.anchors.map((anchor) => [anchor.id, anchor.clauseId]));
    if (clauseById.size !== catalog.clauses.length) throw new Error("clauses.json contains duplicate IDs");
    if (
        catalog.choiceObligationSetSha256 !== sha256Text(JSON.stringify(catalog.choiceObligations)) ||
        new Set(catalog.choiceObligations.map((obligation) => obligation.id)).size !== catalog.choiceObligations.length
    ) {
        throw new Error("clauses.json choice-obligation identity is invalid");
    }
    for (const obligation of catalog.choiceObligations) {
        if (
            !/^choice-[0-9a-f]{64}$/.test(obligation.id) ||
            anchorById.get(obligation.sourceAnchor) !== obligation.sourceClauseId ||
            obligation.subjectClauseIds.length === 0 ||
            obligation.subjectClauseIds.some((id) => {
                const clause = clauseById.get(id);
                return !(clause?.classification === "required" || clause?.classification === "normative-optional");
            })
        ) {
            throw new Error(`clauses.json has an invalid specification choice obligation ${obligation.id}`);
        }
    }
    const optionalMembers = catalog.normativeOptionalSubtrees.flatMap((subtree) => subtree.memberClauseIds);
    const expectedOptionalMembers = catalog.clauses
        .filter((clause) => clause.classification === "normative-optional")
        .map((clause) => clause.id);
    if (
        new Set(optionalMembers).size !== optionalMembers.length ||
        new Set(optionalMembers).size !== expectedOptionalMembers.length ||
        expectedOptionalMembers.some((clause) => !optionalMembers.includes(clause))
    ) {
        throw new Error("clauses.json normative-optional subtrees do not exactly partition optional clauses");
    }
    const optionalSiteById = new Map(catalog.normativeOptionalSites.map((site) => [site.id, site]));
    const optionalFamilyById = new Map(catalog.normativeOptionalFamilies.map((family) => [family.id, family]));
    if (
        catalog.normativeOptionalSiteSetSha256 !== sha256Text(JSON.stringify(catalog.normativeOptionalSites)) ||
        optionalSiteById.size !== catalog.normativeOptionalSites.length
    ) {
        throw new Error("clauses.json normative-optional site identity is invalid");
    }
    for (const site of catalog.normativeOptionalSites) {
        const siteIdentity = {
            kind: site.kind,
            sourceClauseId: site.sourceClauseId,
            sourceAnchor: site.sourceAnchor,
            targetClauseIds: site.targetClauseIds,
            affectedClauseIds: site.affectedClauseIds,
            sourceOffset: site.sourceOffset,
            endOffset: site.endOffset,
            contextSha256: site.contextSha256,
        };
        if (
            site.id !== `optional-${sha256Text(JSON.stringify(siteIdentity))}` ||
            anchorById.get(site.sourceAnchor) !== site.sourceClauseId ||
            !optionalFamilyById.has(site.familyId) ||
            site.targetClauseIds.length !== 1 ||
            site.targetClauseIds.some((id) => !clauseById.has(id)) ||
            site.affectedClauseIds.length === 0 ||
            site.affectedClauseIds.some((id) => {
                const clause = clauseById.get(id);
                return !(clause?.classification === "required" || clause?.classification === "normative-optional");
            })
        ) {
            throw new Error(`clauses.json has an invalid normative-optional site ${site.id}`);
        }
    }
    if (
        catalog.normativeOptionalFamilySetSha256 !== sha256Text(JSON.stringify(catalog.normativeOptionalFamilies)) ||
        optionalFamilyById.size !== catalog.normativeOptionalFamilies.length
    ) {
        throw new Error("clauses.json normative-optional family identity is invalid");
    }
    const familyMembers = new Set<string>();
    for (const family of catalog.normativeOptionalFamilies) {
        const withoutId = {
            kind: family.kind,
            featureClauseId: family.featureClauseId,
            siteIds: family.siteIds,
            affectedClauseIds: family.affectedClauseIds,
            contextSha256: family.contextSha256,
        };
        const sites = family.siteIds.map((id) => optionalSiteById.get(id));
        const expectedAffected = [...new Set(sites.flatMap((site) => site?.affectedClauseIds ?? []))].sort();
        const expectedContext = sha256Text(JSON.stringify(
            sites
                .filter((site): site is NonNullable<typeof site> => site !== undefined)
                .sort((left, right) => left.sourceOffset - right.sourceOffset)
                .map((site) => ({ id: site.id, contextSha256: site.contextSha256 })),
        ));
        if (
            family.id !== `optional-family-${sha256Text(JSON.stringify(withoutId))}` ||
            !clauseById.has(family.featureClauseId) ||
            family.siteIds.length === 0 ||
            new Set(family.siteIds).size !== family.siteIds.length ||
            sites.some((site) => !site || site.familyId !== family.id || site.targetClauseIds[0] !== family.featureClauseId) ||
            JSON.stringify(family.affectedClauseIds) !== JSON.stringify(expectedAffected) ||
            family.contextSha256 !== expectedContext
        ) {
            throw new Error(`clauses.json has an invalid normative-optional family ${family.id}`);
        }
        for (const site of family.siteIds) {
            if (familyMembers.has(site)) throw new Error(`normative-optional site ${site} belongs to multiple families`);
            familyMembers.add(site);
        }
    }
    if (familyMembers.size !== optionalSiteById.size) {
        throw new Error("clauses.json normative-optional families do not exactly partition the site set");
    }
    const xrefById = new Map(catalog.xrefs.map((xref) => [xref.id, xref]));
    if (
        catalog.xrefSetSha256 !== sha256Text(JSON.stringify(catalog.xrefs)) ||
        xrefById.size !== catalog.xrefs.length
    ) {
        throw new Error("clauses.json exact xref identity is invalid");
    }
    for (const xref of catalog.xrefs) {
        const withoutId = {
            sourceClauseId: xref.sourceClauseId,
            sourceAnchor: xref.sourceAnchor,
            targetAnchor: xref.targetAnchor,
            targetClauseId: xref.targetClauseId,
            sourceOffset: xref.sourceOffset,
            endOffset: xref.endOffset,
            contextSha256: xref.contextSha256,
            provenance: xref.provenance,
        };
        if (
            xref.id !== `xref-${sha256Text(JSON.stringify(withoutId))}` ||
            anchorById.get(xref.sourceAnchor) !== xref.sourceClauseId ||
            (xref.targetClauseId !== null && anchorById.get(xref.targetAnchor) !== xref.targetClauseId) ||
            !["normative", "note", "example", "informative"].includes(xref.provenance)
        ) {
            throw new Error(`clauses.json has an invalid exact xref ${xref.id}`);
        }
    }
    const definitionById = new Map(catalog.definitions.map((definition) => [definition.id, definition]));
    if (
        catalog.definitionSetSha256 !== sha256Text(JSON.stringify(catalog.definitions)) ||
        definitionById.size !== catalog.definitions.length
    ) {
        throw new Error("clauses.json exact definition identity is invalid");
    }
    for (const definition of catalog.definitions) {
        const withoutId = {
            kind: definition.kind,
            sourceClauseId: definition.sourceClauseId,
            sourceAnchor: definition.sourceAnchor,
            sourceOffset: definition.sourceOffset,
            endOffset: definition.endOffset,
            contextStartOffset: definition.contextStartOffset,
            contextEndOffset: definition.contextEndOffset,
            contextSha256: definition.contextSha256,
            provenance: definition.provenance,
        };
        if (
            definition.id !== `definition-${sha256Text(JSON.stringify(withoutId))}` ||
            anchorById.get(definition.sourceAnchor) !== definition.sourceClauseId ||
            definition.contextStartOffset > definition.sourceOffset ||
            definition.sourceOffset >= definition.endOffset ||
            definition.endOffset > definition.contextEndOffset ||
            !["dfn", "grammar-definition"].includes(definition.kind) ||
            !["normative", "note", "example", "informative"].includes(definition.provenance)
        ) {
            throw new Error(`clauses.json has an invalid exact definition ${definition.id}`);
        }
    }
    const trackedFiles = await trackedProjectFiles();
    const e2eManifest = await discoverE2eCaseManifest(undefined, trackedFiles);
    const generatedEntries = new Map<string, Array<(typeof e2eManifest)[number]>>();
    for (const entry of e2eManifest) {
        if (!entry.generator) continue;
        const entries = generatedEntries.get(entry.generator) ?? [];
        entries.push(entry);
        generatedEntries.set(entry.generator, entries);
    }
    const allGeneratedNames = new Set(generatedEntries.keys());
    const generatedNames = new Set(
        [...generatedEntries]
            .filter(([, entries]) => entries.length > 0 && entries.every(runtimeEvidenceEligible))
            .map(([generator]) => generator),
    );
    const e2eCases = new Map(e2eManifest.map((entry) => [entry.name, entry]));
    const propertyFiles = new Set(
        (await propertyEvidenceFiles(trackedFiles))
            .map((filename) => path.relative(projectRoot, filename).split(path.sep).join("/")),
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
        if (feature.clauses.some((clause) => {
            const classification = clauseById.get(clause)?.classification;
            return classification !== "required" && classification !== "normative-optional";
        })) {
            throw new Error(`feature ${feature.tag} maps to non-normative specification material`);
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
    const validateEvidenceRefs = async (
        label: string,
        evidence: EvidenceRefs,
        requireConformanceEligible = false,
    ): Promise<void> => {
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
            if (!allGeneratedNames.has(name)) throw new Error(`${label} references unknown generated evidence ${name}`);
            if (requireConformanceEligible && !generatedNames.has(name)) {
                throw new Error(`${label} generated evidence ${name} must execute as a positive native runtime case`);
            }
        }
        for (const name of evidence.stress) {
            const entry = e2eCases.get(name);
            if (!allGeneratedNames.has(name) && !entry) {
                throw new Error(`${label} references unknown stress evidence ${name}`);
            }
            if (
                requireConformanceEligible &&
                (!entry || !runtimeEvidenceEligible(entry) || !entry.generator || !entry.generatorParameters)
            ) {
                throw new Error(
                    `${label} stress evidence ${name} must be one exact generated positive native runtime case`,
                );
            }
        }
        for (const name of evidence.e2e) {
            const entry = e2eCases.get(name);
            if (!entry) throw new Error(`${label} references missing E2E case ${name}`);
            if (requireConformanceEligible && !runtimeEvidenceEligible(entry)) {
                throw new Error(`${label} E2E evidence ${name} must be a discovered positive, native runtime case`);
            }
        }
        for (const name of evidence.negativeDiagnostics) {
            const entry = e2eCases.get(name);
            if (
                !entry ||
                entry.expectedExitCode === undefined ||
                entry.expectedExitCode === 0 ||
                entry.emitCOnly ||
                entry.semanticDelegation ||
                !entry.expectedStderrContains ||
                entry.expectedStderrContains.trim() === ""
            ) {
                throw new Error(`${label} negative evidence ${name} must be a discovered nonzero-exit case with an exact diagnostic assertion`);
            }
        }
        for (const reference of evidence.implementation) {
            const separator = reference.lastIndexOf("#");
            const filename = separator < 0 ? reference : reference.slice(0, separator);
            const locator = separator < 0 ? "" : reference.slice(separator + 1);
            const allowed = (requireConformanceEligible ? ["src/", "runtime/"] : ["src/", "runtime/", "stdlib/"])
                .some((prefix) => filename.startsWith(prefix));
            if (!allowed || (requireConformanceEligible && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(locator))) {
                throw new Error(`${label} references an unbound implementation locator ${reference}`);
            }
            await requireTrackedRegularProjectFile(filename, trackedFiles, `${label} implementation`);
            if (locator !== "") {
                const implementation = await fs.readFile(path.join(projectRoot, filename), "utf8");
                const escaped = locator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                if (!new RegExp(`\\b${escaped}\\b`).test(implementation)) {
                    throw new Error(`${label} implementation locator is absent: ${reference}`);
                }
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
            await requireTrackedRegularProjectFile(filename, trackedFiles, `${label} declaration surface`);
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
        if (evidence.disposition !== "evidence" || evidence.partitions.length === 0) {
            throw new Error(`${evidence.clause} evidence disposition requires independently evidenced partitions`);
        }
        const partitionIds = new Set<string>();
        for (const partition of evidence.partitions) {
            if (partitionIds.has(partition.id)) throw new Error(`${evidence.clause} has duplicate partition ${partition.id}`);
            partitionIds.add(partition.id);
            uniqueStrings(
                partition.normativeOptionalFamilies,
                `${evidence.clause}.${partition.id}.normativeOptionalFamilies`,
            );
            uniqueStrings(
                partition.normativeOptionalSites,
                `${evidence.clause}.${partition.id}.normativeOptionalSites`,
            );
            if (
                partition.normativeOptionalFamilies.some((family) => !optionalFamilyById.has(family)) ||
                partition.normativeOptionalSites.some((site) => !optionalSiteById.has(site)) ||
                partition.normativeOptionalSites.some((site) => {
                    const family = optionalSiteById.get(site)?.familyId;
                    return !family || !partition.normativeOptionalFamilies.includes(family);
                }) ||
                partition.normativeOptionalFamilies.some((family) =>
                    !partition.normativeOptionalSites.some((site) => optionalSiteById.get(site)?.familyId === family)
                )
            ) {
                throw new Error(`${evidence.clause}.${partition.id} has invalid reciprocal normative-optional bindings`);
            }
            await validateEvidenceRefs(`${evidence.clause}.${partition.id}.localEvidence`, partition.localEvidence, true);
            const terminalPartition = partition.test262Queries.length > 0 || partition.upstreamTestGap !== undefined;
            if (
                !terminalPartition &&
                (partition.normativeOptionalFamilies.length > 0 || partition.normativeOptionalSites.length > 0)
            ) {
                throw new Error(`${evidence.clause}.${partition.id} binds normative-optional semantics without terminal evidence`);
            }
            if (partition.surface === "definition") {
                if (!isNormativeDefinitionBinding(definitionById.get(partition.definition ?? ""), evidence.clause)) {
                    throw new Error(`${evidence.clause}.${partition.id} definition surface lacks one exact normative definition record`);
                }
            } else if (partition.definition !== null) {
                throw new Error(`${evidence.clause}.${partition.id} binds a definition record on a non-definition surface`);
            }
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
            } else if (partition.surface !== "definition") {
                throw new Error(`${evidence.clause}.${partition.id} may inherit coveredBy evidence only as an exact definitional partition`);
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
                let upstreamIssue = false;
                try {
                    const url = new URL(partition.upstreamTestGap);
                    upstreamIssue =
                        url.protocol === "https:" &&
                        url.hostname === "github.com" &&
                        /^\/tc39\/test262\/issues\/[1-9][0-9]*$/.test(url.pathname) &&
                        url.search === "" &&
                        url.hash === "";
                } catch {
                    upstreamIssue = false;
                }
                if (!upstreamIssue) {
                    throw new Error(`${evidence.clause}.${partition.id} upstream gap must cite one exact tc39/test262 issue`);
                }
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
    const evidenceKinds: EvidenceKind[] = [
        "property",
        "generatedRegression",
        "stress",
        "e2e",
        "negativeDiagnostics",
        "declarationSurface",
        "implementation",
    ];
    const registeredArtifacts = new Map<string, EvidenceRegistryArtifact>();
    for (const artifact of evidenceRegistry.artifacts) {
        const registryKey = `${artifact.kind}\0${artifact.id}`;
        if (registeredArtifacts.has(registryKey)) {
            throw new Error(`duplicate reciprocal evidence registration ${artifact.kind}:${artifact.id}`);
        }
        if (artifact.kind === "stress") {
            requireCanonicalStressBinding(
                e2eCases.get(artifact.id),
                artifact.stressReview,
                `stress:${artifact.id}`,
            );
        } else if (artifact.stressReview !== undefined) {
            throw new Error(`${artifact.kind}:${artifact.id} has a stress review on a non-stress artifact`);
        }
        registeredArtifacts.set(registryKey, artifact);
        for (const target of artifact.targets) {
            const partition = partitions.get(target);
            if (
                !partition ||
                (partition.test262Queries.length === 0 && partition.upstreamTestGap === undefined) ||
                !partition.localEvidence[artifact.kind].includes(artifact.id)
            ) {
                throw new Error(`${artifact.kind}:${artifact.id} has a dangling or non-reciprocal target ${target}`);
            }
        }
    }
    for (const [target, partition] of partitions) {
        const terminal = partition.test262Queries.length > 0 || partition.upstreamTestGap !== undefined;
        if (!terminal) continue;
        for (const kind of evidenceKinds) {
            for (const id of partition.localEvidence[kind]) {
                const artifact = registeredArtifacts.get(`${kind}\0${id}`);
                if (!artifact?.targets.includes(target)) {
                    throw new Error(`${target} has unregistered or unrelated ${kind} evidence ${id}`);
                }
            }
        }
    }
    const obligationById = new Map(catalog.choiceObligations.map((obligation) => [obligation.id, obligation]));
    const selectionByObligation = new Map(matrix.choiceSelections.map((selection) => [selection.obligation, selection]));
    const selectedObligations = new Set<string>();
    for (const selection of matrix.choiceSelections) {
        const obligation = obligationById.get(selection.obligation);
        if (
            !obligation ||
            selectedObligations.has(selection.obligation) ||
            selection.selection.trim() === "" ||
            selection.rationale.trim() === "" ||
            selection.reviewedBy.trim() === "" ||
            selection.evidence.length === 0
        ) {
            throw new Error(`invalid, duplicate, or unbound specification choice selection ${selection.obligation}`);
        }
        selectedObligations.add(selection.obligation);
        const evidencedSubjects = new Set<string>();
        for (const reference of selection.evidence) {
            const partition = partitions.get(`${reference.clause}#${reference.partition}`);
            const direct = partition && (partition.test262Queries.length > 0 || partition.upstreamTestGap !== undefined);
            if (
                !obligation.subjectClauseIds.includes(reference.clause) ||
                !direct ||
                partition.choiceObligation !== selection.obligation ||
                partition.localEvidence.implementation.length === 0
            ) {
                throw new Error(`${selection.obligation} choice selection references an unrelated or missing evidence partition`);
            }
            evidencedSubjects.add(reference.clause);
        }
        if (obligation.subjectClauseIds.some((clause) => !evidencedSubjects.has(clause))) {
            throw new Error(`${selection.obligation} choice selection does not evidence every normative subject clause`);
        }
    }
    for (const [target, partition] of partitions) {
        if (partition.choiceObligation === null) continue;
        const obligation = obligationById.get(partition.choiceObligation);
        const separator = target.lastIndexOf("#");
        const clause = target.slice(0, separator);
        const selection = selectionByObligation.get(partition.choiceObligation);
        if (
            !obligation ||
            !obligation.subjectClauseIds.includes(clause) ||
            (partition.test262Queries.length === 0 && partition.upstreamTestGap === undefined) ||
            !selection?.evidence.some((reference) => `${reference.clause}#${reference.partition}` === target)
        ) {
            throw new Error(`${target} has a dangling or non-reciprocal choice obligation`);
        }
    }
    const evidencedOptionalFamilies = new Set<string>();
    for (const evidence of matrix.normativeOptionalEvidence) {
        const family = optionalFamilyById.get(evidence.family);
        if (
            !family ||
            evidence.policy !== "implemented-all" ||
            evidencedOptionalFamilies.has(evidence.family) ||
            evidence.rationale.trim() === "" ||
            evidence.reviewedBy.trim() === "" ||
            evidence.evidence.length === 0
        ) {
            throw new Error(`invalid, duplicate, or unbound normative-optional family evidence ${evidence.family}`);
        }
        evidencedOptionalFamilies.add(evidence.family);
        const evidencedClauses = new Set<string>();
        const evidencedSites = new Set<string>();
        for (const reference of evidence.evidence) {
            const partition = partitions.get(`${reference.clause}#${reference.partition}`);
            const direct = partition && (partition.test262Queries.length > 0 || partition.upstreamTestGap !== undefined);
            const boundSites = partition?.normativeOptionalSites.filter((site) =>
                optionalSiteById.get(site)?.familyId === family.id
            ) ?? [];
            if (
                !family.affectedClauseIds.includes(reference.clause) ||
                !direct ||
                partition.localEvidence.implementation.length === 0 ||
                !partition.normativeOptionalFamilies.includes(family.id) ||
                boundSites.length === 0 ||
                boundSites.some((site) => !optionalSiteById.get(site)?.affectedClauseIds.includes(reference.clause))
            ) {
                throw new Error(`${evidence.family} normative-optional evidence references an unrelated or missing partition`);
            }
            evidencedClauses.add(reference.clause);
            for (const site of boundSites) evidencedSites.add(site);
        }
        if (family.affectedClauseIds.some((clause) => !evidencedClauses.has(clause))) {
            throw new Error(`${evidence.family} does not evidence every clause affected by the normative-optional family`);
        }
        if (family.siteIds.some((site) => !evidencedSites.has(site))) {
            throw new Error(`${evidence.family} does not evidence every site in the normative-optional family`);
        }
    }
    const optionalEvidenceByFamily = new Map(
        matrix.normativeOptionalEvidence.map((evidence) => [evidence.family, evidence]),
    );
    for (const [target, partition] of partitions) {
        const separator = target.lastIndexOf("#");
        const clause = target.slice(0, separator);
        for (const familyId of partition.normativeOptionalFamilies) {
            const family = optionalFamilyById.get(familyId);
            const evidence = optionalEvidenceByFamily.get(familyId);
            if (
                !family ||
                !family.affectedClauseIds.includes(clause) ||
                (partition.test262Queries.length === 0 && partition.upstreamTestGap === undefined) ||
                !evidence?.evidence.some((reference) => `${reference.clause}#${reference.partition}` === target)
            ) {
                throw new Error(`${target} has a dangling or non-reciprocal normative-optional family binding`);
            }
        }
    }
    for (const evidence of exactEvidence.values()) {
        for (const partition of evidence.partitions) {
            for (const edge of partition.coveredBy) {
                const targetClause = clauseById.get(edge.clause);
                if (!targetClause || !partitions.has(`${edge.clause}#${edge.partition}`)) {
                    throw new Error(`${evidence.clause}.${partition.id} has a dangling coveredBy partition`);
                }
                const xref = xrefById.get(edge.xref);
                const relationshipValid = edge.relation === "references"
                    ? isNormativeXrefBinding(xref, evidence.clause, edge.clause)
                    : isNormativeXrefBinding(xref, edge.clause, evidence.clause);
                if (!relationshipValid) {
                    throw new Error(`${evidence.clause}.${partition.id} coveredBy edge has no matching exact normative xref record`);
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
        !Array.isArray(overrides.legacyIdRules) ||
        !Array.isArray(overrides.pathRules) ||
        !Array.isArray(overrides.testOverrides)
    ) {
        throw new Error("mapping-overrides.json has an unsupported schema");
    }
    const validateMappingBase = (mapping: Record<string, unknown>, label: string): void => {
        const clauses = uniqueStrings(mapping.clauses, `${label}.clauses`, false);
        if (clauses.some((clause) => !clauseById.has(clause))) throw new Error(`${label} references unknown clauses`);
        if (clauses.some((clause) => {
            const classification = clauseById.get(clause)?.classification;
            return classification !== "required" && classification !== "normative-optional";
        })) {
            throw new Error(`${label} references non-normative specification material`);
        }
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
    const legacyRules = new Map<string, Array<{ match: "exact" | "prefix"; value: string }>>();
    for (const mapping of overrides.legacyIdRules) {
        validateMappingBase(mapping, "legacy id rule");
        const field = mapping.field;
        const match = mapping.match;
        const value = mapping.value;
        if (
            (field !== "es5id" && field !== "es6id") ||
            (match !== "exact" && match !== "prefix") ||
            typeof value !== "string" ||
            value.trim() !== value ||
            value.length === 0 ||
            /[\s*?\[\]]/.test(value) ||
            (match === "prefix" && /[A-Za-z0-9]$/.test(value))
        ) {
            throw new Error("legacy id rules must name es5id/es6id and use one non-empty exact id or semantic-boundary prefix");
        }
        const existing = legacyRules.get(field) ?? [];
        const overlaps = existing.some((candidate) => {
            if (candidate.match === "exact" && match === "exact") return candidate.value === value;
            if (candidate.match === "prefix" && match === "prefix") {
                return candidate.value.startsWith(value) || value.startsWith(candidate.value);
            }
            return candidate.match === "prefix"
                ? value.startsWith(candidate.value)
                : candidate.value.startsWith(value);
        });
        if (overlaps) {
            throw new Error("legacy id rules must be unique and non-overlapping within each metadata field");
        }
        existing.push({ match, value });
        legacyRules.set(field, existing);
    }
    const prefixes = new Set<string>();
    for (const mapping of overrides.pathRules) {
        validateMappingBase(mapping, "path rule");
        const prefix = mapping.prefix;
        const esid = mapping.esid;
        const key = `${typeof esid === "string" ? esid : "<missing-esid>"}\0${String(prefix)}`;
        const esidClause = typeof esid === "string" ? anchorById.get(esid) : undefined;
        const esidClassification = esidClause ? clauseById.get(esidClause)?.classification : undefined;
        if (
            typeof prefix !== "string" ||
            !prefix.startsWith("test/") ||
            !prefix.endsWith("/") ||
            prefix.includes("..") ||
            /[*?\[\]]/.test(prefix) ||
            prefixes.has(key) ||
            !(
                esid === undefined ||
                (
                    typeof esid === "string" &&
                    esid.trim() !== "" &&
                    (esidClassification === "informative" || esidClassification === "example")
                )
            )
        ) {
            throw new Error("path rules must be unique exact semantic directory prefixes; an esid qualifier may name only pinned non-normative material");
        }
        prefixes.add(key);
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
    if (
        JSON.stringify(hostProfile.environmentAllowlist) !== JSON.stringify(canonicalEvidenceEnvironmentAllowlist) ||
        JSON.stringify(hostProfile.environmentAllowlist) !== JSON.stringify(baseline.executionProfile.environmentAllowlist) ||
        !(hostProfile.executionContract === "diagnostic-only-v1" ||
            hostProfile.executionContract === "tsc2c-runner-owned-native-v1") ||
        (hostProfile.claimEligible && hostProfile.executionContract !== "tsc2c-runner-owned-native-v1")
    ) {
        throw new Error("host profile lacks the canonical sanitized environment/native execution contract");
    }
    const hostEntry = hostProfile.command[1];
    if (
        hostProfile.command.length !== 2 ||
        hostProfile.command[0] !== "bun" ||
        !hostEntry ||
        path.posix.normalize(hostEntry) !== hostEntry ||
        !hostEntry.startsWith("tests/test262/") ||
        !hostEntry.endsWith(".ts") ||
        !trackedFiles.has(hostEntry) ||
        !hostProfile.implementationFiles.includes(hostEntry)
    ) {
        throw new Error("host profile command must be exactly bun plus one tracked, bound tests/test262 TypeScript entry");
    }
    for (const filename of hostProfile.implementationFiles) {
        const allowed = ["tests/test262/", "src/", "runtime/", "stdlib/"].some((prefix) => filename.startsWith(prefix)) ||
            [
                "package.json",
                "bun.lock",
                "compliance/ecmascript-2026/evidence-registry.json",
                "compliance/ecmascript-2026/evidence-registry.schema.json",
            ].includes(filename);
        if (!allowed) {
            throw new Error(`host profile implementation path is missing/unsafe: ${filename}`);
        }
        await requireTrackedRegularProjectFile(filename, trackedFiles, "host profile implementation");
    }
    const canonicalImplementation = [
        ...[...trackedFiles]
            .filter((filename) => ["tests/test262/", "src/", "runtime/", "stdlib/"].some((prefix) => filename.startsWith(prefix))),
        "package.json",
        "bun.lock",
        "compliance/ecmascript-2026/evidence-registry.json",
        "compliance/ecmascript-2026/evidence-registry.schema.json",
    ].sort();
    if (JSON.stringify([...hostProfile.implementationFiles].sort()) !== JSON.stringify(canonicalImplementation)) {
        throw new Error("host implementationFiles must equal the complete tracked compiler/runtime/runner source worklist");
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
    const obligationById = new Map(catalog.choiceObligations.map((obligation) => [obligation.id, obligation]));
    const selectionsByClause = new Map<string, ChoiceSelection[]>();
    for (const selection of matrix.choiceSelections) {
        const obligation = obligationById.get(selection.obligation);
        for (const clause of obligation?.subjectClauseIds ?? []) {
            const selections = selectionsByClause.get(clause) ?? [];
            selections.push(selection);
            selectionsByClause.set(clause, selections);
        }
    }
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
            lines.push(`  - [ ] \`${clause.id}\` — ${clause.title}`);
            for (const selection of selectionsByClause.get(clause.id) ?? []) {
                const obligation = obligationById.get(selection.obligation);
                lines.push(`    - ${obligation?.kind ?? "specification-choice"} selection \`${selection.obligation}\`: ${selection.selection}.`);
            }
            for (const partition of evidence.partitions) {
                lines.push(`    - [ ] \`${partition.id}\` (${partition.surface}, ${partition.cardinality}): ${partition.title}.`);
            }
        }
    }
    lines.push(
        "",
        "## Specification choice obligations",
        "",
        "Each entry is independently extracted from normative marked text, normative host-hook declarations, or the Host Layering Points inventory. A selection must cite executable clause partitions; there is no authored not-applicable escape.",
        "",
    );
    const selectionById = new Map(matrix.choiceSelections.map((selection) => [selection.obligation, selection]));
    for (const obligation of catalog.choiceObligations) {
        const selection = selectionById.get(obligation.id);
        const state = selection ? `selected behaviour: ${selection.selection}` : "exact evidenced selection missing";
        lines.push(`- [ ] \`${obligation.id}\` — ${obligation.kind}, ${obligation.trigger}, source \`${obligation.sourceClauseId}\`: ${state}.`);
    }
    lines.push(
        "",
        "## Atomic normative-optional families",
        "",
        "The claim profile implements all normative-optional material, including inline algorithm and grammar insertion points. Every mechanically extracted site belongs to one feature family, and each family must terminate as one implemented-all unit in reciprocally bound partition evidence.",
        "",
    );
    const optionalEvidenceByFamily = new Map(
        matrix.normativeOptionalEvidence.map((evidence) => [evidence.family, evidence]),
    );
    for (const family of catalog.normativeOptionalFamilies) {
        const evidence = optionalEvidenceByFamily.get(family.id);
        const state = evidence ? "partition evidence linked" : "partition evidence missing";
        lines.push(`- [ ] \`${family.id}\` — ${family.kind}, feature \`${family.featureClauseId}\`: ${state}.`);
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
        "A group is complete only when every normative descendant clause terminates in executable evidence or an inherited definition bound to one exact normative definition and xref record, every mapped in-scope Test262 scenario/variant passes under a claim-eligible host, and the generated/property, representative stress, negative-diagnostic, and E2E evidence required by the semantic partitions passes for the same clean source revision. Missing mappings, skips, unsupported diagnostics, timeouts, crashes, infrastructure errors, stale results, or a filtered/sharded-only result keep the box open.",
    );
    return `${lines.join("\n")}\n`;
}
