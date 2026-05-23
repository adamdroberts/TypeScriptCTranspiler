#!/usr/bin/env bun
// Run a short benchmark smoke suitable for local CI jobs.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = import.meta.dir;
const ROOT = join(HERE, "..", "..");
const tempDir = mkdtempSync(join(tmpdir(), "tsc2c-bench-ci-"));
const resultsFile = join(tempDir, "results.json");
const policyFile = process.env.BENCH_POLICY ?? join(HERE, "thresholds-smoke.json");

function run(cmd: string, args: string[], env: Record<string, string>): void {
    const result = spawnSync(cmd, args, {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, ...env },
    });
    if (result.status !== 0 || result.signal !== null) {
        process.exit(result.status ?? 1);
    }
}

try {
    run("bun", ["manual-tests/benchmarks/run.ts", "arith"], {
        RESULTS_FILE: resultsFile,
        RUNS: process.env.RUNS ?? "1",
        FORCE: "1",
        TSC2C_FLAGS: process.env.TSC2C_FLAGS ?? "--no-gc",
    });
    run("bun", ["manual-tests/benchmarks/check-thresholds.ts", resultsFile, policyFile], {});
} finally {
    rmSync(tempDir, { recursive: true, force: true });
}
