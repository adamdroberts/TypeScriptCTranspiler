#!/usr/bin/env bun
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
    buildInventory,
    verifyTest262Corpus,
    type ResourceDirectory,
    type ScenarioRecord,
    type Test262Inventory,
} from "./inventory";
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
    recordedEnvironment,
    resolveExecutableIdentity,
    sanitizedEvidenceEnvironment,
    sha256File,
    sha256Text,
    stableJson,
    type ExecutableIdentity,
    verifyPinnedCheckout,
} from "./model";
import { scenarioSource } from "./metadata";
import { collectToolchain } from "./local-gates";
import {
    buildEvidenceContainment,
    supervisedArguments,
    type BuiltContainment,
    type BuiltContainmentIdentity,
} from "./process-supervision";
import {
    hostProtocolVersion,
    nativeArtifactManifestSha256,
    type HostDescription,
    type HostExecutionContract,
    type HostModuleFile,
    type HostObservation,
    type HostPreparation,
    type HostRequest,
    type HostScript,
    type NativeArtifactAttestation,
    type NativeExecutionTranscript,
    parseHostObservation,
    parseHostPreparation,
} from "./protocol";

type ResultStatus = "pass" | "fail" | "timeout" | "crash" | "unsupported" | "infrastructure-error";

interface HostProfile {
    id: string;
    claimEligible: boolean;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    command: string[];
    implementationFiles: string[];
    executionContract: HostExecutionContract;
    environmentAllowlist: string[];
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

export interface MergedShardIdentity {
    index: number;
    total: number;
    sha256: string;
}

const maxScenarioArtifactFiles = 4_096;
const maxScenarioArtifactBytes = 536_870_912;

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
        environmentAllowlist: string[];
        environment: Record<string, string>;
        effectiveEnvironment: Record<string, string>;
    };
    host: HostDescription & {
        claimEligible: boolean;
        command: string[];
        executable: ExecutableIdentity;
        implementationSha256: string;
        dependencyManifestSha256: string;
    };
    containment: BuiltContainmentIdentity;
    timeoutMs: number;
    inventory: Test262Inventory;
    corpusEndSha256: string;
    resultSetSha256: string;
    results: ScenarioResult[];
    mergedShards?: MergedShardIdentity[];
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
    cwd = projectRoot,
    containment: BuiltContainment | null = null,
    useNativeGuard = false,
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    outputLimitExceeded: boolean;
    processGroupCleared: boolean;
}> {
    return new Promise((resolve) => {
        const launchedCommand = containment?.supervisorPath ?? command;
        const launchedArgs = containment
            ? supervisedArguments(timeoutMs, command, args, useNativeGuard ? containment.nativeGuardPath : null)
            : [...args];
        const child = spawn(launchedCommand, launchedArgs, {
            cwd,
            env: environment,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        let timedOut = false;
        let outputLimitExceeded = false;
        let forcedKillTimer: ReturnType<typeof setTimeout> | undefined;
        const outputLimit = 1_048_576;
        const killProcessGroup = (): void => {
            try {
                if (process.platform !== "win32" && child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
                else child.kill("SIGKILL");
            } catch {
                child.kill("SIGKILL");
            }
        };
        const processGroupExists = (): boolean => {
            if (process.platform === "win32" || child.pid === undefined) return false;
            try {
                process.kill(-child.pid, 0);
                return true;
            } catch (error) {
                return (error as NodeJS.ErrnoException).code !== "ESRCH";
            }
        };
        const waitForProcessGroupExit = async (): Promise<boolean> => {
            for (let attempt = 0; attempt < 100; attempt++) {
                if (!processGroupExists()) return true;
                killProcessGroup();
                await new Promise<void>((done) => setTimeout(done, 10));
            }
            return !processGroupExists();
        };
        const finish = async (value: {
            code: number;
            stdout: string;
            stderr: string;
            timedOut: boolean;
            outputLimitExceeded: boolean;
        }): Promise<void> => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (forcedKillTimer) clearTimeout(forcedKillTimer);
            killProcessGroup();
            resolve({ ...value, processGroupCleared: await waitForProcessGroupExit() });
        };
        const requestTermination = (): void => {
            if (settled || forcedKillTimer) return;
            child.kill("SIGTERM");
            forcedKillTimer = setTimeout(killProcessGroup, 2_000);
        };
        const timer = setTimeout(() => {
            timedOut = true;
            requestTermination();
        }, containment ? timeoutMs + 5_000 : timeoutMs);
        const append = (target: "stdout" | "stderr", chunk: Buffer): void => {
            if (settled) return;
            if (target === "stdout") stdout += chunk.toString();
            else stderr += chunk.toString();
            if (stdout.length + stderr.length > outputLimit) {
                outputLimitExceeded = true;
                stdout = stdout.slice(0, outputLimit);
                stderr = stderr.slice(0, outputLimit);
                requestTermination();
            }
        };
        child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
        child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
        child.on("error", (error) => void finish({
            code: 127,
            stdout,
            stderr: `${stderr}${String(error)}`,
            timedOut: false,
            outputLimitExceeded: false,
        }));
        child.on("close", (code) => void finish({
            code: timedOut ? 124 : outputLimitExceeded ? 125 : (code ?? 1),
            stdout,
            stderr,
            timedOut,
            outputLimitExceeded,
        }));
    });
}

async function describeHost(
    command: string,
    args: string[],
    timeoutMs: number,
    environment: NodeJS.ProcessEnv,
    containment: BuiltContainment,
): Promise<HostDescription> {
    const result = await spawnJson(command, [...args, "--describe"], timeoutMs, environment, projectRoot, containment);
    if (!result.processGroupCleared) throw new Error("host --describe process group survived runner cleanup");
    if (result.timedOut) throw new Error("host --describe exceeded the runner timeout");
    if (result.outputLimitExceeded) throw new Error("host --describe exceeded the output limit");
    if (result.code !== 0) throw new Error(`host --describe failed: ${result.stderr.trim()}`);
    if (result.stderr !== "") throw new Error(`host --describe wrote outside the JSON protocol: ${result.stderr.slice(0, 500)}`);
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
        typeof description.capabilities !== "object" ||
        !(description.executionContract === "diagnostic-only-v1" ||
            description.executionContract === "tsc2c-runner-owned-native-v1") ||
        typeof description.effectiveEnvironmentSha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(description.effectiveEnvironmentSha256)
    ) {
        throw new Error(`host --describe response does not implement protocol version ${hostProtocolVersion}`);
    }
    return description;
}

function sameRecord(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedArtifactPath(value: string): string {
    const segments = value.split("/");
    if (
        value === "" ||
        value.includes("\\") ||
        path.posix.isAbsolute(value) ||
        path.posix.normalize(value) !== value ||
        segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
        throw new Error(`host returned an unsafe artifact path: ${value}`);
    }
    return value;
}

function pathWithin(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function attestScenarioArtifactSet(
    artifactDirectory: string,
    expectedPaths: readonly string[],
): Promise<NativeArtifactAttestation[]> {
    const normalized = expectedPaths.map(normalizedArtifactPath);
    if (normalized.length === 0 || new Set(normalized).size !== normalized.length) {
        throw new Error("host artifact worklist must be non-empty and unique");
    }
    if (normalized.length > maxScenarioArtifactFiles) {
        throw new Error(`host artifact worklist exceeds the centralized ${maxScenarioArtifactFiles}-file resource bound`);
    }
    const rootStat = await fs.lstat(artifactDirectory);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
        throw new Error("runner-owned scenario artifact root was replaced");
    }
    const realRoot = await fs.realpath(artifactDirectory);
    const expected = new Set(normalized);
    const expectedDirectories = new Set<string>();
    for (const filename of normalized) {
        let directory = path.posix.dirname(filename);
        while (directory !== ".") {
            expectedDirectories.add(directory);
            directory = path.posix.dirname(directory);
        }
    }
    const result: NativeArtifactAttestation[] = [];
    let totalSize = 0;
    const worklist: Array<{ absolute: string; relative: string }> = [{ absolute: artifactDirectory, relative: "" }];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current.absolute, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const absolute = path.join(current.absolute, entry.name);
            const relative = current.relative === "" ? entry.name : `${current.relative}/${entry.name}`;
            const stat = await fs.lstat(absolute);
            if (stat.isSymbolicLink() || entry.isSymbolicLink()) {
                throw new Error(`scenario artifact tree contains a symlink: ${relative}`);
            }
            if (stat.isDirectory()) {
                if (!expectedDirectories.has(relative)) {
                    throw new Error(`scenario artifact tree contains an extra directory: ${relative}`);
                }
                worklist.push({ absolute, relative });
                continue;
            }
            if (!stat.isFile() || !entry.isFile()) {
                throw new Error(`scenario artifact tree contains a non-regular entry: ${relative}`);
            }
            if (!expected.has(relative)) {
                throw new Error(`scenario artifact tree contains an extra file: ${relative}`);
            }
            if (stat.nlink !== 1) {
                throw new Error(`scenario artifact is hard-linked outside the runner worklist: ${relative}`);
            }
            if (stat.size > 268_435_456) {
                throw new Error(`scenario artifact exceeds the 256 MiB evidence limit: ${relative}`);
            }
            totalSize += stat.size;
            if (totalSize > maxScenarioArtifactBytes) {
                throw new Error("scenario artifact worklist exceeds the centralized 512 MiB evidence limit");
            }
            const real = await fs.realpath(absolute);
            if (!pathWithin(realRoot, real)) {
                throw new Error(`scenario artifact escapes the runner-owned root: ${relative}`);
            }
            result.push({ path: relative, sha256: await sha256File(real), size: stat.size });
        }
    }
    result.sort((left, right) => left.path.localeCompare(right.path));
    if (result.length !== expected.size || result.some((entry) => !expected.has(entry.path))) {
        const observed = new Set(result.map((entry) => entry.path));
        const missing = normalized.find((filename) => !observed.has(filename));
        throw new Error(`scenario artifact tree is incomplete${missing ? `; missing ${missing}` : ""}`);
    }
    return result;
}

async function sealScenarioArtifactTree(
    artifactDirectory: string,
    artifacts: readonly NativeArtifactAttestation[],
    executablePath: string,
): Promise<void> {
    for (const artifact of artifacts) {
        await fs.chmod(
            path.join(artifactDirectory, artifact.path),
            artifact.path === executablePath ? 0o500 : 0o400,
        );
    }
    const directories = new Set<string>([artifactDirectory]);
    for (const artifact of artifacts) {
        let directory = path.dirname(path.join(artifactDirectory, artifact.path));
        while (directory !== artifactDirectory) {
            directories.add(directory);
            directory = path.dirname(directory);
        }
    }
    for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
        await fs.chmod(directory, 0o500);
    }
}

async function makeTemporaryTreeRemovable(root: string): Promise<void> {
    let stat;
    try {
        stat = await fs.lstat(root);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return;
    await fs.chmod(root, 0o700);
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
        const candidate = path.join(root, entry.name);
        const candidateStat = await fs.lstat(candidate);
        if (candidateStat.isDirectory() && !candidateStat.isSymbolicLink()) {
            await makeTemporaryTreeRemovable(candidate);
        }
    }
}

export async function auditNativeArtifactDelegation(
    artifactDirectory: string,
    artifacts: readonly NativeArtifactAttestation[],
    generatedCPath: string,
    executablePath: string,
): Promise<void> {
    if (!generatedCPath.endsWith(".c")) {
        throw new Error("claim-eligible host must identify one generated C translation unit");
    }
    const generatedC = await fs.readFile(generatedCPath);
    const executable = await fs.readFile(executablePath);
    if (
        executable.length < 20 ||
        executable[0] !== 0x7f || executable[1] !== 0x45 || executable[2] !== 0x4c || executable[3] !== 0x46 ||
        executable[4] !== 2 || executable[5] !== 1 || executable.readUInt16LE(18) !== 0x3e
    ) {
        throw new Error("claim-eligible prepared executable is not a Linux x86-64 ELF artifact");
    }
    const programHeaderOffset = Number(executable.readBigUInt64LE(32));
    const programHeaderSize = executable.readUInt16LE(54);
    const programHeaderCount = executable.readUInt16LE(56);
    if (
        !Number.isSafeInteger(programHeaderOffset) ||
        programHeaderSize < 56 ||
        programHeaderCount < 1 ||
        programHeaderOffset + programHeaderSize * programHeaderCount > executable.length
    ) {
        throw new Error("claim-eligible native executable has an invalid ELF program-header table");
    }
    let hasInterpreter = false;
    let hasDynamicTable = false;
    const loadSegments: Array<{ fileOffset: number; virtualAddress: number; fileSize: number }> = [];
    const neededStringOffsets: number[] = [];
    let dynamicStringTableAddress: number | null = null;
    let dynamicStringTableSize: number | null = null;
    const forbiddenDynamicTags = new Set<bigint>([
        15n, // DT_RPATH
        29n, // DT_RUNPATH
        32n, // DT_PREINIT_ARRAY
        33n, // DT_PREINIT_ARRAYSZ
        0x6ffffefbn, // DT_DEPAUDIT
        0x6ffffefcn, // DT_AUDIT
        0x7ffffffdn, // DT_AUXILIARY
        0x7fffffffn, // DT_FILTER
    ]);
    for (let index = 0; index < programHeaderCount; index++) {
        const header = programHeaderOffset + index * programHeaderSize;
        const type = executable.readUInt32LE(header);
        if (type === 1) {
            loadSegments.push({
                fileOffset: Number(executable.readBigUInt64LE(header + 8)),
                virtualAddress: Number(executable.readBigUInt64LE(header + 16)),
                fileSize: Number(executable.readBigUInt64LE(header + 32)),
            });
        }
        if (type === 3) {
            const interpreterOffset = Number(executable.readBigUInt64LE(header + 8));
            const interpreterSize = Number(executable.readBigUInt64LE(header + 32));
            if (
                !Number.isSafeInteger(interpreterOffset) ||
                !Number.isSafeInteger(interpreterSize) ||
                interpreterSize < 2 ||
                interpreterOffset + interpreterSize > executable.length
            ) {
                throw new Error("claim-eligible native executable has an invalid ELF interpreter record");
            }
            const interpreter = executable.subarray(interpreterOffset, interpreterOffset + interpreterSize - 1).toString("utf8");
            if (interpreter !== "/lib64/ld-linux-x86-64.so.2") {
                throw new Error(`claim-eligible native executable uses an unreviewed ELF interpreter ${interpreter}`);
            }
            hasInterpreter = true;
        }
        if (type === 2) {
            hasDynamicTable = true;
            const dynamicOffset = Number(executable.readBigUInt64LE(header + 8));
            const dynamicSize = Number(executable.readBigUInt64LE(header + 32));
            if (
                !Number.isSafeInteger(dynamicOffset) ||
                !Number.isSafeInteger(dynamicSize) ||
                dynamicOffset < 0 ||
                dynamicSize < 16 ||
                dynamicSize % 16 !== 0 ||
                dynamicOffset + dynamicSize > executable.length
            ) {
                throw new Error("claim-eligible native executable has an invalid ELF dynamic table");
            }
            for (let offset = dynamicOffset; offset < dynamicOffset + dynamicSize; offset += 16) {
                const tag = executable.readBigInt64LE(offset);
                if (tag === 0n) break;
                const value = Number(executable.readBigUInt64LE(offset + 8));
                if (!Number.isSafeInteger(value)) {
                    throw new Error("claim-eligible native executable has an unsafe ELF dynamic value");
                }
                if (tag === 1n) neededStringOffsets.push(value);
                if (tag === 5n) dynamicStringTableAddress = value;
                if (tag === 10n) dynamicStringTableSize = value;
                if (forbiddenDynamicTags.has(tag)) {
                    throw new Error(`claim-eligible native executable uses forbidden ELF dynamic tag ${tag.toString(16)}`);
                }
            }
        }
    }
    if (!hasInterpreter || !hasDynamicTable) {
        throw new Error("claim-eligible native executable must be dynamically loaded so the runner guard can activate");
    }
    if (dynamicStringTableAddress === null || dynamicStringTableSize === null || dynamicStringTableSize < 1) {
        throw new Error("claim-eligible native executable has no bounded dynamic string table");
    }
    const stringSegment = loadSegments.find((segment) =>
        dynamicStringTableAddress! >= segment.virtualAddress &&
        dynamicStringTableAddress! + dynamicStringTableSize! <= segment.virtualAddress + segment.fileSize
    );
    if (!stringSegment) throw new Error("claim-eligible native executable dynamic strings are outside a load segment");
    const dynamicStringTableOffset = stringSegment.fileOffset + dynamicStringTableAddress - stringSegment.virtualAddress;
    for (const neededOffset of neededStringOffsets) {
        if (neededOffset < 0 || neededOffset >= dynamicStringTableSize) {
            throw new Error("claim-eligible native executable has an invalid DT_NEEDED string offset");
        }
        const start = dynamicStringTableOffset + neededOffset;
        const limit = dynamicStringTableOffset + dynamicStringTableSize;
        const end = executable.indexOf(0, start);
        if (end < start || end >= limit) throw new Error("claim-eligible native executable has an unterminated DT_NEEDED name");
        const dependency = executable.subarray(start, end).toString("utf8");
        if (dependency === "" || dependency.includes("/")) {
            throw new Error(`claim-eligible native executable uses an unsafe DT_NEEDED name ${dependency}`);
        }
    }
    const sectionHeaderOffset = Number(executable.readBigUInt64LE(40));
    const sectionHeaderSize = executable.readUInt16LE(58);
    const sectionHeaderCount = executable.readUInt16LE(60);
    if (
        !Number.isSafeInteger(sectionHeaderOffset) ||
        sectionHeaderSize < 64 ||
        sectionHeaderCount < 1 ||
        sectionHeaderOffset + sectionHeaderSize * sectionHeaderCount > executable.length
    ) {
        throw new Error("claim-eligible native executable has no independently auditable ELF section table");
    }
    for (let index = 0; index < sectionHeaderCount; index++) {
        const header = sectionHeaderOffset + index * sectionHeaderSize;
        const sectionType = executable.readUInt32LE(header + 4);
        if (!(sectionType === 2 || sectionType === 11)) continue;
        const symbolOffset = Number(executable.readBigUInt64LE(header + 24));
        const symbolSize = Number(executable.readBigUInt64LE(header + 32));
        const symbolEntrySize = Number(executable.readBigUInt64LE(header + 56));
        if (
            !Number.isSafeInteger(symbolOffset) ||
            !Number.isSafeInteger(symbolSize) ||
            !Number.isSafeInteger(symbolEntrySize) ||
            symbolEntrySize < 24 ||
            symbolSize % symbolEntrySize !== 0 ||
            symbolOffset + symbolSize > executable.length
        ) {
            throw new Error("claim-eligible native executable has an invalid ELF symbol table");
        }
        for (let offset = symbolOffset; offset < symbolOffset + symbolSize; offset += symbolEntrySize) {
            if ((executable[offset + 4]! & 0x0f) === 10) {
                throw new Error("claim-eligible native executable contains a pre-guard GNU IFUNC resolver");
            }
        }
    }
    const engineReference = /lib(?:node|v8|bun|quickjs|duktape)|javascriptcore|node_api(?:\.h)?|\bv8\.h\b|\bquickjs\.h\b|\bduktape\.h\b|napi_create|\bv8::/i;
    const spawnSymbol = /\0(?:execv|execve|execvp|execvpe|execl|execle|execlp|execveat|posix_spawn|posix_spawnp|system|popen)\0/;
    for (const artifact of artifacts) {
        const bytes = artifact.path === path.relative(artifactDirectory, generatedCPath).split(path.sep).join("/")
            ? generatedC
            : artifact.path === path.relative(artifactDirectory, executablePath).split(path.sep).join("/")
                ? executable
                : await fs.readFile(path.join(artifactDirectory, artifact.path));
        const text = bytes.toString("latin1");
        const forbidden = engineReference.exec(text) ?? spawnSymbol.exec(text);
        if (forbidden) {
            throw new Error(`claim-eligible native artifact ${artifact.path} references forbidden delegated execution: ${forbidden[0]}`);
        }
    }
    await fs.access(executablePath, fs.constants.X_OK);
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

async function hostModuleFiles(
    test262: string,
    scenario: ScenarioRecord,
    resourceDirectory: ResourceDirectory,
): Promise<HostModuleFile[]> {
    if (resourceDirectory.directory !== scenario.resourceDirectory) {
        throw new Error(`${scenario.id} resource-directory identity mismatch`);
    }
    const files: HostModuleFile[] = [];
    for (const dependency of resourceDirectory.files) {
        if (dependency.path === scenario.test) continue;
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
    resourceDirectory: ResourceDirectory,
    timeoutMs: number,
    artifactDirectory: string,
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
        moduleFiles: await hostModuleFiles(test262, scenario, resourceDirectory),
        mode: scenario.mode,
        goal: scenario.mode === "module" ? "module" : "script",
        raw: scenario.raw,
        setupScripts: await hostScripts(test262, scenario),
        testSource: transformed,
        testSourceSha256: scenario.scenarioSourceSha256,
        async: scenario.async,
        canBlock: scenario.canBlock,
        timeoutMs,
        artifactDirectory,
    };
}

function requestIdentity(value: {
    scenarioId: string;
    testPath: string;
    moduleBasePath: string;
    moduleFiles: Array<{ path: string; sha256: string }>;
    mode: string;
    goal: "script" | "module";
    raw: boolean;
    setupScripts: Array<{ path: string; sha256: string }>;
    testSourceSha256: string;
    async: boolean;
    canBlock: boolean | null;
    timeoutMs: number;
}): string {
    return sha256Text(JSON.stringify({
        protocolVersion: hostProtocolVersion,
        scenarioId: value.scenarioId,
        testPath: value.testPath,
        moduleBasePath: value.moduleBasePath,
        moduleFiles: value.moduleFiles.map(({ path: filename, sha256 }) => ({ path: filename, sha256 })),
        mode: value.mode,
        goal: value.goal,
        raw: value.raw,
        setupScripts: value.setupScripts.map(({ path: filename, sha256 }) => ({ path: filename, sha256 })),
        testSourceSha256: value.testSourceSha256,
        async: value.async,
        canBlock: value.canBlock,
        timeoutMs: value.timeoutMs,
    }));
}

export function hostRequestIdentity(request: HostRequest): string {
    return requestIdentity(request);
}

export function scenarioRequestIdentity(
    scenario: ScenarioRecord,
    resourceDirectory: ResourceDirectory,
    timeoutMs: number,
): string {
    return requestIdentity({
        scenarioId: scenario.id,
        testPath: scenario.test,
        moduleBasePath: path.posix.dirname(scenario.test),
        moduleFiles: resourceDirectory.files.filter((dependency) => dependency.path !== scenario.test),
        mode: scenario.mode,
        goal: scenario.mode === "module" ? "module" : "script",
        raw: scenario.raw,
        setupScripts: scenario.includes,
        testSourceSha256: scenario.scenarioSourceSha256,
        async: scenario.async,
        canBlock: scenario.canBlock,
        timeoutMs,
    });
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
    const validNegativeOrigin = observation.origin === "test-source" ||
        (observation.origin === "module-graph" && scenario.negative.phase !== "parse");
    if (!validNegativeOrigin) {
        return {
            ...common,
            status: "fail",
            detail: `${observation.origin} failure cannot satisfy negative test metadata`,
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

function infrastructureObservation(scenarioId: string, detail: string): HostObservation {
    return {
        protocolVersion: hostProtocolVersion,
        scenarioId,
        kind: "infrastructure-error",
        detail,
    };
}

function attachNativeTranscript(
    observation: HostObservation,
    transcript: NativeExecutionTranscript,
): HostObservation {
    if (observation.nativeTranscript !== undefined) {
        throw new Error("host/native output attempted to author the runner-owned transcript");
    }
    return { ...observation, nativeTranscript: transcript };
}

function runnerTranscript(
    request: HostRequest,
    implementationSha256: string,
    preparation: Extract<HostPreparation, { kind: "prepared-native" | "compiler-error" }>,
    artifacts: NativeArtifactAttestation[],
    runExitCode: number | null,
    containment: BuiltContainmentIdentity,
): NativeExecutionTranscript {
    return preparation.kind === "prepared-native"
        ? {
            contract: "tsc2c-runner-owned-native-v1",
            attestationSource: "runner",
            requestIdentitySha256: hostRequestIdentity(request),
            implementationSha256,
            containmentContract: containment.contract,
            processSupervisorSha256: containment.processSupervisor.executableSha256,
            nativeExecutionGuardSha256: containment.nativeExecutionGuard.librarySha256,
            observationSource: "native-binary",
            compileExitCode: preparation.compileExitCode,
            artifacts,
            artifactManifestSha256: nativeArtifactManifestSha256(artifacts),
            generatedCPath: preparation.generatedCPath,
            executablePath: preparation.executablePath,
            diagnosticsPath: null,
            runExitCode,
            semanticDelegation: false,
        }
        : {
            contract: "tsc2c-runner-owned-native-v1",
            attestationSource: "runner",
            requestIdentitySha256: hostRequestIdentity(request),
            implementationSha256,
            containmentContract: containment.contract,
            processSupervisorSha256: containment.processSupervisor.executableSha256,
            nativeExecutionGuardSha256: null,
            observationSource: "compiler",
            compileExitCode: preparation.compileExitCode,
            artifacts,
            artifactManifestSha256: nativeArtifactManifestSha256(artifacts),
            generatedCPath: null,
            executablePath: null,
            diagnosticsPath: preparation.diagnosticsPath,
            runExitCode: null,
            semanticDelegation: false,
        };
}

export async function runPreparedNative(
    request: HostRequest,
    preparation: Extract<HostPreparation, { kind: "prepared-native" }>,
    scenario: Pick<ScenarioRecord, "id" | "negative" | "async">,
    timeoutMs: number,
    environment: NodeJS.ProcessEnv,
    implementationSha256: string,
    containment: BuiltContainment,
): Promise<ScenarioResult> {
    let before: NativeArtifactAttestation[];
    try {
        before = await attestScenarioArtifactSet(request.artifactDirectory, preparation.artifactPaths);
        const generatedC = path.join(request.artifactDirectory, preparation.generatedCPath);
        const executable = path.join(request.artifactDirectory, preparation.executablePath);
        await auditNativeArtifactDelegation(request.artifactDirectory, before, generatedC, executable);
        await sealScenarioArtifactTree(request.artifactDirectory, before, preparation.executablePath);
    } catch (error) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `runner could not attest prepared native artifacts: ${error instanceof Error ? error.message : String(error)}`,
        ));
    }

    const executable = path.join(request.artifactDirectory, preparation.executablePath);
    const processResult = await spawnJson(
        executable,
        [],
        timeoutMs,
        environment,
        request.artifactDirectory,
        containment,
        true,
    );
    if (!processResult.processGroupCleared) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "native process group survived runner cleanup"));
    }
    if (processResult.timedOut) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "timeout",
            detail: "runner-owned native execution exceeded the scenario timeout",
        });
    }
    if (processResult.outputLimitExceeded) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "native execution exceeded the runner output limit"));
    }
    if (processResult.code !== 0) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "crash",
            detail: `runner-owned native executable exited ${processResult.code}: ${processResult.stderr.slice(0, 1000)}`,
        });
    }
    if (processResult.stderr !== "") {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `native executable wrote outside the JSON observation protocol: ${processResult.stderr.slice(0, 1000)}`,
        ));
    }
    let observation: HostObservation;
    try {
        observation = parseHostObservation(JSON.parse(processResult.stdout));
    } catch (error) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `native executable returned an invalid observation (${error instanceof Error ? error.message : String(error)}): ${processResult.stdout.slice(0, 1000)}`,
        ));
    }
    if (observation.scenarioId !== request.scenarioId || observation.nativeTranscript !== undefined) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            "native observation identity differs or attempted to author runner evidence",
        ));
    }
    if (!(observation.kind === "normal" || (observation.kind === "throw" && observation.phase === "runtime"))) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            "compiled native execution may report only normal completion or a runtime throw",
        ));
    }
    let after: NativeArtifactAttestation[];
    try {
        after = await attestScenarioArtifactSet(request.artifactDirectory, preparation.artifactPaths);
    } catch (error) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `native artifact tree changed during execution: ${error instanceof Error ? error.message : String(error)}`,
        ));
    }
    if (!sameRecord(before, after)) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "native artifact bytes changed during execution"));
    }
    const transcript = runnerTranscript(
        request,
        implementationSha256,
        preparation,
        after,
        processResult.code,
        containment.identity,
    );
    return judge(scenario, attachNativeTranscript(observation, transcript));
}

async function runScenario(
    command: string,
    args: string[],
    request: HostRequest,
    scenario: Pick<ScenarioRecord, "id" | "negative" | "async">,
    timeoutMs: number,
    scenarioRoot: string,
    environment: NodeJS.ProcessEnv,
    nativeEvidence: { required: boolean; implementationSha256: string },
    containment: BuiltContainment,
): Promise<ScenarioResult> {
    const requestPath = path.join(scenarioRoot, "request.json");
    await fs.writeFile(requestPath, JSON.stringify(request), "utf8");
    const processResult = await spawnJson(
        command,
        [...args, "--request", requestPath],
        timeoutMs + 1_000,
        environment,
        projectRoot,
        containment,
    );
    await fs.rm(requestPath, { force: true });
    if (!processResult.processGroupCleared) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "host process group survived runner cleanup"));
    }
    if (processResult.timedOut) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "timeout",
            detail: "host preparation process exceeded runner timeout",
        });
    }
    if (processResult.outputLimitExceeded) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "host preparation exceeded the runner output limit"));
    }
    if (processResult.code !== 0) {
        return judge(scenario, {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "crash",
            detail: `host preparation exited ${processResult.code}: ${processResult.stderr.slice(0, 1000)}`,
        });
    }
    if (processResult.stderr !== "") {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `host preparation wrote outside the JSON protocol: ${processResult.stderr.slice(0, 1000)}`,
        ));
    }
    let preparation: HostPreparation;
    try {
        preparation = parseHostPreparation(JSON.parse(processResult.stdout));
    } catch (error) {
        return judge(scenario, infrastructureObservation(
            request.scenarioId,
            `host returned an invalid preparation (${error instanceof Error ? error.message : String(error)}): ${processResult.stdout.slice(0, 1000)}`,
        ));
    }
    if (preparation.scenarioId !== request.scenarioId) {
        return judge(scenario, infrastructureObservation(request.scenarioId, "host preparation scenario identity mismatch"));
    }
    if (preparation.kind === "diagnostic-observation") {
        return nativeEvidence.required
            ? judge(scenario, infrastructureObservation(
                request.scenarioId,
                "claim-eligible host returned a direct observation instead of runner-owned native artifacts",
            ))
            : judge(scenario, preparation.observation);
    }
    if (preparation.kind === "compiler-error") {
        let artifacts: NativeArtifactAttestation[];
        try {
            artifacts = await attestScenarioArtifactSet(request.artifactDirectory, preparation.artifactPaths);
        } catch (error) {
            return judge(scenario, infrastructureObservation(
                request.scenarioId,
                `runner could not attest compiler artifacts: ${error instanceof Error ? error.message : String(error)}`,
            ));
        }
        await sealScenarioArtifactTree(request.artifactDirectory, artifacts, "");
        const transcript = runnerTranscript(
            request,
            nativeEvidence.implementationSha256,
            preparation,
            artifacts,
            null,
            containment.identity,
        );
        return judge(scenario, attachNativeTranscript(preparation.observation, transcript));
    }
    return runPreparedNative(
        request,
        preparation,
        scenario,
        timeoutMs,
        environment,
        nativeEvidence.implementationSha256,
        containment,
    );
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
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    const hostEnvironment = sanitizedEvidenceEnvironment(
        profile.environmentAllowlist,
        baseline.executionProfile.environment,
    );
    const effectiveEnvironment = recordedEnvironment(hostEnvironment);
    const hostOverride = argumentValue("--host");
    const suppliedArgs = argumentValues("--host-arg");
    const hostCommand = hostOverride ?? profile.command[0]!;
    const hostArgs = hostOverride ? suppliedArgs : [...profile.command.slice(1), ...suppliedArgs];
    const commandIdentity = [hostCommand, ...hostArgs];
    if (profile.claimEligible && !sameRecord(commandIdentity, profile.command)) {
        throw new Error("claim-eligible execution is bound to the exact reviewed host-profile command");
    }
    if (profile.claimEligible && profile.executionContract !== "tsc2c-runner-owned-native-v1") {
        throw new Error("claim-eligible execution requires the runner-owned native artifact/execution contract");
    }
    const containmentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-evidence-containment-"));
    try {
    const containment = await buildEvidenceContainment(
        containmentRoot,
        baseline.executionProfile.compiler,
        hostEnvironment,
    );
    const [hostExecutable, sourceStart, implementationSha256, dependencyManifestSha256, toolchain] = await Promise.all([
        resolveExecutableIdentity(hostCommand, hostEnvironment),
        projectSourceIdentity(),
        fileManifestSha256(profile.implementationFiles),
        fileManifestSha256(["package.json", "bun.lock"]),
        collectToolchain(baseline.executionProfile.compiler, baseline.executionProfile.environment),
    ]);
    const description = await describeHost(hostExecutable.resolvedPath, hostArgs, timeoutMs, hostEnvironment, containment);
    if (
        description.profileId !== profile.id ||
        description.semanticDelegation !== profile.semanticDelegation ||
        !sameRecord(description.capabilities, profile.capabilities) ||
        description.executionContract !== profile.executionContract ||
        description.effectiveEnvironmentSha256 !== sha256Text(JSON.stringify(effectiveEnvironment))
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
    const resourcesByDirectory = new Map(
        inventory.resourceDirectories.map((directory) => [directory.directory, directory]),
    );
    const requestRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-test262-requests-"));
    const startedAt = new Date().toISOString();
    let results: ScenarioResult[];
    try {
        results = await runWorklist(runnable, jobs, async (scenario) => {
            const resourceDirectory = resourcesByDirectory.get(scenario.resourceDirectory);
            if (!resourceDirectory) throw new Error(`${scenario.id} has no attested sibling-resource directory`);
            const scenarioRoot = path.join(requestRoot, sha256Text(scenario.id));
            const artifactDirectory = path.join(scenarioRoot, "artifacts");
            await fs.mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
            const request = await makeRequest(test262, scenario, resourceDirectory, timeoutMs, artifactDirectory);
            const result = await runScenario(
                hostExecutable.resolvedPath,
                hostArgs,
                request,
                { id: scenario.id, negative: scenario.negative, async: scenario.async },
                timeoutMs,
                scenarioRoot,
                hostEnvironment,
                {
                    required: profile.claimEligible,
                    implementationSha256,
                },
                containment,
            );
            process.stdout.write(`${scenario.id}: ${result.status}\n`);
            return result;
        });
    } finally {
        await makeTemporaryTreeRemovable(requestRoot);
        if (!process.env.TSC2C_KEEP_REQUESTS) {
            await fs.rm(requestRoot, { recursive: true, force: true });
        } else {
            process.stdout.write(`[debug] kept ${requestRoot}\n`);
        }
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
            environmentAllowlist: baseline.executionProfile.environmentAllowlist,
            environment: baseline.executionProfile.environment,
            effectiveEnvironment,
        },
        host: {
            ...description,
            claimEligible: profile.claimEligible,
            command: commandIdentity,
            executable: hostExecutable,
            implementationSha256,
            dependencyManifestSha256,
        },
        containment: containment.identity,
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
    if (!profile.claimEligible || blockingInventory || results.some((result) => result.status !== "pass")) process.exitCode = 1;
    } finally {
        await fs.rm(containmentRoot, { recursive: true, force: true });
    }
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`test262 run: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
