#!/usr/bin/env bun
// Check benchmark result JSON against simple CI-friendly thresholds.
//
// Usage:
//   bun manual-tests/benchmarks/check-thresholds.ts [results.json]
//   bun manual-tests/benchmarks/check-thresholds.ts [results.json] [policy.json]
//
// Optional env overrides:
//   MAX_BINARY_BYTES=2000000
//   MAX_TSC2C_MS=100
//   MIN_VS_BUN=0.75
//   MIN_VS_NODE=0.75

import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
const inputPath = process.argv[2] ?? join(HERE, "results.json");
const policyPath = process.argv[3] ?? process.env.BENCH_POLICY;

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

interface ThresholdPolicy {
    max_binary_bytes?: number;
    max_tsc2c_ms?: number;
    min_vs_bun?: number;
    min_vs_node?: number;
}

function finiteNumber(name: string, value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "number" && typeof value !== "string") {
        throw new Error(`${name} must be a finite number, got ${typeof value}`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${name} must be a finite number, got ${value}`);
    }
    return parsed;
}

function envNumber(name: string): number | undefined {
    const raw = process.env[name];
    return finiteNumber(name, raw);
}

function sample(result: CaseResult, backend: Backend): Sample | undefined {
    return result.samples.find((s) => s.backend === backend);
}

const policy = policyPath
    ? JSON.parse(readFileSync(policyPath, "utf8")) as ThresholdPolicy
    : {};
const maxBinaryBytes = envNumber("MAX_BINARY_BYTES") ?? finiteNumber("max_binary_bytes", policy.max_binary_bytes);
const maxTsc2cMs = envNumber("MAX_TSC2C_MS") ?? finiteNumber("max_tsc2c_ms", policy.max_tsc2c_ms);
const minVsBun = envNumber("MIN_VS_BUN") ?? finiteNumber("min_vs_bun", policy.min_vs_bun);
const minVsNode = envNumber("MIN_VS_NODE") ?? finiteNumber("min_vs_node", policy.min_vs_node);
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
