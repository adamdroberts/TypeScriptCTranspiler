#!/usr/bin/env bun
// manual-tests/benchmarks/run.ts
// Compare self-timed inner-loop performance of each benchmark across:
//   • tsc2c     — TypeScript -> C -> native binary (gcc --release, --no-gc)
//   • bun       — TypeScript run directly under Bun's JSC engine
//   • node      — TypeScript bundled to JS by `bun build --target=node`, run under V8
//
// Each .ts in cases/ self-times its inner work with Date.now() and prints
//   BENCH:<name>:<elapsed_ms>:<checksum>
// to stdout. The harness records the elapsed_ms reported, plus the wall-clock
// time of each child process (for context).
//
// Usage:
//   bun manual-tests/benchmarks/run.ts                   # all cases
//   bun manual-tests/benchmarks/run.ts arith json         # subset
//   RUNS=5 FORCE=1 bun manual-tests/benchmarks/run.ts     # 5 runs, rebuild
//   BUN=/path/to/bun NODE=/path/to/node bun ...           # override binaries

import { spawnSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
const ROOT = join(HERE, "..", "..");
const TSC2C = join(ROOT, "bin", "tsc2c");
const CASES_DIR = join(HERE, "cases");
const BUILD_DIR = join(HERE, "build");
const RESULTS_FILE = join(HERE, "results.json");

const RUNS = Math.max(1, Number(process.env.RUNS ?? "3"));
const FORCE = process.env.FORCE === "1";
const BUN = process.env.BUN ?? "bun";
const NODE = process.env.NODE ?? "node";
const TSC2C_FLAGS = (process.env.TSC2C_FLAGS ?? "").split(/\s+/).filter(Boolean);
const filter = process.argv.slice(2);

mkdirSync(BUILD_DIR, { recursive: true });

type Backend = "tsc2c" | "bun" | "node";

interface Sample {
    backend: Backend;
    bench_ms: number;
    wall_ms: number;
    checksum: string;
}

interface CaseResult {
    name: string;
    compile_ms?: number;
    bundle_ms?: number;
    samples: Sample[];
    notes: string[];
}

interface RunOutcome {
    ok: boolean;
    wall_ms: number;
    stdout: string;
    stderr: string;
}

function timeRun(cmd: string, args: string[]): RunOutcome {
    const t0 = performance.now();
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    const wall_ms = performance.now() - t0;
    return {
        ok: r.status === 0 && r.signal === null,
        wall_ms,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
    };
}

function parseBench(stdout: string, name: string): { bench_ms: number; checksum: string } | null {
    const prefix = "BENCH:" + name + ":";
    const line = stdout.split("\n").find((l) => l.startsWith(prefix));
    if (!line) return null;
    const rest = line.slice(prefix.length);
    const sep = rest.indexOf(":");
    const ms = sep < 0 ? rest : rest.slice(0, sep);
    const cs = sep < 0 ? "" : rest.slice(sep + 1);
    const v = parseFloat(ms);
    if (!isFinite(v)) return null;
    return { bench_ms: v, checksum: cs };
}

function bestOf(name: string, backend: Backend, run: () => RunOutcome, notes: string[]): Sample | null {
    let best: Sample | null = null;
    for (let i = 0; i < RUNS; i++) {
        const r = run();
        if (!r.ok) {
            notes.push(`[${backend}] non-zero exit on run ${i + 1}: ${r.stderr.split("\n")[0]}`);
            return null;
        }
        const parsed = parseBench(r.stdout, name);
        if (!parsed) {
            notes.push(`[${backend}] no BENCH line on run ${i + 1}: ${r.stdout.split("\n")[0]}`);
            return null;
        }
        const s: Sample = { backend, bench_ms: parsed.bench_ms, wall_ms: r.wall_ms, checksum: parsed.checksum };
        if (best === null || s.bench_ms < best.bench_ms) best = s;
    }
    return best;
}

const allCases = readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.slice(0, -3))
    .sort();
const targets = filter.length === 0 ? allCases : allCases.filter((c) => filter.includes(c));

if (targets.length === 0) {
    console.error("no matching cases. available: " + allCases.join(", "));
    process.exit(1);
}

console.error(`benchmarks: ${targets.length} case(s), ${RUNS} run(s) per backend`);
console.error(`tsc2c flags: ${TSC2C_FLAGS.join(" ")}`);
console.error("");

const results: CaseResult[] = [];

for (const name of targets) {
    const tsFile = join(CASES_DIR, name + ".ts");
    const cBin = join(BUILD_DIR, name + ".bin");
    const jsBundle = join(BUILD_DIR, name + ".js");
    const notes: string[] = [];
    let compile_ms: number | undefined;
    let bundle_ms: number | undefined;

    let cBinReady = existsSync(cBin) && !FORCE;
    if (!cBinReady) {
        process.stderr.write(`[compile] tsc2c ${name} ... `);
        const r = timeRun(TSC2C, [tsFile, "-o", cBin, ...TSC2C_FLAGS]);
        compile_ms = r.wall_ms;
        if (r.ok) {
            cBinReady = true;
            process.stderr.write(`ok (${r.wall_ms.toFixed(0)} ms)\n`);
        } else {
            process.stderr.write(`FAIL\n${r.stderr}\n`);
            notes.push("tsc2c compile failed: " + r.stderr.split("\n").slice(0, 3).join(" | "));
        }
    }

    let jsReady = existsSync(jsBundle) && !FORCE;
    if (!jsReady) {
        process.stderr.write(`[bundle ] bun build ${name} ... `);
        const r = timeRun(BUN, ["build", tsFile, "--target=node", "--outfile", jsBundle]);
        bundle_ms = r.wall_ms;
        if (r.ok) {
            jsReady = true;
            process.stderr.write(`ok (${r.wall_ms.toFixed(0)} ms)\n`);
        } else {
            process.stderr.write(`FAIL\n${r.stderr}\n`);
            notes.push("bun build failed: " + r.stderr.split("\n").slice(0, 3).join(" | "));
        }
    }

    process.stderr.write(`[run    ] ${name} `);
    const samples: Sample[] = [];

    if (cBinReady) {
        const s = bestOf(name, "tsc2c", () => timeRun(cBin, []), notes);
        if (s) samples.push(s);
        process.stderr.write("c");
    }
    {
        const s = bestOf(name, "bun", () => timeRun(BUN, [tsFile]), notes);
        if (s) samples.push(s);
        process.stderr.write("b");
    }
    if (jsReady) {
        const s = bestOf(name, "node", () => timeRun(NODE, [jsBundle]), notes);
        if (s) samples.push(s);
        process.stderr.write("n");
    }
    process.stderr.write("\n");

    // Sanity: verify checksums match across backends (correctness guard).
    const checksums = new Set(samples.map((s) => s.checksum));
    if (checksums.size > 1) {
        notes.push("checksum mismatch across backends: " + samples.map((s) => `${s.backend}=${s.checksum}`).join(", "));
    }

    results.push({ name, compile_ms, bundle_ms, samples, notes });
}

const payload = {
    when: new Date().toISOString(),
    runs_per_backend: RUNS,
    tsc2c_flags: TSC2C_FLAGS,
    results,
};
writeFileSync(RESULTS_FILE, JSON.stringify(payload, null, 2));

// ---------- table ----------
function fmt(n: number | undefined, w: number): string {
    if (n === undefined || !isFinite(n)) return "—".padStart(w);
    if (n >= 1000) return n.toFixed(0).padStart(w);
    if (n >= 100) return n.toFixed(1).padStart(w);
    return n.toFixed(2).padStart(w);
}
function fmtRatio(n: number | undefined, w: number): string {
    if (n === undefined || !isFinite(n)) return "—".padStart(w);
    return (n.toFixed(2) + "×").padStart(w);
}
function pad(s: string, w: number): string { return s.padEnd(w); }

const cols = [
    { label: "benchmark",   w: 18, kind: "label" as const },
    { label: "tsc2c (ms)",  w: 12, kind: "num"   as const },
    { label: "bun (ms)",    w: 12, kind: "num"   as const },
    { label: "node (ms)",   w: 12, kind: "num"   as const },
    { label: "vs bun",      w: 10, kind: "ratio" as const },
    { label: "vs node",     w: 10, kind: "ratio" as const },
];

console.log("");
console.log("Inner-loop self-timed best of " + RUNS + " runs (lower is faster):");
console.log("");
console.log(cols.map((c) => c.kind === "label" ? pad(c.label, c.w) : c.label.padStart(c.w)).join("  "));
console.log(cols.map((c) => "-".repeat(c.w)).join("  "));

const ratiosBun: number[] = [];
const ratiosNode: number[] = [];

for (const r of results) {
    const t = r.samples.find((s) => s.backend === "tsc2c");
    const b = r.samples.find((s) => s.backend === "bun");
    const n = r.samples.find((s) => s.backend === "node");
    const vsBun  = (b && t && t.bench_ms > 0) ? b.bench_ms / t.bench_ms : undefined;
    const vsNode = (n && t && t.bench_ms > 0) ? n.bench_ms / t.bench_ms : undefined;
    if (vsBun  !== undefined) ratiosBun.push(vsBun);
    if (vsNode !== undefined) ratiosNode.push(vsNode);

    console.log([
        pad(r.name, cols[0].w),
        fmt(t?.bench_ms, cols[1].w),
        fmt(b?.bench_ms, cols[2].w),
        fmt(n?.bench_ms, cols[3].w),
        fmtRatio(vsBun, cols[4].w),
        fmtRatio(vsNode, cols[5].w),
    ].join("  "));
}

function geomean(xs: number[]): number {
    const ys = xs.filter((x) => isFinite(x) && x > 0);
    if (ys.length === 0) return NaN;
    let s = 0;
    for (const x of ys) s += Math.log(x);
    return Math.exp(s / ys.length);
}

console.log(cols.map((c) => "-".repeat(c.w)).join("  "));
console.log([
    pad("geomean", cols[0].w),
    "".padStart(cols[1].w),
    "".padStart(cols[2].w),
    "".padStart(cols[3].w),
    fmtRatio(geomean(ratiosBun), cols[4].w),
    fmtRatio(geomean(ratiosNode), cols[5].w),
].join("  "));

console.log("");
const anyNotes = results.filter((r) => r.notes.length > 0);
if (anyNotes.length > 0) {
    console.log("notes:");
    for (const r of anyNotes) for (const note of r.notes) console.log(`  ${r.name}: ${note}`);
    console.log("");
}
console.log(`vs bun / vs node = factor by which tsc2c is faster (bun_ms / tsc2c_ms).`);
console.log(`results JSON: ${RESULTS_FILE}`);
