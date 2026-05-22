#!/usr/bin/env bun
/**
 * E2E runner: compile each case in tests/e2e/cases/<name>/in.ts, run the
 * resulting binary, diff stdout vs expected.stdout.
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
    expectedExitCode?: number;
    expectedMainCContains?: string;
    emitCOnly?: boolean;
    nativeAddonManifest?: string;
    dynamicRequireManifest?: string;
    runtimeCodeManifest?: string;
    release?: boolean;
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
        const expectedExitPath = path.join(casesDir, d, "expected.exitcode");
        const expectedMainCContainsPath = path.join(casesDir, d, "expected.mainc.contains");
        const emitCOnlyPath = path.join(casesDir, d, "compile.emit_c_only");
        const nativeAddonManifestPath = path.join(casesDir, d, "native-addon-manifest.json");
        const dynamicRequireManifestPath = path.join(casesDir, d, "dynamic-require-manifest.json");
        const runtimeCodeManifestPath = path.join(casesDir, d, "runtime-code-manifest.json");
        const releasePath = path.join(casesDir, d, "compile.release");
        try {
            await fs.access(entry);
            let release = false;
            try {
                await fs.access(releasePath);
                release = true;
            } catch {
                // default debug/speed build
            }
            let emitCOnly = false;
            try {
                await fs.access(emitCOnlyPath);
                emitCOnly = true;
            } catch {
                // default compile-and-run case
            }
            let nativeAddonManifest: string | undefined;
            try {
                await fs.access(nativeAddonManifestPath);
                nativeAddonManifest = nativeAddonManifestPath;
            } catch {
                // optional native-addon allow-list
            }
            let dynamicRequireManifest: string | undefined;
            try {
                await fs.access(dynamicRequireManifestPath);
                dynamicRequireManifest = dynamicRequireManifestPath;
            } catch {
                // optional dynamic require allow-list
            }
            let runtimeCodeManifest: string | undefined;
            try {
                await fs.access(runtimeCodeManifestPath);
                runtimeCodeManifest = runtimeCodeManifestPath;
            } catch {
                // optional runtime code allow-list
            }
            let expectedMainCContains: string | undefined;
            try {
                expectedMainCContains = (await fs.readFile(expectedMainCContainsPath, "utf8")).trimEnd();
            } catch {
                // optional generated-C assertion
            }
            try {
                const raw = await fs.readFile(expectedExitPath, "utf8");
                cases.push({
                    name: d,
                    entry,
                    expectedExitCode: Number(raw.trim()),
                    expectedMainCContains,
                    emitCOnly,
                    nativeAddonManifest,
                    dynamicRequireManifest,
                    runtimeCodeManifest,
                    release,
                });
                continue;
            } catch {
                // fall through to positive stdout case
            }
            let expected = "";
            try {
                expected = await fs.readFile(expectedPath, "utf8");
            } catch {
                if (!emitCOnly) throw new Error(`missing expected.stdout for ${d}`);
            }
            cases.push({
                name: d,
                entry,
                expected,
                expectedMainCContains,
                emitCOnly,
                nativeAddonManifest,
                dynamicRequireManifest,
                runtimeCodeManifest,
                release,
            });
        } catch {
            // ignore non-case dirs
        }
    }
    return cases.sort((a, b) => a.name.localeCompare(b.name));
}

function runBinary(bin: string): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const p = spawn(bin, [], { stdio: ["ignore", "pipe", "pipe"] });
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
        if (c.emitCOnly) {
            console.log("OK");
            passed++;
            continue;
        }
        const run = await runBinary(bin);
        if (run.code !== 0) {
            console.log(`RUN FAIL (exit ${run.code})`);
            if (run.stderr) console.log(run.stderr);
            failed++;
            continue;
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
