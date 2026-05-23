#!/usr/bin/env bun
// Check benchmark result JSON against simple CI-friendly thresholds.
//
// Usage:
//   bun manual-tests/benchmarks/check-thresholds.ts [results.json]
//
// Optional thresholds:
//   MAX_BINARY_BYTES=2000000
//   MAX_TSC2C_MS=100
//   MIN_VS_BUN=0.75
//   MIN_VS_NODE=0.75

import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
const inputPath = process.argv[2] ?? join(HERE, "results.json");

type Backend = "tsc2c" | "bun" | "node";

interface Sample {
    backend: Backend;
    bench_ms: number;
}

interface CaseResult {
    name: string;
    c_binary_bytes?: number;
    samples: Sample[];
}

interface ResultsPayload {
    results: CaseResult[];
}

function envNumber(name: string): number | undefined {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new Error(`${name} must be a finite number, got ${raw}`);
    }
    return value;
}

function sample(result: CaseResult, backend: Backend): Sample | undefined {
    return result.samples.find((s) => s.backend === backend);
}

const maxBinaryBytes = envNumber("MAX_BINARY_BYTES");
const maxTsc2cMs = envNumber("MAX_TSC2C_MS");
const minVsBun = envNumber("MIN_VS_BUN");
const minVsNode = envNumber("MIN_VS_NODE");
const payload = JSON.parse(readFileSync(inputPath, "utf8")) as ResultsPayload;
const failures: string[] = [];

for (const result of payload.results) {
    const tsc2c = sample(result, "tsc2c");
    const bun = sample(result, "bun");
    const node = sample(result, "node");

    if (!tsc2c) {
        failures.push(`${result.name}: missing tsc2c sample`);
        continue;
    }
    if (maxBinaryBytes !== undefined) {
        if (result.c_binary_bytes === undefined) {
            failures.push(`${result.name}: missing c_binary_bytes`);
        } else if (result.c_binary_bytes > maxBinaryBytes) {
            failures.push(`${result.name}: binary ${result.c_binary_bytes} > MAX_BINARY_BYTES ${maxBinaryBytes}`);
        }
    }
    if (maxTsc2cMs !== undefined && tsc2c.bench_ms > maxTsc2cMs) {
        failures.push(`${result.name}: tsc2c ${tsc2c.bench_ms}ms > MAX_TSC2C_MS ${maxTsc2cMs}ms`);
    }
    if (minVsBun !== undefined && bun) {
        const ratio = bun.bench_ms / tsc2c.bench_ms;
        if (ratio < minVsBun) {
            failures.push(`${result.name}: vs bun ${ratio.toFixed(2)}x < MIN_VS_BUN ${minVsBun}x`);
        }
    }
    if (minVsNode !== undefined && node) {
        const ratio = node.bench_ms / tsc2c.bench_ms;
        if (ratio < minVsNode) {
            failures.push(`${result.name}: vs node ${ratio.toFixed(2)}x < MIN_VS_NODE ${minVsNode}x`);
        }
    }
}

if (failures.length > 0) {
    console.error(`benchmark threshold failures in ${inputPath}:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
}

console.log(`benchmark thresholds passed: ${inputPath}`);
