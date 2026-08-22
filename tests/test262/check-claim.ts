#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { buildInventory, type ScenarioRecord, type Test262Inventory } from "./inventory";
import {
    collectToolchain,
    e2eEvidenceManifestDigest,
    generatedManifestDigest,
    propertyManifestDigest,
    type LocalGatesReport,
} from "./local-gates";
import {
    loadAndValidateMatrix,
    type ClausePartition,
    type ComplianceMatrix,
} from "./matrix";
import {
    argumentValue,
    complianceDir,
    defaultArtifactRoot,
    defaultCacheRoot,
    fileManifestSha256,
    loadRegularFileSnapshot,
    loadBaseline,
    projectRoot,
    projectSourceIdentity,
    readJson,
    recordedEnvironment,
    resolveExecutableIdentity,
    runProcess,
    sanitizedEvidenceEnvironment,
    sha256Text,
    stableJson,
    type Baseline,
    type LoadedRegularFile,
} from "./model";
import {
    hostProtocolVersion,
    parseHostObservation,
    requireCanonicalNativeTranscript,
    type HostExecutionContract,
} from "./protocol";
import {
    judge,
    scenarioRequestIdentity,
    type MergedShardIdentity,
    type ScenarioResult,
} from "./run";
import { buildCatalog, type ClauseCatalog } from "./spec-catalog";
import type { FeatureMap } from "./feature-map";
import {
    buildEvidenceContainment,
    type BuiltContainmentIdentity,
} from "./process-supervision";

interface HostProfile {
    schemaVersion: 1;
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
    executionContract: HostExecutionContract;
    environmentAllowlist: string[];
}

interface Test262Report {
    schemaVersion: number;
    kind: string;
    runnerContractVersion: number;
    sourceStart: Awaited<ReturnType<typeof projectSourceIdentity>>;
    sourceEnd: Awaited<ReturnType<typeof projectSourceIdentity>>;
    toolchain: Record<string, string>;
    executionProfile: {
        id: string;
        platform: string;
        architecture: string;
        environmentAllowlist: string[];
        environment: Record<string, string>;
        effectiveEnvironment: Record<string, string>;
    };
    host: {
        profileId: string;
        protocolVersion: number;
        semanticDelegation: boolean;
        capabilities: Record<string, boolean>;
        executionContract: HostExecutionContract;
        effectiveEnvironmentSha256: string;
        claimEligible: boolean;
        command: string[];
        executable: Awaited<ReturnType<typeof resolveExecutableIdentity>>;
        implementationSha256: string;
        dependencyManifestSha256: string;
    };
    containment: BuiltContainmentIdentity;
    timeoutMs: number;
    inventory: Test262Inventory;
    corpusEndSha256: string;
    resultSetSha256: string;
    results: ScenarioResult[];
    mergedShards: MergedShardIdentity[];
}

interface Blocker {
    code: string;
    detail: string;
    group?: string;
    clause?: string;
    partition?: string;
    scenario?: string;
    feature?: string;
}

interface GroupResult {
    id: string;
    status: "passing" | "failing" | "unverified" | "blocked";
    blockers: string[];
}

function sameJson(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function addBlocker(blockers: Blocker[], blocker: Blocker): void {
    const identity = JSON.stringify(blocker);
    if (!blockers.some((existing) => JSON.stringify(existing) === identity)) blockers.push(blocker);
}

export function requireCanonicalMergedShards(value: unknown): MergedShardIdentity[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error("merged Test262 report has no exact shard provenance worklist");
    }
    const digests = new Set<string>();
    for (let index = 0; index < value.length; index++) {
        const entry = value[index];
        if (
            entry === null ||
            typeof entry !== "object" ||
            Array.isArray(entry) ||
            JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(["index", "sha256", "total"])
        ) {
            throw new Error(`merged Test262 shard ${index} has a non-canonical identity`);
        }
        const identity = entry as Record<string, unknown>;
        if (
            identity.index !== index ||
            identity.total !== value.length ||
            typeof identity.sha256 !== "string" ||
            !/^[0-9a-f]{64}$/.test(identity.sha256) ||
            digests.has(identity.sha256)
        ) {
            throw new Error(`merged Test262 shard ${index} has an invalid exact-byte identity`);
        }
        digests.add(identity.sha256);
    }
    return value as MergedShardIdentity[];
}

function exactIdSet<T>(
    items: readonly T[],
    id: (item: T) => string,
    label: string,
    blockers: Blocker[],
): Map<string, T> {
    const result = new Map<string, T>();
    for (const item of items) {
        const key = id(item);
        if (result.has(key)) addBlocker(blockers, { code: "duplicate-result", detail: `${label} contains duplicate ${key}`, scenario: key });
        else result.set(key, item);
    }
    return result;
}

function sourceMatches(
    label: string,
    source: Awaited<ReturnType<typeof projectSourceIdentity>>,
    current: Awaited<ReturnType<typeof projectSourceIdentity>>,
    blockers: Blocker[],
): void {
    if (!source || typeof source !== "object") {
        addBlocker(blockers, { code: "invalid-source", detail: `${label} has no source identity` });
        return;
    }
    if (!source.clean) addBlocker(blockers, { code: "dirty-source", detail: `${label} was produced from a dirty source tree` });
    if (source.commit !== current.commit || source.tree !== current.tree || source.statusSha256 !== current.statusSha256) {
        addBlocker(blockers, { code: "stale-source", detail: `${label} does not identify the current source revision` });
    }
}

function criticalResultShape(result: ScenarioResult): Record<string, unknown> {
    return {
        id: result.id,
        status: result.status,
        observed: result.observed,
        detail: result.detail,
        phase: result.phase,
        errorConstructor: result.errorConstructor,
        stdoutSha256: result.stdoutSha256,
        stderrSha256: result.stderrSha256,
        observation: result.observation,
    };
}

async function validateTest262Report(
    report: Test262Report,
    expectedInventory: Test262Inventory,
    currentSource: Awaited<ReturnType<typeof projectSourceIdentity>>,
    baseline: Baseline,
    profile: HostProfile,
    matrix: ComplianceMatrix,
    catalog: ClauseCatalog,
    expectedContainment: BuiltContainmentIdentity,
    blockers: Blocker[],
): Promise<Map<string, ScenarioResult>> {
    if (report.schemaVersion !== 1 || report.kind !== "test262-run") {
        addBlocker(blockers, { code: "invalid-test262-report", detail: "Test262 report schema/kind is invalid" });
    }
    if (report.runnerContractVersion !== baseline.runnerContract.version) {
        addBlocker(blockers, { code: "runner-contract-drift", detail: "Test262 report uses a different runner contract" });
    }
    sourceMatches("Test262 report start", report.sourceStart, currentSource, blockers);
    sourceMatches("Test262 report end", report.sourceEnd, currentSource, blockers);
    if (!sameJson(report.sourceStart, report.sourceEnd)) {
        addBlocker(blockers, { code: "source-changed", detail: "source state changed during the Test262 run" });
    }
    const effectiveEnvironment = recordedEnvironment(sanitizedEvidenceEnvironment(
        profile.environmentAllowlist,
        baseline.executionProfile.environment,
    ));
    const expectedProfile = {
        id: baseline.executionProfile.id,
        platform: baseline.executionProfile.platform,
        architecture: baseline.executionProfile.architecture,
        environmentAllowlist: baseline.executionProfile.environmentAllowlist,
        environment: baseline.executionProfile.environment,
        effectiveEnvironment,
    };
    if (!sameJson(report.executionProfile, expectedProfile)) {
        addBlocker(blockers, { code: "execution-profile-drift", detail: "Test262 report used a different platform/environment profile" });
    }
    const currentToolchain = await collectToolchain(
        baseline.executionProfile.compiler,
        baseline.executionProfile.environment,
    );
    if (!sameJson(report.toolchain, currentToolchain)) {
        addBlocker(blockers, { code: "toolchain-drift", detail: "Test262 toolchain differs from the current claim environment" });
    }
    if (!sameJson(report.containment, expectedContainment)) {
        addBlocker(blockers, { code: "containment-drift", detail: "Test262 report did not use the exact rebuilt process supervisor/native guard" });
    }
    if (!sameJson(report.inventory, expectedInventory)) {
        addBlocker(blockers, { code: "inventory-drift", detail: "reported inventory differs from a complete fresh pinned discovery" });
    }
    if (report.corpusEndSha256 !== expectedInventory.corpusManifestSha256) {
        addBlocker(blockers, { code: "corpus-drift", detail: "Test262 corpus bytes changed or were not attested at run completion" });
    }
    for (const issue of expectedInventory.issues) {
        if (issue.claimBlocking) addBlocker(blockers, { code: issue.code, detail: issue.detail, scenario: issue.test });
    }
    const [expectedImplementation, expectedDependencyManifest, expectedExecutable] = await Promise.all([
        fileManifestSha256(profile.implementationFiles),
        fileManifestSha256(["package.json", "bun.lock"]),
        resolveExecutableIdentity(profile.command[0]!, effectiveEnvironment),
    ]);
    if (
        report.host?.profileId !== profile.id ||
        report.host?.protocolVersion !== hostProtocolVersion ||
        report.host?.claimEligible !== profile.claimEligible ||
        report.host?.semanticDelegation !== profile.semanticDelegation ||
        !sameJson(report.host?.capabilities, profile.capabilities) ||
        report.host?.executionContract !== profile.executionContract ||
        report.host?.effectiveEnvironmentSha256 !== sha256Text(JSON.stringify(effectiveEnvironment)) ||
        !sameJson(report.host?.command, profile.command) ||
        !sameJson(report.host?.executable, expectedExecutable) ||
        report.host?.implementationSha256 !== expectedImplementation ||
        report.host?.dependencyManifestSha256 !== expectedDependencyManifest
    ) {
        addBlocker(blockers, { code: "host-profile-drift", detail: "Test262 report is not bound to the exact reviewed in-repository host" });
    }
    if (!profile.claimEligible || profile.semanticDelegation) {
        addBlocker(blockers, { code: "host-ineligible", detail: "reviewed Test262 host is not eligible for conformance evidence" });
    }
    if (profile.claimEligible && profile.executionContract !== "tsc2c-runner-owned-native-v1") {
        addBlocker(blockers, { code: "host-execution-contract", detail: "claim-eligible host lacks the runner-owned native artifact/execution contract" });
    }
    if (baseline.runnerContract.requiredCapabilities.some((capability) => profile.capabilities[capability] !== true)) {
        addBlocker(blockers, { code: "host-capability-gap", detail: "reviewed Test262 host lacks a required pinned capability" });
    }
    if (report.resultSetSha256 !== sha256Text(JSON.stringify(report.results))) {
        addBlocker(blockers, { code: "result-digest-mismatch", detail: "Test262 result-set digest does not match the full recorded observations" });
    }
    try {
        requireCanonicalMergedShards(report.mergedShards);
    } catch (error) {
        addBlocker(blockers, {
            code: "invalid-shard-provenance",
            detail: error instanceof Error ? error.message : String(error),
        });
    }

    const expected = expectedInventory.scenarios.filter(
        (scenario) => scenario.scope === "in-scope" || scenario.scope === "runner-self-test",
    );
    if (!sameJson(report.results?.map((result) => result.id), expected.map((scenario) => scenario.id))) {
        addBlocker(blockers, { code: "result-order-set-mismatch", detail: "Test262 result array is not the canonical complete scenario worklist" });
    }
    const reportedById = exactIdSet(report.results ?? [], (result) => result.id, "Test262 results", blockers);
    const computedById = new Map<string, ScenarioResult>();
    const expectedIds = new Set(expected.map((scenario) => scenario.id));
    const resourcesByDirectory = new Map(
        expectedInventory.resourceDirectories.map((directory) => [directory.directory, directory]),
    );
    for (const scenario of expected) {
        const reported = reportedById.get(scenario.id);
        if (!reported) {
            addBlocker(blockers, { code: "missing-result", detail: "scenario has no terminal observation", scenario: scenario.id });
            continue;
        }
        if (!baseline.runnerContract.allowedResultStatuses.includes(reported.status)) {
            addBlocker(blockers, { code: "invalid-result-status", detail: `invalid result status ${String(reported.status)}`, scenario: scenario.id });
            continue;
        }
        let observation;
        try {
            observation = parseHostObservation(reported.observation);
        } catch (error) {
            addBlocker(blockers, {
                code: "invalid-observation",
                detail: error instanceof Error ? error.message : String(error),
                scenario: scenario.id,
            });
            continue;
        }
        if (observation.scenarioId !== scenario.id) {
            addBlocker(blockers, { code: "observation-identity-mismatch", detail: "observation names a different scenario", scenario: scenario.id });
            continue;
        }
        if (profile.claimEligible) {
            const resourceDirectory = resourcesByDirectory.get(scenario.resourceDirectory);
            try {
                if (!resourceDirectory || !Number.isInteger(report.timeoutMs) || report.timeoutMs < 1) {
                    throw new Error("reported request identity has no exact resource-directory/timeout basis");
                }
                requireCanonicalNativeTranscript(observation, {
                    requestIdentitySha256: scenarioRequestIdentity(scenario, resourceDirectory, report.timeoutMs),
                    implementationSha256: expectedImplementation,
                    processSupervisorSha256: expectedContainment.processSupervisor.executableSha256,
                    nativeExecutionGuardSha256: expectedContainment.nativeExecutionGuard.librarySha256,
                });
            } catch (error) {
                addBlocker(blockers, {
                    code: "invalid-native-transcript",
                    detail: error instanceof Error ? error.message : String(error),
                    scenario: scenario.id,
                });
            }
        }
        const computed = judge(
            { id: scenario.id, negative: scenario.negative, async: scenario.async },
            observation,
        );
        computedById.set(scenario.id, computed);
        if (!sameJson(criticalResultShape(reported), criticalResultShape(computed))) {
            addBlocker(blockers, { code: "forged-result-verdict", detail: "reported verdict differs from independent observation judging", scenario: scenario.id });
        }
        if (computed.status !== "pass") {
            addBlocker(blockers, { code: `test262-${computed.status}`, detail: computed.detail, scenario: scenario.id });
        }
        for (const digest of [reported.stdoutSha256, reported.stderrSha256]) {
            if (digest !== undefined && !/^[0-9a-f]{64}$/.test(digest)) {
                addBlocker(blockers, { code: "invalid-output-digest", detail: "host output digest is malformed", scenario: scenario.id });
            }
        }
    }
    for (const id of reportedById.keys()) {
        if (!expectedIds.has(id)) addBlocker(blockers, { code: "extra-result", detail: "result is not in the pinned eligible set", scenario: id });
    }
    const clauseIds = new Set(catalog.clauses.map((clause) => clause.id));
    const groupIds = new Set(matrix.groups.map((group) => group.id));
    for (const scenario of expected.filter((item) => item.scope === "in-scope")) {
        if (scenario.clauseIds.length === 0) addBlocker(blockers, { code: "unmapped-test", detail: "in-scope scenario has no clause mapping", scenario: scenario.id });
        if (scenario.matrixGroups.length === 0) addBlocker(blockers, { code: "unowned-test", detail: "in-scope scenario belongs to no matrix group", scenario: scenario.id });
        for (const clause of scenario.clauseIds) {
            if (!clauseIds.has(clause)) addBlocker(blockers, { code: "unknown-clause", detail: `scenario maps to unknown clause ${clause}`, scenario: scenario.id });
        }
        for (const group of scenario.matrixGroups) {
            if (!groupIds.has(group)) addBlocker(blockers, { code: "unknown-group", detail: `scenario maps to unknown group ${group}`, scenario: scenario.id });
        }
    }
    return computedById;
}

async function validateLocalReport(
    report: LocalGatesReport,
    currentSource: Awaited<ReturnType<typeof projectSourceIdentity>>,
    baseline: Baseline,
    expectedContainment: BuiltContainmentIdentity,
    blockers: Blocker[],
): Promise<void> {
    if (report.schemaVersion !== 1 || report.kind !== "ecmascript-local-gates") {
        addBlocker(blockers, { code: "invalid-local-report", detail: "local gate report schema/kind is invalid" });
        return;
    }
    if (!report.selection?.exhaustive || report.selection.gate !== null) {
        addBlocker(blockers, { code: "non-exhaustive-local-gates", detail: "local gate report is filtered or unmerged" });
    }
    sourceMatches("local gate report start", report.sourceStart, currentSource, blockers);
    sourceMatches("local gate report end", report.sourceEnd, currentSource, blockers);
    if (!sameJson(report.sourceStart, report.sourceEnd)) addBlocker(blockers, { code: "source-changed", detail: "source state changed during local gates" });
    const baseEffectiveEnvironment = recordedEnvironment(sanitizedEvidenceEnvironment(
        baseline.executionProfile.environmentAllowlist,
        baseline.executionProfile.environment,
    ));
    const expectedProfile = {
        id: baseline.executionProfile.id,
        platform: baseline.executionProfile.platform,
        architecture: baseline.executionProfile.architecture,
        environmentAllowlist: baseline.executionProfile.environmentAllowlist,
        environment: baseline.executionProfile.environment,
        effectiveEnvironment: baseEffectiveEnvironment,
    };
    if (!sameJson(report.executionProfile, expectedProfile)) {
        addBlocker(blockers, { code: "execution-profile-drift", detail: "local gates used a different platform/environment profile" });
    }
    const currentToolchain = await collectToolchain(
        baseline.executionProfile.compiler,
        baseline.executionProfile.environment,
    );
    if (!sameJson(report.toolchain, currentToolchain)) {
        addBlocker(blockers, { code: "toolchain-drift", detail: "local gate toolchain differs from the current claim environment" });
    }
    if (!sameJson(report.containment, expectedContainment)) {
        addBlocker(blockers, { code: "containment-drift", detail: "local gates did not use the exact rebuilt process supervisor/native guard" });
    }
    const gates = exactIdSet(report.gates ?? [], (gate) => gate.id, "local gates", blockers);
    for (const expected of baseline.localGates) {
        const gate = gates.get(expected.id);
        if (!gate) {
            addBlocker(blockers, { code: "missing-local-gate", detail: `required local gate ${expected.id} is absent` });
            continue;
        }
        const environment = recordedEnvironment(sanitizedEvidenceEnvironment(
            baseline.executionProfile.environmentAllowlist,
            { ...baseline.executionProfile.environment, ...(expected.environment ?? {}) },
        ));
        const executable = await resolveExecutableIdentity(expected.command[0]!, environment);
        if (
            !sameJson(gate.command, expected.command) ||
            !sameJson(gate.executable, executable) ||
            !sameJson(gate.environment, environment) ||
            gate.timeoutMs !== expected.timeoutMs
        ) {
            addBlocker(blockers, { code: "local-gate-contract-drift", detail: `local gate ${expected.id} did not run the exact baseline command/profile` });
        }
        if (gate.status !== "pass" || gate.exitCode !== 0 || gate.timedOut) {
            addBlocker(blockers, { code: "failed-local-gate", detail: `required local gate ${expected.id} did not pass` });
        }
        if (!/^[0-9a-f]{64}$/.test(gate.stdoutSha256) || !/^[0-9a-f]{64}$/.test(gate.stderrSha256)) {
            addBlocker(blockers, { code: "invalid-local-output-digest", detail: `local gate ${expected.id} has malformed output evidence` });
        }
    }
    for (const id of gates.keys()) {
        if (!baseline.localGates.some((gate) => gate.id === id)) addBlocker(blockers, { code: "unexpected-local-gate", detail: `unreviewed local gate ${id}` });
    }
    if (report.generatedEvidenceManifestSha256 !== await generatedManifestDigest()) {
        addBlocker(blockers, { code: "generated-evidence-drift", detail: "generated regression manifest differs from the current clean source" });
    }
    if (report.propertyEvidenceManifestSha256 !== await propertyManifestDigest()) {
        addBlocker(blockers, { code: "property-evidence-drift", detail: "property evidence manifest differs from the current clean source" });
    }
    if (report.e2eEvidenceManifestSha256 !== await e2eEvidenceManifestDigest()) {
        addBlocker(blockers, { code: "e2e-evidence-drift", detail: "E2E evidence manifest differs from the current clean source" });
    }
    if (report.dependencyManifestSha256 !== await fileManifestSha256(["package.json", "bun.lock"])) {
        addBlocker(blockers, { code: "dependency-evidence-drift", detail: "installed-dependency lock inputs differ from the current source" });
    }
}

function queryMatches(query: ClausePartition["test262Queries"][number], scenario: ScenarioRecord): boolean {
    return query.allOf.every((term) => {
        if (term.field === "clause") return scenario.clauseIds.includes(term.equals);
        if (term.field === "esid") return scenario.esid === term.equals;
        if (term.field === "feature") return scenario.features.includes(term.equals);
        if (term.field === "flag") return scenario.flags.includes(term.equals);
        return scenario.mode === term.equals;
    });
}

function validateClauses(
    catalog: ClauseCatalog,
    matrix: ComplianceMatrix,
    featureMap: FeatureMap,
    inventory: Test262Inventory,
    results: ReadonlyMap<string, ScenarioResult>,
    baseline: Baseline,
    blockers: Blocker[],
): {
    groups: GroupResult[];
    choices: Array<{
        clause: string;
        kind: string;
        selection: string;
        specBasis: string;
        obligation?: string;
        rationale?: string;
        reviewedBy?: string;
        evidence?: Array<{ clause: string; partition: string }>;
    }>;
    normativeOptionalEvidence: Array<{
        family: string;
        policy: "implemented-all";
        sites: string[];
        specBasis: string;
        rationale: string;
        reviewedBy: string;
        evidence: Array<{ clause: string; partition: string }>;
    }>;
} {
    const groupByRoot = new Map(matrix.groups.map((group) => [group.rootClause, group]));
    const evidence = new Map(matrix.clauseEvidence.map((row) => [row.clause, row]));
    const clauseById = new Map(catalog.clauses.map((clause) => [clause.id, clause]));
    const partitionByKey = new Map<string, ClausePartition>();
    for (const row of matrix.clauseEvidence) {
        for (const partition of row.partitions) partitionByKey.set(`${row.clause}#${partition.id}`, partition);
    }
    const groupBlockers = new Map<string, string[]>();
    for (const group of matrix.groups) {
        const list: string[] = [];
        if (group.tracking !== "ready-for-verification") list.push(`tracking is ${group.tracking}`);
        list.push(...group.knownGaps);
        groupBlockers.set(group.id, list);
    }
    for (const feature of featureMap.features) {
        if (feature.disposition !== "standard") continue;
        if (feature.tracking !== "ready-for-verification" || feature.clauses.length === 0) {
            addBlocker(blockers, { code: "unverified-feature-map", detail: "standard Test262 feature tag lacks a ready clause mapping", feature: feature.tag });
        }
    }

    const resolved = new Map<string, boolean>();
    const resolving = new Set<string>();
    const resolvePartition = (clauseId: string, partition: ClausePartition): boolean => {
        const key = `${clauseId}#${partition.id}`;
        const cached = resolved.get(key);
        if (cached !== undefined) return cached;
        if (resolving.has(key)) return false;
        resolving.add(key);
        let queryRoute = false;
        if (partition.test262Queries.length > 0) {
            queryRoute = partition.test262Queries.every((query) => {
                const selected = inventory.scenarios.filter(
                    (scenario) => scenario.scope === "in-scope" && queryMatches(query, scenario),
                );
                if (selected.length === 0 || selected.some((scenario) => !scenario.clauseIds.includes(clauseId))) return false;
                if (!selected.some((scenario) => !scenario.nonDeterministic)) return false;
                return selected.every((scenario) => results.get(scenario.id)?.status === "pass");
            });
        }
        let coveredRoute = false;
        if (partition.coveredBy.length > 0) {
            coveredRoute = partition.coveredBy.every((edge) => {
                const target = partitionByKey.get(`${edge.clause}#${edge.partition}`);
                return target ? resolvePartition(edge.clause, target) : false;
            });
        }
        const local = partition.localEvidence;
        const propertyGateReady = local.property.length === 0 || baseline.localGates.some((gate) => gate.id === "property");
        const gapRoute = partition.upstreamTestGap !== undefined && propertyGateReady;
        const value = propertyGateReady &&
            (partition.test262Queries.length === 0 || queryRoute) &&
            (partition.coveredBy.length === 0 || coveredRoute) &&
            (queryRoute || coveredRoute || gapRoute);
        resolving.delete(key);
        resolved.set(key, value);
        return value;
    };

    const choices: Array<{
        clause: string;
        kind: string;
        selection: string;
        specBasis: string;
        obligation?: string;
        rationale?: string;
        reviewedBy?: string;
        evidence?: Array<{ clause: string; partition: string }>;
    }> = [];
    const selectionByObligation = new Map(matrix.choiceSelections.map((selection) => [selection.obligation, selection]));
    for (const obligation of catalog.choiceObligations) {
        const selection = selectionByObligation.get(obligation.id);
        if (!selection) {
            const subject = clauseById.get(obligation.subjectClauseIds[0]!);
            const group = subject ? groupByRoot.get(subject.rootId) : undefined;
            addBlocker(blockers, {
                code: "unreviewed-specification-choice",
                detail: "independently extracted specification choice has no exact evidenced selection",
                group: group?.id,
                clause: subject?.id,
            });
            if (group) groupBlockers.get(group.id)!.push(`unreviewed specification choice ${obligation.id}`);
            continue;
        }
        choices.push({
            clause: obligation.sourceClauseId,
            kind: obligation.kind,
            selection: selection.selection,
            specBasis: `https://tc39.es/ecma262/2026/#${obligation.sourceAnchor}`,
            obligation: obligation.id,
            rationale: selection.rationale,
            reviewedBy: selection.reviewedBy,
            evidence: selection.evidence,
        });
    }
    const normativeOptionalEvidence: Array<{
        family: string;
        policy: "implemented-all";
        sites: string[];
        specBasis: string;
        rationale: string;
        reviewedBy: string;
        evidence: Array<{ clause: string; partition: string }>;
    }> = [];
    const optionalEvidenceByFamily = new Map(
        matrix.normativeOptionalEvidence.map((evidence) => [evidence.family, evidence]),
    );
    for (const family of catalog.normativeOptionalFamilies) {
        const familyEvidence = optionalEvidenceByFamily.get(family.id);
        if (!familyEvidence) {
            const feature = clauseById.get(family.featureClauseId);
            const group = feature ? groupByRoot.get(feature.rootId) : undefined;
            addBlocker(blockers, {
                code: "unreviewed-normative-optional-family",
                detail: "implemented-all policy requires one exact reciprocal evidence unit for every atomic normative-optional family",
                group: group?.id,
                clause: feature?.id,
            });
            if (group) groupBlockers.get(group.id)!.push(`unreviewed normative-optional family ${family.id}`);
            continue;
        }
        normativeOptionalEvidence.push({
            family: family.id,
            policy: familyEvidence.policy,
            sites: family.siteIds,
            specBasis: `https://tc39.es/ecma262/2026/#${family.featureClauseId}`,
            rationale: familyEvidence.rationale,
            reviewedBy: familyEvidence.reviewedBy,
            evidence: familyEvidence.evidence,
        });
    }
    for (const clause of catalog.clauses) {
        if (!(clause.classification === "required" || clause.classification === "normative-optional")) continue;
        const group = groupByRoot.get(clause.rootId);
        if (!group) continue;
        const row = evidence.get(clause.id);
        if (!row) {
            addBlocker(blockers, { code: "unreviewed-clause", detail: "normative clause has no exact disposition and partition evidence", group: group.id, clause: clause.id });
            groupBlockers.get(group.id)!.push(`unreviewed clause ${clause.id}`);
            continue;
        }
        const mapped = inventory.scenarios.filter(
            (scenario) => scenario.scope === "in-scope" && scenario.clauseIds.includes(clause.id),
        );
        const assigned = (scenario: ScenarioRecord): boolean => row.partitions.some(
            (partition) => partition.test262Queries.some((query) => queryMatches(query, scenario)),
        );
        if (mapped.some((scenario) => !assigned(scenario))) {
            addBlocker(blockers, { code: "unpartitioned-test-evidence", detail: "mapped Test262 scenarios are not assigned to an exact semantic partition", group: group.id, clause: clause.id });
            groupBlockers.get(group.id)!.push(`unpartitioned mapped evidence for ${clause.id}`);
        }
        for (const partition of row.partitions) {
            if (!resolvePartition(clause.id, partition)) {
                addBlocker(blockers, {
                    code: "unproved-partition",
                    detail: "partition lacks complete deterministic pinned Test262/structural/local evidence",
                    group: group.id,
                    clause: clause.id,
                    partition: partition.id,
                });
                groupBlockers.get(group.id)!.push(`unproved partition ${clause.id}#${partition.id}`);
            }
        }
    }
    const groups = matrix.groups.map((group) => {
        const own = groupBlockers.get(group.id) ?? [];
        return {
            id: group.id,
            status: own.length === 0 ? "passing" as const : group.tracking === "ready-for-verification" ? "failing" as const : "unverified" as const,
            blockers: own,
        };
    });
    return { groups, choices, normativeOptionalEvidence };
}

interface LoadedReport<T> extends LoadedRegularFile {
    value: T;
}

async function optionalReport<T>(filename: string, label: string, blockers: Blocker[]): Promise<LoadedReport<T> | null> {
    let loaded: LoadedRegularFile;
    try {
        loaded = await loadRegularFileSnapshot(filename, `${label} report`);
    } catch (error) {
        const missing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
        addBlocker(blockers, {
            code: missing ? `missing-${label}` : `invalid-${label}`,
            detail: missing
                ? `${label} report is missing at ${filename}`
                : error instanceof Error ? error.message : String(error),
        });
        return null;
    }
    try {
        return { ...loaded, value: JSON.parse(loaded.bytes.toString("utf8")) as T };
    } catch (error) {
        addBlocker(blockers, {
            code: `invalid-${label}`,
            detail: `invalid JSON in ${filename}: ${error instanceof Error ? error.message : String(error)}`,
        });
        return null;
    }
}

async function runnerManifest(): Promise<string> {
    const entries = await fs.readdir(path.join(projectRoot, "tests/test262"), { withFileTypes: true });
    return fileManifestSha256(
        entries
            .filter((entry) => entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".md") || entry.name.endsWith(".c")))
            .map((entry) => `tests/test262/${entry.name}`),
    );
}

function isWithin(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

async function validateClaimOutput(output: string, inputs: readonly string[]): Promise<void> {
    const artifactRoot = path.resolve(defaultArtifactRoot);
    if (!isWithin(artifactRoot, output)) {
        throw new Error(`claim output must be a file below the dedicated artifact root ${artifactRoot}`);
    }
    if (inputs.some((input) => path.resolve(input) === output)) {
        throw new Error("claim output must be distinct from every evidence input report");
    }
    await fs.mkdir(artifactRoot, { recursive: true });
    const rootStat = await fs.lstat(artifactRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
        throw new Error(`claim artifact root must be a regular directory: ${artifactRoot}`);
    }
    const outputDirectory = path.dirname(output);
    await fs.mkdir(outputDirectory, { recursive: true });
    const [realRoot, realOutputDirectory] = await Promise.all([
        fs.realpath(artifactRoot),
        fs.realpath(outputDirectory),
    ]);
    if (realOutputDirectory !== realRoot && !isWithin(realRoot, realOutputDirectory)) {
        throw new Error("claim output directory escapes the artifact root through a symbolic link");
    }
    const realOutput = await fs.realpath(output).catch(() => null);
    const realInputs = await Promise.all(inputs.map((input) => fs.realpath(input).catch(() => null)));
    if (realOutput && realInputs.some((input) => input === realOutput)) {
        throw new Error("claim output must not alias an evidence input report through a symbolic link");
    }
}

async function writeClaimAtomically(output: string, claim: unknown): Promise<void> {
    const temporary = path.join(
        path.dirname(output),
        `.claim-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
    );
    try {
        await fs.writeFile(temporary, stableJson(claim), { encoding: "utf8", flag: "wx" });
        await fs.rename(temporary, output);
    } finally {
        await fs.rm(temporary, { force: true });
    }
}

interface VerifiedReportProvenance {
    provider: "github-artifact-attestation";
    repository: string;
    signerWorkflow: string;
    sourceDigest: string;
    verifier: Awaited<ReturnType<typeof resolveExecutableIdentity>>;
    reportSha256: string;
    bundleSha256: string;
}

async function verifyReportProvenance(
    label: string,
    report: LoadedRegularFile,
    bundlePath: string | null,
    baseline: Baseline,
    currentSource: Awaited<ReturnType<typeof projectSourceIdentity>>,
    blockers: Blocker[],
): Promise<VerifiedReportProvenance | null> {
    if (bundlePath === null) {
        addBlocker(blockers, {
            code: "missing-report-provenance",
            detail: `${label} report has no GitHub artifact-attestation bundle`,
        });
        return null;
    }
    let bundle: LoadedRegularFile;
    try {
        bundle = await loadRegularFileSnapshot(bundlePath, `${label} attestation bundle`);
    } catch (error) {
        addBlocker(blockers, {
            code: "unverified-report-provenance",
            detail: `${label} attestation bundle is not a readable regular non-symbolic-link file: ${error instanceof Error ? error.message : String(error)}`,
        });
        return null;
    }
    const provenance = baseline.claim.provenance;
    const signerWorkflow = `${provenance.repository}/${provenance.signerWorkflow}`;
    let verifier: Awaited<ReturnType<typeof resolveExecutableIdentity>>;
    try {
        verifier = await resolveExecutableIdentity(provenance.verifierCommand, process.env);
    } catch (error) {
        addBlocker(blockers, {
            code: "unverified-report-provenance",
            detail: `${label} provenance verifier is unavailable: ${error instanceof Error ? error.message : String(error)}`,
        });
        return null;
    }
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-report-provenance-"));
    try {
        await fs.chmod(temporaryRoot, 0o700);
        const reportDirectory = path.join(temporaryRoot, "report");
        const bundleDirectory = path.join(temporaryRoot, "bundle");
        await Promise.all([
            fs.mkdir(reportDirectory, { mode: 0o700 }),
            fs.mkdir(bundleDirectory, { mode: 0o700 }),
        ]);
        const reportCopy = path.join(reportDirectory, path.basename(report.filename));
        const bundleCopy = path.join(bundleDirectory, path.basename(bundle.filename));
        await Promise.all([
            fs.writeFile(reportCopy, report.bytes, { flag: "wx", mode: 0o400 }),
            fs.writeFile(bundleCopy, bundle.bytes, { flag: "wx", mode: 0o400 }),
        ]);
        const args = [
            "attestation",
            "verify",
            reportCopy,
            "--repo",
            provenance.repository,
            "--bundle",
            bundleCopy,
            "--signer-workflow",
            signerWorkflow,
            "--signer-digest",
            currentSource.commit,
            "--source-digest",
            currentSource.commit,
            "--format",
            "json",
        ];
        if (provenance.denySelfHostedRunners) args.push("--deny-self-hosted-runners");
        const result = await runProcess(verifier.realPath, args, { cwd: temporaryRoot, env: process.env, timeoutMs: 120_000 });
        if (result.code !== 0) {
            addBlocker(blockers, {
                code: "unverified-report-provenance",
                detail: `${label} report lacks valid signed provenance from the exact release workflow/source: ${result.stderr.trim().slice(0, 1000)}`,
            });
            return null;
        }
        try {
            const verification = JSON.parse(result.stdout) as unknown;
            if (!Array.isArray(verification) || verification.length === 0) {
                throw new Error("verification returned no matching signed statement");
            }
            const exactSubject = verification.some((entry) => {
                if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return false;
                const verificationResult = (entry as Record<string, unknown>).verificationResult;
                if (verificationResult === null || typeof verificationResult !== "object" || Array.isArray(verificationResult)) return false;
                const statement = (verificationResult as Record<string, unknown>).statement;
                if (statement === null || typeof statement !== "object" || Array.isArray(statement)) return false;
                const subject = (statement as Record<string, unknown>).subject;
                if (!Array.isArray(subject)) return false;
                return subject.some((candidate) => {
                    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return false;
                    const digest = (candidate as Record<string, unknown>).digest;
                    return digest !== null &&
                        typeof digest === "object" &&
                        !Array.isArray(digest) &&
                        (digest as Record<string, unknown>).sha256 === report.sha256;
                });
            });
            if (!exactSubject) {
                throw new Error(`verified statement does not attest the exact parsed report digest ${report.sha256}`);
            }
        } catch (error) {
            addBlocker(blockers, {
                code: "unverified-report-provenance",
                detail: `${label} provenance verifier returned invalid evidence: ${error instanceof Error ? error.message : String(error)}`,
            });
            return null;
        }
    } finally {
        await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
    return {
        provider: "github-artifact-attestation",
        repository: provenance.repository,
        signerWorkflow: provenance.signerWorkflow,
        sourceDigest: currentSource.commit,
        verifier,
        reportSha256: report.sha256,
        bundleSha256: bundle.sha256,
    };
}

async function main(): Promise<void> {
    const baseline = await loadBaseline();
    const blockers: Blocker[] = [];
    const test262Checkout = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const ecma262Checkout = path.resolve(argumentValue("--ecma262") ?? path.join(defaultCacheRoot, "ecma262"));
    const test262ReportPath = path.resolve(argumentValue("--test262-report") ?? path.join(defaultArtifactRoot, "test262-run.json"));
    const localReportPath = path.resolve(argumentValue("--local-report") ?? path.join(defaultArtifactRoot, "local-gates.json"));
    const test262Attestation = argumentValue("--test262-attestation");
    const localAttestation = argumentValue("--local-attestation");
    const test262AttestationPath = test262Attestation ? path.resolve(test262Attestation) : null;
    const localAttestationPath = localAttestation ? path.resolve(localAttestation) : null;
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "claim.json"));
    await validateClaimOutput(output, [
        test262ReportPath,
        localReportPath,
        ...[test262AttestationPath, localAttestationPath].filter((value): value is string => value !== null),
    ]);

    const { catalog, matrix, featureMap } = await loadAndValidateMatrix(test262Checkout);
    const rebuiltCatalog = await buildCatalog(ecma262Checkout);
    if (!sameJson(rebuiltCatalog, catalog)) throw new Error("checked-in clause catalog differs from a fresh independent extraction of the pinned specification");
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    if (!profile.claimEligible || profile.semanticDelegation) {
        addBlocker(blockers, { code: "host-ineligible", detail: "reviewed Test262 host is not eligible for conformance evidence" });
    }
    if (baseline.runnerContract.requiredCapabilities.some((capability) => profile.capabilities[capability] !== true)) {
        addBlocker(blockers, { code: "host-capability-gap", detail: "reviewed Test262 host lacks a required pinned capability" });
    }
    const expectedContainment = await (async (): Promise<BuiltContainmentIdentity> => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-claim-containment-"));
        try {
            return (await buildEvidenceContainment(
                root,
                baseline.executionProfile.compiler,
                sanitizedEvidenceEnvironment(
                    baseline.executionProfile.environmentAllowlist,
                    baseline.executionProfile.environment,
                ),
            )).identity;
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    })();
    const [test262Loaded, localLoaded, currentSource, freshInventory] = await Promise.all([
        optionalReport<Test262Report>(test262ReportPath, "test262", blockers),
        optionalReport<LocalGatesReport>(localReportPath, "local-gates", blockers),
        projectSourceIdentity(),
        buildInventory({ test262: test262Checkout, filter: null, shard: null }),
    ]);
    const test262Report = test262Loaded?.value ?? null;
    const localReport = localLoaded?.value ?? null;
    if (!currentSource.clean) addBlocker(blockers, { code: "dirty-source", detail: "current source tree is dirty" });
    const [test262Provenance, localProvenance] = await Promise.all([
        test262Loaded
            ? verifyReportProvenance("Test262", test262Loaded, test262AttestationPath, baseline, currentSource, blockers)
            : Promise.resolve(null),
        localLoaded
            ? verifyReportProvenance("local-gates", localLoaded, localAttestationPath, baseline, currentSource, blockers)
            : Promise.resolve(null),
    ]);
    let results = new Map<string, ScenarioResult>();
    if (test262Report) {
        results = await validateTest262Report(
            test262Report,
            freshInventory,
            currentSource,
            baseline,
            profile,
            matrix,
            catalog,
            expectedContainment,
            blockers,
        );
    }
    if (localReport) await validateLocalReport(localReport, currentSource, baseline, expectedContainment, blockers);
    const evaluated = validateClauses(catalog, matrix, featureMap, freshInventory, results, baseline, blockers);
    const configFiles = [
        "baseline.json",
        "clauses.json",
        "evidence-registry.json",
        "evidence-registry.schema.json",
        "feature-map.json",
        "host-profile.json",
        "mapping-overrides.json",
        "matrix.json",
        "matrix.schema.json",
        "waivers.json",
    ];
    const inputDigests = {
        complianceConfiguration: await fileManifestSha256(configFiles, complianceDir),
        runnerImplementation: await runnerManifest(),
        test262Report: test262Loaded?.sha256 ?? null,
        localReport: localLoaded?.sha256 ?? null,
        test262Attestation: test262Provenance?.bundleSha256 ?? null,
        localAttestation: localProvenance?.bundleSha256 ?? null,
    };
    const buildClaim = () => {
        const globalBlocked = blockers.some((blocker) => blocker.group === undefined);
        const groups = evaluated.groups.map((group) => globalBlocked ? { ...group, status: "blocked" as const } : group);
        const claimEligible = blockers.length === 0 && groups.every((group) => group.status === "passing");
        return {
            schemaVersion: 1,
            kind: "ecmascript-2026-claim",
            claimEligible,
            wording: claimEligible
            ? `${baseline.claim.wording} on execution profile ${baseline.executionProfile.id}, including every pinned atomic normative-optional family; suite-backed evidence at ECMA-262 ${baseline.ecma262.commit}, Test262 ${baseline.test262.commit}, and source ${currentSource.commit}. The exhaustive reports have verified GitHub artifact-attestation provenance from the pinned release workflow and source revision. Disclosed specification choices are recorded in this report. This is conformance evidence, not a formal proof that Test262 itself has no omissions.`
                : null,
            baseline: {
                ecma262Commit: baseline.ecma262.commit,
                test262Commit: baseline.test262.commit,
                sourceCommit: currentSource.commit,
                executionProfile: baseline.executionProfile,
                toolchain: localReport?.toolchain ?? null,
            },
            inputDigests,
            provenance: {
                policy: baseline.claim.provenance,
                test262: test262Provenance,
                localGates: localProvenance,
            },
            choices: evaluated.choices,
            normativeOptionalEvidence: evaluated.normativeOptionalEvidence,
            groups,
            blockers,
        };
    };
    let claim = buildClaim();
    await writeClaimAtomically(output, claim);
    const sourceAfterPublish = await projectSourceIdentity();
    if (!sameJson(sourceAfterPublish, currentSource)) {
        addBlocker(blockers, {
            code: "source-changed",
            detail: "source state changed while publishing the conformance claim",
        });
        claim = buildClaim();
        await writeClaimAtomically(output, claim);
    }
    console.log(`${claim.claimEligible ? "ELIGIBLE" : "BLOCKED"}: ${output}`);
    if (!claim.claimEligible) process.exit(1);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`claim check: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
