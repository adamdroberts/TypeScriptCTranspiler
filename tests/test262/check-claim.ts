#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildInventory, type ScenarioRecord, type Test262Inventory } from "./inventory";
import {
    collectToolchain,
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
    loadBaseline,
    pathExists,
    projectRoot,
    projectSourceIdentity,
    readJson,
    sha256File,
    sha256Text,
    stableJson,
    type Baseline,
} from "./model";
import { hostProtocolVersion, parseHostObservation } from "./protocol";
import { judge, type ScenarioResult } from "./run";
import { buildCatalog, type ClauseCatalog } from "./spec-catalog";
import type { FeatureMap } from "./feature-map";

interface HostProfile {
    schemaVersion: 1;
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
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
        environment: Record<string, string>;
    };
    host: {
        profileId: string;
        protocolVersion: number;
        semanticDelegation: boolean;
        capabilities: Record<string, boolean>;
        claimEligible: boolean;
        command: string[];
        implementationSha256: string;
    };
    inventory: Test262Inventory;
    corpusEndSha256: string;
    resultSetSha256: string;
    results: ScenarioResult[];
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
    const expectedProfile = {
        id: baseline.executionProfile.id,
        platform: baseline.executionProfile.platform,
        architecture: baseline.executionProfile.architecture,
        environment: baseline.executionProfile.environment,
    };
    if (!sameJson(report.executionProfile, expectedProfile)) {
        addBlocker(blockers, { code: "execution-profile-drift", detail: "Test262 report used a different platform/environment profile" });
    }
    const currentToolchain = await collectToolchain(baseline.executionProfile.compiler);
    if (!sameJson(report.toolchain, currentToolchain)) {
        addBlocker(blockers, { code: "toolchain-drift", detail: "Test262 toolchain differs from the current claim environment" });
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
    const expectedImplementation = await fileManifestSha256(profile.implementationFiles);
    if (
        report.host?.profileId !== profile.id ||
        report.host?.protocolVersion !== hostProtocolVersion ||
        report.host?.claimEligible !== profile.claimEligible ||
        report.host?.semanticDelegation !== profile.semanticDelegation ||
        !sameJson(report.host?.capabilities, profile.capabilities) ||
        !sameJson(report.host?.command, profile.command) ||
        report.host?.implementationSha256 !== expectedImplementation
    ) {
        addBlocker(blockers, { code: "host-profile-drift", detail: "Test262 report is not bound to the exact reviewed in-repository host" });
    }
    if (!profile.claimEligible || profile.semanticDelegation) {
        addBlocker(blockers, { code: "host-ineligible", detail: "reviewed Test262 host is not eligible for conformance evidence" });
    }
    if (baseline.runnerContract.requiredCapabilities.some((capability) => profile.capabilities[capability] !== true)) {
        addBlocker(blockers, { code: "host-capability-gap", detail: "reviewed Test262 host lacks a required pinned capability" });
    }
    if (report.resultSetSha256 !== sha256Text(JSON.stringify(report.results))) {
        addBlocker(blockers, { code: "result-digest-mismatch", detail: "Test262 result-set digest does not match the full recorded observations" });
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
    const expectedProfile = {
        id: baseline.executionProfile.id,
        platform: baseline.executionProfile.platform,
        architecture: baseline.executionProfile.architecture,
        environment: baseline.executionProfile.environment,
    };
    if (!sameJson(report.executionProfile, expectedProfile)) {
        addBlocker(blockers, { code: "execution-profile-drift", detail: "local gates used a different platform/environment profile" });
    }
    const currentToolchain = await collectToolchain(baseline.executionProfile.compiler);
    if (!sameJson(report.toolchain, currentToolchain)) {
        addBlocker(blockers, { code: "toolchain-drift", detail: "local gate toolchain differs from the current claim environment" });
    }
    const gates = exactIdSet(report.gates ?? [], (gate) => gate.id, "local gates", blockers);
    for (const expected of baseline.localGates) {
        const gate = gates.get(expected.id);
        if (!gate) {
            addBlocker(blockers, { code: "missing-local-gate", detail: `required local gate ${expected.id} is absent` });
            continue;
        }
        const environment = { ...baseline.executionProfile.environment, ...(expected.environment ?? {}) };
        if (!sameJson(gate.command, expected.command) || !sameJson(gate.environment, environment) || gate.timeoutMs !== expected.timeoutMs) {
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
): { groups: GroupResult[]; choices: Array<{ clause: string; kind: string; selection: string; specBasis: string }> } {
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

    const choices: Array<{ clause: string; kind: string; selection: string; specBasis: string }> = [];
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
        if (row.disposition === "spec-permitted-choice") {
            choices.push({ clause: clause.id, ...row.choice! });
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
    return { groups, choices };
}

async function optionalReport<T>(filename: string, label: string, blockers: Blocker[]): Promise<T | null> {
    if (!(await pathExists(filename))) {
        addBlocker(blockers, { code: `missing-${label}`, detail: `${label} report is missing at ${filename}` });
        return null;
    }
    try {
        return await readJson<T>(filename);
    } catch (error) {
        addBlocker(blockers, { code: `invalid-${label}`, detail: error instanceof Error ? error.message : String(error) });
        return null;
    }
}

async function runnerManifest(): Promise<string> {
    const entries = await fs.readdir(path.join(projectRoot, "tests/test262"), { withFileTypes: true });
    return fileManifestSha256(
        entries
            .filter((entry) => entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".md")))
            .map((entry) => `tests/test262/${entry.name}`),
    );
}

async function main(): Promise<void> {
    const baseline = await loadBaseline();
    const blockers: Blocker[] = [];
    const test262Checkout = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const ecma262Checkout = path.resolve(argumentValue("--ecma262") ?? path.join(defaultCacheRoot, "ecma262"));
    const test262ReportPath = path.resolve(argumentValue("--test262-report") ?? path.join(defaultArtifactRoot, "test262-run.json"));
    const localReportPath = path.resolve(argumentValue("--local-report") ?? path.join(defaultArtifactRoot, "local-gates.json"));
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "claim.json"));

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
    const [test262Report, localReport, currentSource, freshInventory] = await Promise.all([
        optionalReport<Test262Report>(test262ReportPath, "test262", blockers),
        optionalReport<LocalGatesReport>(localReportPath, "local-gates", blockers),
        projectSourceIdentity(),
        buildInventory({ test262: test262Checkout, filter: null, shard: null }),
    ]);
    if (!currentSource.clean) addBlocker(blockers, { code: "dirty-source", detail: "current source tree is dirty" });
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
            blockers,
        );
    }
    if (localReport) await validateLocalReport(localReport, currentSource, baseline, blockers);
    const evaluated = validateClauses(catalog, matrix, featureMap, freshInventory, results, baseline, blockers);
    const globalBlocked = blockers.some((blocker) => blocker.group === undefined);
    const groups = evaluated.groups.map((group) => globalBlocked ? { ...group, status: "blocked" as const } : group);
    const claimEligible = blockers.length === 0 && groups.every((group) => group.status === "passing");
    const configFiles = [
        "baseline.json",
        "clauses.json",
        "feature-map.json",
        "host-profile.json",
        "mapping-overrides.json",
        "matrix.json",
        "matrix.schema.json",
        "waivers.json",
    ];
    const claim = {
        schemaVersion: 1,
        kind: "ecmascript-2026-claim",
        claimEligible,
        wording: claimEligible
            ? `${baseline.claim.wording} on execution profile ${baseline.executionProfile.id}; suite-backed evidence at ECMA-262 ${baseline.ecma262.commit}, Test262 ${baseline.test262.commit}, and source ${currentSource.commit}. Disclosed specification choices are recorded in this report. This is conformance evidence, not a formal proof that Test262 itself has no omissions.`
            : null,
        baseline: {
            ecma262Commit: baseline.ecma262.commit,
            test262Commit: baseline.test262.commit,
            sourceCommit: currentSource.commit,
            executionProfile: baseline.executionProfile,
            toolchain: localReport?.toolchain ?? null,
        },
        inputDigests: {
            complianceConfiguration: await fileManifestSha256(configFiles, complianceDir),
            runnerImplementation: await runnerManifest(),
            test262Report: test262Report ? await sha256File(test262ReportPath) : null,
            localReport: localReport ? await sha256File(localReportPath) : null,
        },
        choices: evaluated.choices,
        groups,
        blockers,
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(claim), "utf8");
    console.log(`${claimEligible ? "ELIGIBLE" : "BLOCKED"}: ${output}`);
    if (!claimEligible) process.exit(1);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`claim check: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
