#!/usr/bin/env bun
/**
 * E2E runner: compile each case in tests/e2e/cases/<name>/in.ts, run the
 * resulting binary, diff stdout vs expected.stdout, and optionally assert a
 * stderr substring for opt-in diagnostics.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { compile, findDispatchLinkOptions } from "../../src/compile";
import { ensureE2eNodeModuleFixtures, referencesE2eNodeModuleFixture } from "./fixtures";
import { discoverE2eCaseManifest, e2eCasesDir as casesDir } from "./case-manifest";

interface Case {
    name: string;
    entry: string;
    generatedSource?: string;
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
    customConditions?: string[];
    runEnv?: Record<string, string>;
    /** compile.dispatch sidecar: case links libdispatch; skipped when absent. */
    dispatch?: boolean;
    /** compile.dispatch.serial sidecar: use the no-dependency serial backend. */
    dispatchSerial?: boolean;
    /** compile.dispatch.no_gc sidecar: keep threaded dispatch while disabling Boehm GC. */
    dispatchNoGc?: boolean;
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

    const cases: Case[] = [];
    for (const manifest of await discoverE2eCaseManifest(filterStr)) {
        const d = manifest.name;
        const entry = manifest.entry;
        const expectedPath = path.join(casesDir, d, "expected.stdout");
        const expectedMainCContainsPath = path.join(casesDir, d, "expected.mainc.contains");
        const expectedMainCNotContainsPath = path.join(casesDir, d, "expected.mainc.not_contains");
        const nativeAddonManifestPath = path.join(casesDir, d, "native-addon-manifest.json");
        const dynamicRequireManifestPath = path.join(casesDir, d, "dynamic-require-manifest.json");
        const runtimeCodeManifestPath = path.join(casesDir, d, "runtime-code-manifest.json");
        const customConditionsPath = path.join(casesDir, d, "compile.custom_conditions");
        const releasePath = path.join(casesDir, d, "compile.release");
        const runEnvPath = path.join(casesDir, d, "run.env");
        const release = await exists(releasePath);
        const dispatch = manifest.dispatch;
        const dispatchSerial = manifest.dispatchSerial;
        const dispatchNoGc = manifest.dispatchNoGc;
        const emitCOnly = manifest.emitCOnly;
        const nativeAddonManifest = await exists(nativeAddonManifestPath)
            ? nativeAddonManifestPath
            : undefined;
        const dynamicRequireManifest = await exists(dynamicRequireManifestPath)
            ? dynamicRequireManifestPath
            : undefined;
        const runtimeCodeManifest = await exists(runtimeCodeManifestPath)
            ? runtimeCodeManifestPath
            : undefined;
        const unsafeEval = manifest.unsafeEval;
        const customConditions = await exists(customConditionsPath)
            ? parseCustomConditions(await fs.readFile(customConditionsPath, "utf8"), customConditionsPath)
            : undefined;
        const expectedMainCContains = await exists(expectedMainCContainsPath)
            ? (await fs.readFile(expectedMainCContainsPath, "utf8")).trimEnd()
            : undefined;
        const expectedMainCNotContains = await exists(expectedMainCNotContainsPath)
            ? (await fs.readFile(expectedMainCNotContainsPath, "utf8")).trimEnd()
            : undefined;
        const expectedStderrContains = manifest.expectedStderrContains;
        const runEnv = await exists(runEnvPath)
            ? parseRunEnv(await fs.readFile(runEnvPath, "utf8"), runEnvPath)
            : undefined;

        if (manifest.expectedExitCode !== undefined) {
            cases.push({
                name: d,
                entry,
                generatedSource: manifest.generatedSource,
                expectedExitCode: manifest.expectedExitCode,
                expectedStderrContains,
                expectedMainCContains,
                expectedMainCNotContains,
                emitCOnly,
                nativeAddonManifest,
                dynamicRequireManifest,
                runtimeCodeManifest,
                unsafeEval,
                release,
                customConditions,
                runEnv,
                dispatch,
                dispatchSerial,
                dispatchNoGc,
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
            generatedSource: manifest.generatedSource,
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
            customConditions,
            runEnv,
            dispatch,
            dispatchSerial,
            dispatchNoGc,
        });
    }
    return cases.sort((a, b) => a.name.localeCompare(b.name));
}

function parseCustomConditions(raw: string, filename: string): string[] {
    const conditions = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
    if (conditions.some((condition) => condition.includes(","))) {
        throw new Error(`invalid compile.custom_conditions in ${filename}: use one condition per line`);
    }
    return conditions;
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

async function directoryReferencesNodeModuleFixture(directory: string): Promise<boolean> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (await directoryReferencesNodeModuleFixture(entryPath)) return true;
            continue;
        }
        if (!entry.isFile() || !/\.(?:[cm]?[jt]s|json)$/.test(entry.name)) continue;
        if (referencesE2eNodeModuleFixture(await fs.readFile(entryPath, "utf8"))) return true;
    }
    return false;
}

async function casesNeedNodeModuleFixtures(cases: readonly Case[]): Promise<boolean> {
    for (const c of cases) {
        if (c.generatedSource && referencesE2eNodeModuleFixture(c.generatedSource)) return true;
        if (await directoryReferencesNodeModuleFixture(path.dirname(c.entry))) return true;
    }
    return false;
}

async function main(): Promise<void> {
    const failOnSkip = process.argv.includes("--fail-on-skip");
    const cases = await discoverCases();
    if (cases.length === 0) {
        console.error("no e2e cases found");
        process.exit(1);
    }
    if (await casesNeedNodeModuleFixtures(cases)) {
        await ensureE2eNodeModuleFixtures();
    }
    const tmpRoot = await fs.mkdtemp(path.join(require("node:os").tmpdir(), "tsc2c-e2e-"));
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const dispatchAvailable = findDispatchLinkOptions() !== null;
    for (const c of cases) {
        const bin = path.join(tmpRoot, c.name);
        const buildDir = path.join(tmpRoot, c.name + "-build");
        const entry = c.generatedSource === undefined
            ? c.entry
            : path.join(tmpRoot, c.name + ".ts");
        if (c.generatedSource !== undefined) {
            await fs.writeFile(entry, c.generatedSource);
        }
        process.stdout.write(`e2e: ${c.name} … `);
        if (c.dispatch && !c.dispatchSerial && !dispatchAvailable) {
            console.log("SKIP (libdispatch not installed)");
            skipped++;
            continue;
        }
        let compileStderr = "";
        const originalStderrWrite = process.stderr.write;
        process.stderr.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
            compileStderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
            return (originalStderrWrite as (...writeArgs: unknown[]) => boolean).call(process.stderr, chunk, ...args);
        }) as typeof process.stderr.write;
        let r;
        try {
            r = await compile({
                entry,
                output: bin,
                buildDir,
                noGc: c.dispatch && !c.dispatchSerial ? c.dispatchNoGc : process.env.TSC2C_NO_GC === "1",
                dispatch: c.dispatch ? (c.dispatchSerial ? "serial" : "threaded") : undefined,
                release: c.release,
                emitCOnly: c.emitCOnly,
                nativeAddonManifest: c.nativeAddonManifest,
                dynamicRequireManifest: c.dynamicRequireManifest,
                runtimeCodeManifest: c.runtimeCodeManifest,
                unsafeEval: c.unsafeEval,
                customConditions: c.customConditions,
            });
        } finally {
            process.stderr.write = originalStderrWrite;
        }
        if (c.expectedExitCode !== undefined) {
            if (r.exitCode !== c.expectedExitCode) {
                console.log(`EXIT MISMATCH (expected ${c.expectedExitCode}, got ${r.exitCode})`);
                failed++;
                continue;
            }
            if (c.expectedStderrContains !== undefined) {
                const needles = c.expectedStderrContains.split(/\r?\n/).filter((line) => line.length > 0);
                const missing = needles.find((needle) => !compileStderr.includes(needle));
                if (missing !== undefined) {
                    console.log("COMPILE STDERR MISSING EXPECTED SUBSTRING");
                    console.log("---expected substring---");
                    process.stdout.write(missing);
                    console.log("---captured compile stderr---");
                    process.stdout.write(compileStderr);
                    console.log("---end---");
                    failed++;
                    continue;
                }
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
            const needles = c.expectedMainCContains
                .replaceAll("{{ENTRY}}", c.entry)
                .replaceAll("{{NATIVE_PKG_NODE}}", nativePkgNode)
                .split(/\r?\n/)
                .filter((line) => line.length > 0);
            const missing = needles.find((needle) => !r.mainC.includes(needle));
            if (missing !== undefined) {
                console.log("MAINC MISSING EXPECTED SUBSTRING");
                console.log("---expected substring---");
                process.stdout.write(missing);
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
    console.log(`\n${passed} passed, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ""}`);
    process.exit(failed === 0 && (!failOnSkip || skipped === 0) ? 0 : 1);
}

await main();
