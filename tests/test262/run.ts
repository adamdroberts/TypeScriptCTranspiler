#!/usr/bin/env bun
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { buildInventory, verifyTest262Corpus, type ScenarioRecord, type Test262Inventory } from "./inventory";
import {
    argumentValue,
    complianceDir,
    defaultArtifactRoot,
    defaultCacheRoot,
    fileManifestSha256,
    hasArgument,
    loadBaseline,
    projectRoot,
    projectSourceIdentity,
    readJson,
    sha256Text,
    stableJson,
    verifyPinnedCheckout,
} from "./model";
import { scenarioSource } from "./metadata";
import { collectToolchain } from "./local-gates";
import {
    hostProtocolVersion,
    type HostDescription,
    type HostModuleFile,
    type HostObservation,
    type HostRequest,
    type HostScript,
    parseHostObservation,
} from "./protocol";

type ResultStatus = "pass" | "fail" | "timeout" | "crash" | "unsupported" | "infrastructure-error";

interface HostProfile {
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
}

export interface ScenarioResult {
    id: string;
    status: ResultStatus;
    observed: HostObservation["kind"];
    detail: string;
    phase?: string;
    errorConstructor?: string | null;
    stdoutSha256?: string;
    stderrSha256?: string;
    observation: HostObservation;
}

export interface Test262RunReport {
    schemaVersion: 1;
    kind: "test262-run";
    runnerContractVersion: number;
    startedAt: string;
    finishedAt: string;
    sourceStart: Awaited<ReturnType<typeof projectSourceIdentity>>;
    sourceEnd: Awaited<ReturnType<typeof projectSourceIdentity>>;
    toolchain: Record<string, string>;
    executionProfile: {
        id: string;
        platform: string;
        architecture: string;
        environment: Record<string, string>;
    };
    host: HostDescription & { claimEligible: boolean; command: string[]; implementationSha256: string };
    timeoutMs: number;
    inventory: Test262Inventory;
    corpusEndSha256: string;
    resultSetSha256: string;
    results: ScenarioResult[];
}

function argumentValues(name: string): string[] {
    const values: string[] = [];
    for (let index = 0; index < process.argv.length; index++) {
        if (process.argv[index] !== name) continue;
        const value = process.argv[index + 1];
        if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
        values.push(value);
        index++;
    }
    return values;
}

function positiveInteger(raw: string | undefined, fallback: number, label: string): number {
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
    return value;
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

function spawnJson(
    command: string,
    args: readonly string[],
    timeoutMs: number,
    environment: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string; stderr: string; timedOut: boolean; outputLimitExceeded: boolean }> {
    return new Promise((resolve) => {
        const child = spawn(command, [...args], {
            cwd: projectRoot,
            env: environment,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const outputLimit = 1_048_576;
        const killProcessGroup = (): void => {
            try {
                if (process.platform !== "win32" && child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
                else child.kill("SIGKILL");
            } catch {
                child.kill("SIGKILL");
            }
        };
        const finish = (value: {
            code: number;
            stdout: string;
            stderr: string;
            timedOut: boolean;
            outputLimitExceeded: boolean;
        }): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        };
        const timer = setTimeout(() => {
            killProcessGroup();
            finish({ code: 124, stdout, stderr, timedOut: true, outputLimitExceeded: false });
        }, timeoutMs);
        const append = (target: "stdout" | "stderr", chunk: Buffer): void => {
            if (settled) return;
            if (target === "stdout") stdout += chunk.toString();
            else stderr += chunk.toString();
            if (stdout.length + stderr.length > outputLimit) {
                killProcessGroup();
                finish({ code: 125, stdout, stderr, timedOut: false, outputLimitExceeded: true });
            }
        };
        child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
        child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
        child.on("error", (error) => finish({
            code: 127,
            stdout,
            stderr: `${stderr}${String(error)}`,
            timedOut: false,
            outputLimitExceeded: false,
        }));
        child.on("close", (code) => finish({
            code: code ?? 1,
            stdout,
            stderr,
            timedOut: false,
            outputLimitExceeded: false,
        }));
    });
}

async function describeHost(
    command: string,
    args: string[],
    timeoutMs: number,
    environment: NodeJS.ProcessEnv,
): Promise<HostDescription> {
    const result = await spawnJson(command, [...args, "--describe"], timeoutMs, environment);
    if (result.outputLimitExceeded) throw new Error("host --describe exceeded the output limit");
    if (result.code !== 0) throw new Error(`host --describe failed: ${result.stderr.trim()}`);
    let parsed: unknown;
    try {
        parsed = JSON.parse(result.stdout);
    } catch {
        throw new Error(`host --describe returned invalid JSON: ${result.stdout.slice(0, 500)}`);
    }
    const description = parsed as HostDescription;
    if (
        description.protocolVersion !== hostProtocolVersion ||
        typeof description.profileId !== "string" ||
        typeof description.semanticDelegation !== "boolean" ||
        !description.capabilities ||
        typeof description.capabilities !== "object"
    ) {
        throw new Error("host --describe response does not implement protocol version 1");
    }
    return description;
}

function sameRecord(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

async function hostScripts(test262: string, scenario: ScenarioRecord): Promise<HostScript[]> {
    const scripts: HostScript[] = [];
    for (const include of scenario.includes) {
        const filename = path.join(test262, include.path);
        const source = await fs.readFile(filename, "utf8");
        if (sha256Text(source) !== include.sha256) throw new Error(`${include.path} changed after inventory`);
        scripts.push({ path: include.path, sha256: include.sha256, source });
    }
    return scripts;
}

async function hostModuleFiles(test262: string, scenario: ScenarioRecord): Promise<HostModuleFile[]> {
    const files: HostModuleFile[] = [];
    for (const dependency of scenario.moduleDependencies) {
        const filename = path.join(test262, dependency.path);
        const content = await fs.readFile(filename);
        if (sha256Text(content) !== dependency.sha256) throw new Error(`${dependency.path} changed after inventory`);
        files.push({ path: dependency.path, sha256: dependency.sha256, encoding: "base64", data: content.toString("base64") });
    }
    return files;
}

async function makeRequest(
    test262: string,
    scenario: ScenarioRecord,
    timeoutMs: number,
): Promise<HostRequest> {
    const filename = path.join(test262, scenario.test);
    const source = await fs.readFile(filename, "utf8");
    if (sha256Text(source) !== scenario.sourceSha256) throw new Error(`${scenario.test} changed after inventory`);
    const transformed = scenarioSource(source, scenario.mode);
    if (sha256Text(transformed) !== scenario.scenarioSourceSha256) {
        throw new Error(`${scenario.id} transformation is not reproducible`);
    }
    return {
        protocolVersion: hostProtocolVersion,
        scenarioId: scenario.id,
        testPath: scenario.test,
        moduleBasePath: path.posix.dirname(scenario.test),
        moduleFiles: await hostModuleFiles(test262, scenario),
        mode: scenario.mode,
        goal: scenario.mode === "module" ? "module" : "script",
        raw: scenario.raw,
        setupScripts: await hostScripts(test262, scenario),
        testSource: transformed,
        testSourceSha256: scenario.scenarioSourceSha256,
        async: scenario.async,
        canBlock: scenario.canBlock,
        timeoutMs,
    };
}

export function judge(
    scenario: Pick<ScenarioRecord, "id" | "negative" | "async">,
    observation: HostObservation,
): ScenarioResult {
    const common = {
        id: scenario.id,
        observed: observation.kind,
        observation,
        stdoutSha256: observation.stdout === undefined ? undefined : sha256Text(observation.stdout),
        stderrSha256: observation.stderr === undefined ? undefined : sha256Text(observation.stderr),
    };
    if (observation.kind !== "normal" && observation.kind !== "throw") {
        return { ...common, status: observation.kind, detail: observation.detail };
    }
    if (observation.kind === "normal") {
        if (scenario.async && observation.asyncCompletion !== "Test262:AsyncTestComplete") {
            return { ...common, status: "fail", detail: "async test completed without the required Test262 completion marker" };
        }
        return scenario.negative
            ? { ...common, status: "fail", detail: `expected ${scenario.negative.phase} ${scenario.negative.type}, completed normally` }
            : { ...common, status: "pass", detail: "completed normally" };
    }
    if (!scenario.negative) {
        return {
            ...common,
            status: "fail",
            detail: `unexpected ${observation.phase} throw ${String(observation.errorConstructor)}`,
            phase: observation.phase,
            errorConstructor: observation.errorConstructor,
        };
    }
    const matches =
        observation.phase === scenario.negative.phase &&
        observation.errorConstructor === scenario.negative.type;
    return {
        ...common,
        status: matches ? "pass" : "fail",
        detail: matches
            ? `observed expected ${observation.phase} ${observation.errorConstructor}`
            : `expected ${scenario.negative.phase} ${scenario.negative.type}, observed ${observation.phase} ${String(observation.errorConstructor)}`,
        phase: observation.phase,
        errorConstructor: observation.errorConstructor,
    };
}

async function runScenario(
    command: string,
    args: string[],
    request: HostRequest,
    scenario: Pick<ScenarioRecord, "id" | "negative" | "async">,
    timeoutMs: number,
    requestRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<ScenarioResult> {
    const requestPath = path.join(requestRoot, `${sha256Text(request.scenarioId)}.json`);
    await fs.writeFile(requestPath, JSON.stringify(request), "utf8");
    const processResult = await spawnJson(command, [...args, "--request", requestPath], timeoutMs + 1_000, environment);
    await fs.rm(requestPath, { force: true });
    if (processResult.timedOut) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "timeout",
            detail: "host process exceeded runner timeout",
        });
    }
    if (processResult.outputLimitExceeded) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "infrastructure-error",
            detail: "host process exceeded the runner output limit",
        });
    }
    if (processResult.code !== 0) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "crash",
            detail: `host exited ${processResult.code}: ${processResult.stderr.slice(0, 1000)}`,
        });
    }
    let observation: HostObservation;
    try {
        observation = parseHostObservation(JSON.parse(processResult.stdout));
    } catch (error) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "infrastructure-error",
            detail: `host returned an invalid observation (${error instanceof Error ? error.message : String(error)}): ${processResult.stdout.slice(0, 1000)}`,
        });
    }
    if (observation.protocolVersion !== hostProtocolVersion || observation.scenarioId !== request.scenarioId) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "infrastructure-error",
            detail: "host response protocol/scenario identity mismatch",
        });
    }
    return judge(scenario, observation);
}

async function runWorklist<T, R>(items: readonly T[], jobs: number, work: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(jobs, Math.max(items.length, 1)) }, async () => {
        while (true) {
            const index = next++;
            if (index >= items.length) return;
            results[index] = await work(items[index]!);
        }
    });
    await Promise.all(workers);
    return results;
}

async function main(): Promise<void> {
    const baseline = await loadBaseline();
    const test262 = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "test262-run.json"));
    const filter = argumentValue("--filter") ?? null;
    const shard = parseShard(argumentValue("--shard"));
    const timeoutMs = positiveInteger(argumentValue("--timeout-ms"), 30_000, "--timeout-ms");
    const jobs = positiveInteger(argumentValue("--jobs"), Math.max(1, Math.min(os.cpus().length, 4)), "--jobs");
    if (process.platform !== baseline.executionProfile.platform || process.arch !== baseline.executionProfile.architecture) {
        throw new Error(
            `execution profile requires ${baseline.executionProfile.platform}/${baseline.executionProfile.architecture}, observed ${process.platform}/${process.arch}`,
        );
    }
    const hostEnvironment = { ...process.env, ...baseline.executionProfile.environment };
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    const hostOverride = argumentValue("--host");
    const suppliedArgs = argumentValues("--host-arg");
    const hostCommand = hostOverride ?? profile.command[0]!;
    const hostArgs = hostOverride ? suppliedArgs : [...profile.command.slice(1), ...suppliedArgs];
    const commandIdentity = [hostCommand, ...hostArgs];
    if (profile.claimEligible && !sameRecord(commandIdentity, profile.command)) {
        throw new Error("claim-eligible execution is bound to the exact reviewed host-profile command");
    }
    const [description, sourceStart, implementationSha256, toolchain] = await Promise.all([
        describeHost(hostCommand, hostArgs, timeoutMs, hostEnvironment),
        projectSourceIdentity(),
        fileManifestSha256(profile.implementationFiles),
        collectToolchain(baseline.executionProfile.compiler),
    ]);
    if (
        description.profileId !== profile.id ||
        description.semanticDelegation !== profile.semanticDelegation ||
        !sameRecord(description.capabilities, profile.capabilities)
    ) {
        throw new Error("host description does not exactly match the reviewed host-profile.json");
    }
    if (description.semanticDelegation || description.capabilities["no-semantic-delegation"] !== true) {
        throw new Error("semantic delegation cannot produce ECMAScript conformance evidence");
    }
    if (!profile.claimEligible && !hasArgument("--allow-ineligible-host")) {
        throw new Error(
            "the checked-in tsc2c host profile is diagnostic-only; implement every runner capability or pass --allow-ineligible-host with a targeted --filter for gap discovery",
        );
    }
    if (!profile.claimEligible && filter === null) {
        throw new Error("an ineligible host may only be used with a targeted --filter; exhaustive blocked-result churn is forbidden");
    }
    const inventory = await buildInventory({ test262, filter, shard });
    const runnable = inventory.scenarios.filter((scenario) => scenario.scope === "in-scope" || scenario.scope === "runner-self-test");
    const requestRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-test262-requests-"));
    const startedAt = new Date().toISOString();
    let results: ScenarioResult[];
    try {
        results = await runWorklist(runnable, jobs, async (scenario) => {
            const request = await makeRequest(test262, scenario, timeoutMs);
            const result = await runScenario(
                hostCommand,
                hostArgs,
                request,
                { id: scenario.id, negative: scenario.negative, async: scenario.async },
                timeoutMs,
                requestRoot,
                hostEnvironment,
            );
            process.stdout.write(`${scenario.id}: ${result.status}\n`);
            return result;
        });
    } finally {
        await fs.rm(requestRoot, { recursive: true, force: true });
    }
    const finishedAt = new Date().toISOString();
    await verifyPinnedCheckout("Test262", test262, baseline.test262);
    const corpusEnd = await verifyTest262Corpus(test262, baseline.test262.discoveryRoots);
    if (corpusEnd.manifestSha256 !== inventory.corpusManifestSha256) {
        throw new Error("pinned Test262 corpus changed during execution");
    }
    const sourceEnd = await projectSourceIdentity();
    const report: Test262RunReport = {
        schemaVersion: 1,
        kind: "test262-run",
        runnerContractVersion: baseline.runnerContract.version,
        startedAt,
        finishedAt,
        sourceStart,
        sourceEnd,
        toolchain,
        executionProfile: {
            id: baseline.executionProfile.id,
            platform: process.platform,
            architecture: process.arch,
            environment: baseline.executionProfile.environment,
        },
        host: { ...description, claimEligible: profile.claimEligible, command: commandIdentity, implementationSha256 },
        timeoutMs,
        inventory,
        corpusEndSha256: corpusEnd.manifestSha256,
        resultSetSha256: sha256Text(JSON.stringify(results)),
        results,
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(report), "utf8");
    console.log(`Wrote Test262 run report to ${output}`);
    const blockingInventory = inventory.issues.some((issue) => issue.claimBlocking);
    if (!profile.claimEligible || blockingInventory || results.some((result) => result.status !== "pass")) process.exit(1);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`test262 run: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
