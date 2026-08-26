#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { propertyEvidenceFiles } from "../property/manifest";
import { discoverE2eCaseManifest } from "../e2e/case-manifest";
import {
    argumentValue,
    defaultArtifactRoot,
    fileManifestSha256,
    loadBaseline,
    projectRoot,
    projectSourceIdentity,
    recordedEnvironment,
    resolveExecutableIdentity,
    runProcess,
    sanitizedEvidenceEnvironment,
    sha256File,
    sha256Text,
    stableJson,
    type ExecutableIdentity,
} from "./model";
import {
    buildEvidenceContainment,
    supervisedArguments,
    type BuiltContainment,
    type BuiltContainmentIdentity,
} from "./process-supervision";

export interface GateResult {
    id: string;
    command: string[];
    executable: ExecutableIdentity;
    environment: Record<string, string>;
    timeoutMs: number;
    status: "pass" | "fail";
    exitCode: number;
    timedOut: boolean;
    stdoutSha256: string;
    stderrSha256: string;
    stdoutTail: string;
    stderrTail: string;
}

export interface LocalGatesReport {
    schemaVersion: 1;
    kind: "ecmascript-local-gates";
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
    selection: { exhaustive: boolean; gate: string | null };
    generatedEvidenceManifestSha256: string;
    propertyEvidenceManifestSha256: string;
    e2eEvidenceManifestSha256: string;
    dependencyManifestSha256: string;
    containment: BuiltContainmentIdentity;
    gates: GateResult[];
}

function appendTail(current: string, chunk: string, limit = 8_000): string {
    const next = current + chunk;
    return next.length <= limit ? next : next.slice(next.length - limit);
}

async function runGate(
    id: string,
    command: string[],
    environment: Record<string, string>,
    timeoutMs: number,
    containment: BuiltContainment,
): Promise<GateResult> {
    const [executable, ...args] = command;
    if (!executable) throw new Error(`local gate ${id} has an empty command`);
    const executableIdentity = await resolveExecutableIdentity(executable, environment);
    return new Promise((resolve) => {
        const child = spawn(
            containment.supervisorPath,
            supervisedArguments(timeoutMs, executableIdentity.resolvedPath, args),
            {
            cwd: projectRoot,
            env: environment,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
            },
        );
        const stdoutHash = createHash("sha256");
        const stderrHash = createHash("sha256");
        let stdoutTail = "";
        let stderrTail = "";
        let settled = false;
        let timedOut = false;
        let forcedKillTimer: ReturnType<typeof setTimeout> | undefined;
        const killProcessGroup = (): void => {
            try {
                if (process.platform !== "win32" && child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
                else child.kill("SIGKILL");
            } catch {
                child.kill("SIGKILL");
            }
        };
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            forcedKillTimer = setTimeout(killProcessGroup, 2_000);
        }, timeoutMs + 5_000);
        const finish = (result: GateResult): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (forcedKillTimer) clearTimeout(forcedKillTimer);
            killProcessGroup();
            resolve(result);
        };
        child.stdout.on("data", (chunk: Buffer) => {
            stdoutHash.update(chunk);
            stdoutTail = appendTail(stdoutTail, chunk.toString());
            process.stdout.write(chunk);
        });
        child.stderr.on("data", (chunk: Buffer) => {
            stderrHash.update(chunk);
            stderrTail = appendTail(stderrTail, chunk.toString());
            process.stderr.write(chunk);
        });
        child.on("error", (error) => {
            const text = String(error);
            stderrHash.update(text);
            finish({
                id,
                command,
                executable: executableIdentity,
                environment,
                timeoutMs,
                status: "fail",
                exitCode: 127,
                timedOut: false,
                stdoutSha256: stdoutHash.digest("hex"),
                stderrSha256: stderrHash.digest("hex"),
                stdoutTail,
                stderrTail: appendTail(stderrTail, text),
            });
        });
        child.on("close", (code) => {
            if (settled) return;
            const exitCode = timedOut ? 124 : (code ?? 1);
            finish({
                id,
                command,
                executable: executableIdentity,
                environment,
                timeoutMs,
                status: exitCode === 0 ? "pass" : "fail",
                exitCode,
                timedOut: exitCode === 124,
                stdoutSha256: stdoutHash.digest("hex"),
                stderrSha256: stderrHash.digest("hex"),
                stdoutTail,
                stderrTail,
            });
        });
    });
}

async function toolVersion(command: string, args: string[]): Promise<string> {
    const result = await runProcess(command, args, { cwd: projectRoot });
    return result.code === 0 ? (result.stdout || result.stderr).trim() : `unavailable (exit ${result.code})`;
}

async function toolFileIdentity(filename: string): Promise<string> {
    try {
        const realPath = await fs.realpath(filename);
        return `${realPath}:${await sha256File(realPath)}`;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "unknown";
        return `unavailable (${code})`;
    }
}

export async function collectToolchain(
    compiler = "gcc",
    environment: Readonly<Record<string, string>> = {},
): Promise<Record<string, string>> {
    const dispatchPrefix = environment.TSC2C_LIBDISPATCH_PREFIX;
    const dispatchHeader = dispatchPrefix
        ? path.join(dispatchPrefix, "lib", "swift", "dispatch", "dispatch.h")
        : "";
    const dispatchLibrary = dispatchPrefix
        ? path.join(dispatchPrefix, "lib", "swift", "linux", "libdispatch.so")
        : "";
    return {
        runnerImage: `${process.env.ImageOS ?? "unreported"}:${process.env.ImageVersion ?? "unreported"}`,
        osRelease: await toolVersion("cat", ["/etc/os-release"]),
        kernel: await toolVersion("uname", ["-srvmo"]),
        bun: await toolVersion("bun", ["--version"]),
        typescript: await toolVersion("bun", ["x", "tsc", "--version"]),
        [compiler]: await toolVersion(compiler, ["--version"]),
        cxx: await toolVersion("g++", ["--version"]),
        clang: await toolVersion("clang", ["--version"]),
        swift: await toolVersion("swift", ["--version"]),
        libdispatchHeader: dispatchHeader ? await toolFileIdentity(dispatchHeader) : "unconfigured",
        libdispatchLibrary: dispatchLibrary ? await toolFileIdentity(dispatchLibrary) : "unconfigured",
        libc: await toolVersion("getconf", ["GNU_LIBC_VERSION"]),
        tzdata: await toolVersion("dpkg-query", ["-W", "-f=${Version}", "tzdata"]),
        boehmGc: await toolVersion("pkg-config", ["--modversion", "bdw-gc"]),
        openssl: await toolVersion("pkg-config", ["--modversion", "openssl"]),
        icu: await toolVersion("pkg-config", ["--modversion", "icu-uc"]),
        libuv: await toolVersion("pkg-config", ["--modversion", "libuv"]),
        pcre2: await toolVersion("pkg-config", ["--modversion", "libpcre2-8"]),
        gmp: await toolVersion("pkg-config", ["--modversion", "gmp"]),
    };
}

export async function generatedManifestDigest(): Promise<string> {
    const cases = path.join(projectRoot, "tests/e2e/cases");
    const entries: Array<{ path: string; sha256: string }> = [];
    for (const entry of await fs.readdir(cases, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const filename = path.join(cases, entry.name, "generate.json");
        try {
            entries.push({
                path: path.relative(projectRoot, filename).split(path.sep).join("/"),
                sha256: await sha256File(filename),
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }
    entries.push({
        path: "tests/e2e/generated-cases.ts",
        sha256: await sha256File(path.join(projectRoot, "tests/e2e/generated-cases.ts")),
    });
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return sha256Text(JSON.stringify(entries));
}

export async function propertyManifestDigest(): Promise<string> {
    const entries = await Promise.all((await propertyEvidenceFiles()).map(async (filename) => ({
        path: path.relative(projectRoot, filename).split(path.sep).join("/"),
        sha256: await sha256File(filename),
    })));
    return sha256Text(JSON.stringify(entries));
}

export async function e2eEvidenceManifestDigest(): Promise<string> {
    const entries = (await discoverE2eCaseManifest()).map((entry) => ({
        name: entry.name,
        generator: entry.generator,
        generatorParameters: entry.generatorParameters,
        generatedSourceKind: entry.generatedSourceKind,
        generatedSourceSha256: entry.generatedSource === undefined ? undefined : sha256Text(entry.generatedSource),
        expectedExitCode: entry.expectedExitCode,
        emitCOnly: entry.emitCOnly,
        semanticDelegation: entry.semanticDelegation,
        dispatch: entry.dispatch,
        dispatchSerial: entry.dispatchSerial,
        dispatchNoGc: entry.dispatchNoGc,
        inputManifestSha256: entry.inputManifestSha256,
        inputs: entry.inputs,
    }));
    return sha256Text(JSON.stringify(entries));
}

async function main(): Promise<void> {
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "local-gates.json"));
    const baseline = await loadBaseline();
    const gateFilter = argumentValue("--gate") ?? null;
    if (gateFilter !== null && !baseline.localGates.some((gate) => gate.id === gateFilter)) {
        throw new Error(`unknown local gate ${gateFilter}`);
    }
    if (process.platform !== baseline.executionProfile.platform || process.arch !== baseline.executionProfile.architecture) {
        throw new Error(
            `execution profile requires ${baseline.executionProfile.platform}/${baseline.executionProfile.architecture}, observed ${process.platform}/${process.arch}`,
        );
    }
    const sourceStart = await projectSourceIdentity();
    const startedAt = new Date().toISOString();
    const baseEnvironment = recordedEnvironment(sanitizedEvidenceEnvironment(
        baseline.executionProfile.environmentAllowlist,
        baseline.executionProfile.environment,
    ));
    const toolchain = await collectToolchain(baseline.executionProfile.compiler, baseline.executionProfile.environment);
    const containmentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-local-containment-"));
    try {
    const containment = await buildEvidenceContainment(
        containmentRoot,
        baseline.executionProfile.compiler,
        baseEnvironment,
    );
    const gates: GateResult[] = [];
    const selectedGates = gateFilter === null ? baseline.localGates : baseline.localGates.filter((gate) => gate.id === gateFilter);
    for (const gate of selectedGates) {
        console.log(`\ncompliance local gate: ${gate.id}`);
        const environment = recordedEnvironment(sanitizedEvidenceEnvironment(
            baseline.executionProfile.environmentAllowlist,
            { ...baseline.executionProfile.environment, ...(gate.environment ?? {}) },
        ));
        const result = await runGate(gate.id, gate.command, environment, gate.timeoutMs, containment);
        gates.push(result);
        if (result.status !== "pass") break;
    }
    const report: LocalGatesReport = {
        schemaVersion: 1,
        kind: "ecmascript-local-gates",
        startedAt,
        finishedAt: new Date().toISOString(),
        sourceStart,
        sourceEnd: await projectSourceIdentity(),
        toolchain,
        executionProfile: {
            id: baseline.executionProfile.id,
            platform: process.platform,
            architecture: process.arch,
            environmentAllowlist: baseline.executionProfile.environmentAllowlist,
            environment: baseline.executionProfile.environment,
            effectiveEnvironment: baseEnvironment,
        },
        selection: { exhaustive: gateFilter === null, gate: gateFilter },
        generatedEvidenceManifestSha256: await generatedManifestDigest(),
        propertyEvidenceManifestSha256: await propertyManifestDigest(),
        e2eEvidenceManifestSha256: await e2eEvidenceManifestDigest(),
        dependencyManifestSha256: await fileManifestSha256(["package.json", "bun.lock"]),
        containment: containment.identity,
        gates,
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(report), "utf8");
    console.log(`Wrote local compliance gate report to ${output}`);
    if (gates.length !== selectedGates.length || gates.some((gate) => gate.status !== "pass")) process.exitCode = 1;
    } finally {
        await fs.rm(containmentRoot, { recursive: true, force: true });
    }
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`local compliance gates: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
