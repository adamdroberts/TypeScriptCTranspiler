#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { propertyEvidenceFiles } from "../property/manifest";
import {
    argumentValue,
    defaultArtifactRoot,
    loadBaseline,
    projectRoot,
    projectSourceIdentity,
    runProcess,
    sha256File,
    sha256Text,
    stableJson,
} from "./model";

export interface GateResult {
    id: string;
    command: string[];
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
        environment: Record<string, string>;
    };
    selection: { exhaustive: boolean; gate: string | null };
    generatedEvidenceManifestSha256: string;
    propertyEvidenceManifestSha256: string;
    gates: GateResult[];
}

function appendTail(current: string, chunk: string, limit = 8_000): string {
    const next = current + chunk;
    return next.length <= limit ? next : next.slice(next.length - limit);
}

function runGate(
    id: string,
    command: string[],
    environment: Record<string, string>,
    timeoutMs: number,
): Promise<GateResult> {
    return new Promise((resolve) => {
        const [executable, ...args] = command;
        if (!executable) throw new Error(`local gate ${id} has an empty command`);
        const child = spawn(executable, args, {
            cwd: projectRoot,
            env: { ...process.env, ...environment },
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
        });
        const stdoutHash = createHash("sha256");
        const stderrHash = createHash("sha256");
        let stdoutTail = "";
        let stderrTail = "";
        let settled = false;
        let timedOut = false;
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
            killProcessGroup();
        }, timeoutMs);
        const finish = (result: GateResult): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
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
            finish({
                id,
                command,
                environment,
                timeoutMs,
                status: !timedOut && code === 0 ? "pass" : "fail",
                exitCode: timedOut ? 124 : (code ?? 1),
                timedOut,
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

export async function collectToolchain(compiler = "gcc"): Promise<Record<string, string>> {
    return {
        runnerImage: `${process.env.ImageOS ?? "unreported"}:${process.env.ImageVersion ?? "unreported"}`,
        osRelease: await toolVersion("cat", ["/etc/os-release"]),
        kernel: await toolVersion("uname", ["-srvmo"]),
        bun: await toolVersion("bun", ["--version"]),
        typescript: await toolVersion("bun", ["x", "tsc", "--version"]),
        [compiler]: await toolVersion(compiler, ["--version"]),
        cxx: await toolVersion("g++", ["--version"]),
        clang: await toolVersion("clang", ["--version"]),
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
    const toolchain = await collectToolchain(baseline.executionProfile.compiler);
    const gates: GateResult[] = [];
    const selectedGates = gateFilter === null ? baseline.localGates : baseline.localGates.filter((gate) => gate.id === gateFilter);
    for (const gate of selectedGates) {
        console.log(`\ncompliance local gate: ${gate.id}`);
        const environment = { ...baseline.executionProfile.environment, ...(gate.environment ?? {}) };
        const result = await runGate(gate.id, gate.command, environment, gate.timeoutMs);
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
            environment: baseline.executionProfile.environment,
        },
        selection: { exhaustive: gateFilter === null, gate: gateFilter },
        generatedEvidenceManifestSha256: await generatedManifestDigest(),
        propertyEvidenceManifestSha256: await propertyManifestDigest(),
        gates,
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(report), "utf8");
    console.log(`Wrote local compliance gate report to ${output}`);
    if (gates.length !== selectedGates.length || gates.some((gate) => gate.status !== "pass")) process.exit(1);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`local compliance gates: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
