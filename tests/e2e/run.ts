#!/usr/bin/env bun
/**
 * E2E runner: compile each case in tests/e2e/cases/<name>/in.ts, run the
 * resulting binary, diff stdout vs expected.stdout, and optionally assert a
 * stderr substring for opt-in diagnostics.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { compile } from "../../src/compile";
import { ensureE2eNodeModuleFixtures } from "./fixtures";

const casesDir = path.resolve(import.meta.dir, "cases");

interface Case {
    name: string;
    entry: string;
    expected?: string;
    expectedStderrContains?: string;
    expectedExitCode?: number;
    expectedMainCContains?: string;
    expectedMainCNotContains?: string;
    emitCOnly?: boolean;
    nativeAddonManifest?: string;
    dynamicRequireManifest?: string;
    runtimeCodeManifest?: string;
    unsafeEval?: boolean;
    release?: boolean;
    runEnv?: Record<string, string>;
}

async function exists(p: string): Promise<boolean> {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function discoverCases(): Promise<Case[]> {
    const filterIdx = process.argv.indexOf('--filter');
    const filterStr = filterIdx >= 0 ? process.argv[filterIdx + 1] : undefined;

    const dirs = await fs.readdir(casesDir);
    const cases: Case[] = [];
    for (const d of dirs) {
        if (filterStr && !d.includes(filterStr)) continue;
        const entry = path.join(casesDir, d, "in.ts");
        const expectedPath = path.join(casesDir, d, "expected.stdout");
        const expectedStderrContainsPath = path.join(casesDir, d, "expected.stderr.contains");
        const expectedExitPath = path.join(casesDir, d, "expected.exitcode");
        const expectedMainCContainsPath = path.join(casesDir, d, "expected.mainc.contains");
        const expectedMainCNotContainsPath = path.join(casesDir, d, "expected.mainc.not_contains");
        const emitCOnlyPath = path.join(casesDir, d, "compile.emit_c_only");
        const nativeAddonManifestPath = path.join(casesDir, d, "native-addon-manifest.json");
        const dynamicRequireManifestPath = path.join(casesDir, d, "dynamic-require-manifest.json");
        const runtimeCodeManifestPath = path.join(casesDir, d, "runtime-code-manifest.json");
        const unsafeEvalPath = path.join(casesDir, d, "compile.unsafe_eval");
        const releasePath = path.join(casesDir, d, "compile.release");
        const runEnvPath = path.join(casesDir, d, "run.env");
        if (!(await exists(entry))) continue;

        const release = await exists(releasePath);
        const emitCOnly = await exists(emitCOnlyPath);
        const nativeAddonManifest = await exists(nativeAddonManifestPath)
            ? nativeAddonManifestPath
            : undefined;
        const dynamicRequireManifest = await exists(dynamicRequireManifestPath)
            ? dynamicRequireManifestPath
            : undefined;
        const runtimeCodeManifest = await exists(runtimeCodeManifestPath)
            ? runtimeCodeManifestPath
            : undefined;
        const unsafeEval = await exists(unsafeEvalPath);
        const expectedMainCContains = await exists(expectedMainCContainsPath)
            ? (await fs.readFile(expectedMainCContainsPath, "utf8")).trimEnd()
            : undefined;
        const expectedMainCNotContains = await exists(expectedMainCNotContainsPath)
            ? (await fs.readFile(expectedMainCNotContainsPath, "utf8")).trimEnd()
            : undefined;
        const expectedStderrContains = await exists(expectedStderrContainsPath)
            ? (await fs.readFile(expectedStderrContainsPath, "utf8")).trimEnd()
            : undefined;
        const runEnv = await exists(runEnvPath)
            ? parseRunEnv(await fs.readFile(runEnvPath, "utf8"), runEnvPath)
            : undefined;

        if (await exists(expectedExitPath)) {
            const raw = await fs.readFile(expectedExitPath, "utf8");
            const expectedExitCode = Number(raw.trim());
            if (!Number.isInteger(expectedExitCode)) {
                throw new Error(`invalid expected.exitcode for ${d}: ${raw.trim()}`);
            }
            cases.push({
                name: d,
                entry,
                expectedExitCode,
                expectedStderrContains,
                expectedMainCContains,
                expectedMainCNotContains,
                emitCOnly,
                nativeAddonManifest,
                dynamicRequireManifest,
                runtimeCodeManifest,
                unsafeEval,
                release,
                runEnv,
            });
            continue;
        }

        const expected = await exists(expectedPath)
            ? await fs.readFile(expectedPath, "utf8")
            : "";
        if (!emitCOnly && !(await exists(expectedPath))) {
            throw new Error(`missing expected.stdout or expected.exitcode for ${d}`);
        }
        cases.push({
            name: d,
            entry,
            expected,
            expectedStderrContains,
            expectedMainCContains,
            expectedMainCNotContains,
            emitCOnly,
            nativeAddonManifest,
            dynamicRequireManifest,
            runtimeCodeManifest,
            unsafeEval,
            release,
            runEnv,
        });
    }
    return cases.sort((a, b) => a.name.localeCompare(b.name));
}

function parseRunEnv(raw: string, filename: string): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [idx, rawLine] of raw.split(/\r?\n/).entries()) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) {
            throw new Error(`invalid run.env line ${idx + 1} in ${filename}`);
        }
        env[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return env;
}

function runBinary(bin: string, runEnv?: Record<string, string>): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const p = spawn(bin, [], { env: { ...process.env, ...runEnv }, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        p.stdout.on("data", (d) => (stdout += d.toString()));
        p.stderr.on("data", (d) => (stderr += d.toString()));
        p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

async function main(): Promise<void> {
    await ensureE2eNodeModuleFixtures();
    const cases = await discoverCases();
    if (cases.length === 0) {
        console.error("no e2e cases found");
        process.exit(1);
    }
    const tmpRoot = await fs.mkdtemp(path.join(require("node:os").tmpdir(), "tsc2c-e2e-"));
    let passed = 0;
    let failed = 0;
    for (const c of cases) {
        const bin = path.join(tmpRoot, c.name);
        const buildDir = path.join(tmpRoot, c.name + "-build");
        process.stdout.write(`e2e: ${c.name} … `);
        const r = await compile({
            entry: c.entry,
            output: bin,
            buildDir,
            noGc: process.env.TSC2C_NO_GC === "1",
            release: c.release,
            emitCOnly: c.emitCOnly,
            nativeAddonManifest: c.nativeAddonManifest,
            dynamicRequireManifest: c.dynamicRequireManifest,
            runtimeCodeManifest: c.runtimeCodeManifest,
            unsafeEval: c.unsafeEval,
        });
        if (c.expectedExitCode !== undefined) {
            if (r.exitCode !== c.expectedExitCode) {
                console.log(`EXIT MISMATCH (expected ${c.expectedExitCode}, got ${r.exitCode})`);
                failed++;
                continue;
            }
            console.log("OK");
            passed++;
            continue;
        }
        if (r.exitCode !== 0) {
            console.log("COMPILE FAIL (exit " + r.exitCode + ")");
            failed++;
            continue;
        }
        if (c.expectedMainCContains !== undefined) {
            const nativePkgNode = path.resolve(casesDir, "../../../node_modules/native-pkg/build/Release/native.node");
            const needle = c.expectedMainCContains
                .replaceAll("{{ENTRY}}", c.entry)
                .replaceAll("{{NATIVE_PKG_NODE}}", nativePkgNode);
            if (!r.mainC.includes(needle)) {
                console.log("MAINC MISSING EXPECTED SUBSTRING");
                console.log("---expected substring---");
                process.stdout.write(needle);
                console.log("---end---");
                failed++;
                continue;
            }
        }
        if (c.expectedMainCNotContains !== undefined) {
            const needles = c.expectedMainCNotContains.split(/\r?\n/).filter((line) => line.length > 0);
            const present = needles.find((needle) => r.mainC.includes(needle));
            if (present !== undefined) {
                console.log("MAINC CONTAINS FORBIDDEN SUBSTRING");
                console.log("---forbidden substring---");
                process.stdout.write(present);
                console.log("---end---");
                failed++;
                continue;
            }
        }
        if (c.emitCOnly) {
            console.log("OK");
            passed++;
            continue;
        }
        const run = await runBinary(bin, c.runEnv);
        if (run.code !== 0) {
            console.log(`RUN FAIL (exit ${run.code})`);
            if (run.stderr) console.log(run.stderr);
            failed++;
            continue;
        }
        if (c.expectedStderrContains !== undefined) {
            const needles = c.expectedStderrContains.split(/\r?\n/).filter((line) => line.length > 0);
            const missing = needles.find((needle) => !run.stderr.includes(needle));
            if (missing !== undefined) {
                console.log("STDERR MISSING EXPECTED SUBSTRING");
                console.log("---expected substring---");
                process.stdout.write(missing);
                console.log("---actual---");
                process.stdout.write(run.stderr);
                console.log("---end---");
                failed++;
                continue;
            }
        }
        if (run.stdout !== c.expected) {
            console.log("STDOUT MISMATCH");
            console.log("---expected---");
            process.stdout.write(c.expected ?? "");
            console.log("---actual---");
            process.stdout.write(run.stdout);
            console.log("---end---");
            failed++;
            continue;
        }
        console.log("OK");
        passed++;
    }
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
}

await main();
