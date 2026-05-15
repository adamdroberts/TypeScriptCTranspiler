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
//   bun manual-tests/benchmarks/run.ts --full             # manual + generated e2e operation benchmarks
//   BENCH_SOURCE=e2e RUNS=1 FORCE=1 bun ...              # generated e2e operation benchmarks
//   BENCH_SOURCE=all bun ...                             # manual + generated e2e operation benchmarks
//   BUN=/path/to/bun NODE=/path/to/node bun ...           # override binaries

import { spawnSync } from "node:child_process";
import { closeSync, cpSync, existsSync, mkdtempSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const HERE = import.meta.dir;
const ROOT = join(HERE, "..", "..");
const TSC2C = join(ROOT, "bin", "tsc2c");
const CASES_DIR = join(HERE, "cases");
const E2E_CASES_DIR = join(ROOT, "tests", "e2e", "cases");
const BUILD_DIR = join(HERE, "build");
const GENERATED_E2E_DIR = join(BUILD_DIR, "generated-e2e");
const RESULTS_FILE = process.env.RESULTS_FILE ?? join(HERE, "results.json");

const rawArgs = process.argv.slice(2);
const FULL = rawArgs.includes("--full");
const RUNS = Math.max(1, Number(process.env.RUNS ?? "3"));
const FULL_ITERS = Math.max(1, Number(process.env.FULL_ITERS ?? "1000"));
const FORCE = process.env.FORCE === "1";
const BUN = process.env.BUN ?? "bun";
const NODE = process.env.NODE ?? "node";
const TSC2C_FLAGS = (process.env.TSC2C_FLAGS ?? "").split(/\s+/).filter(Boolean);
const BENCH_SOURCE = process.env.BENCH_SOURCE ?? (FULL ? "all" : process.env.E2E === "1" ? "e2e" : "manual");
const RUN_TIMEOUT_MS = Math.max(0, Number(process.env.RUN_TIMEOUT_MS ?? "15000"));
const filter = rawArgs.filter((arg) => arg !== "--full");

mkdirSync(BUILD_DIR, { recursive: true });

type Backend = "tsc2c" | "bun" | "node";
type Metric = "self" | "wall";

interface BenchCase {
    name: string;
    tsFile: string;
    mode: Metric;
    expectedStdout?: string;
    release?: boolean;
}

interface Sample {
    backend: Backend;
    bench_ms: number;
    wall_ms: number;
    checksum: string;
    ops?: number;
    ops_per_sec?: number;
}

interface CaseResult {
    name: string;
    mode: Metric;
    compile_ms?: number;
    bundle_ms?: number;
    samples: Sample[];
    notes: string[];
}

interface RunOutcome {
    ok: boolean;
    code: number | null;
    signal: NodeJS.Signals | null;
    error?: string;
    wall_ms: number;
    stdout: string;
    stderr: string;
}

function timeRun(cmd: string, args: string[], captureStdoutViaFile = false, timeoutMs = 0): RunOutcome {
    const t0 = performance.now();
    let stdoutPath: string | undefined;
    let stdoutFd: number | undefined;
    if (captureStdoutViaFile) {
        stdoutPath = join(mkdtempSync(join(tmpdir(), "tsc2c-bench-stdout-")), "stdout.txt");
        stdoutFd = openSync(stdoutPath, "w+");
    }
    const r = spawnSync(cmd, args, {
        encoding: "utf8",
        stdio: captureStdoutViaFile ? ["ignore", stdoutFd!, "pipe"] : ["ignore", "pipe", "pipe"],
        timeout: timeoutMs > 0 ? timeoutMs : undefined,
    });
    const wall_ms = performance.now() - t0;
    let stdout = r.stdout ?? "";
    if (captureStdoutViaFile) {
        closeSync(stdoutFd!);
        stdout = readFileSync(stdoutPath!, "utf8");
        rmSync(stdoutPath!, { force: true });
    }
    return {
        ok: r.status === 0 && r.signal === null,
        code: r.status,
        signal: r.signal,
        error: r.error?.message,
        wall_ms,
        stdout,
        stderr: r.stderr ?? "",
    };
}

function parseBench(stdout: string, name: string): { bench_ms: number; checksum: string; ops?: number } | null {
    const prefix = "BENCH:" + name + ":";
    const line = stdout.split("\n").find((l) => l.startsWith(prefix));
    if (!line) return null;
    const rest = line.slice(prefix.length);
    const parts = rest.split(":");
    const ms = parts[0] ?? "";
    const cs = parts[1] ?? "";
    const v = parseFloat(ms);
    if (!isFinite(v)) return null;
    const ops = parts.length >= 3 ? Number(parts[2]) : undefined;
    return { bench_ms: v, checksum: cs, ops: ops !== undefined && isFinite(ops) && ops > 0 ? ops : undefined };
}

function checksumText(s: string): string {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16);
}

function validateRun(c: BenchCase, backend: Backend, r: RunOutcome, runNo: number, notes: string[]): boolean {
    if (r.signal !== null || r.code !== 0) {
        notes.push(
            `[${backend}] non-zero exit on run ${runNo}: ` +
            `code=${r.code ?? "null"} signal=${r.signal ?? "null"}` +
            `${r.error ? ` error=${r.error}` : ""} ${r.stderr.split("\n")[0] ?? ""}`.trimEnd(),
        );
        return false;
    }
    if (c.expectedStdout !== undefined && r.stdout !== c.expectedStdout) {
        notes.push(`[${backend}] stdout mismatch on run ${runNo}: expected ${c.expectedStdout.length} byte(s), got ${r.stdout.length} byte(s)`);
        return false;
    }
    return true;
}

function bestOf(c: BenchCase, backend: Backend, run: () => RunOutcome, notes: string[]): Sample | null {
    let best: Sample | null = null;
    for (let i = 0; i < RUNS; i++) {
        const r = run();
        if (!validateRun(c, backend, r, i + 1, notes)) {
            return null;
        }
        let bench_ms: number;
        let checksum: string;
        if (c.mode === "self") {
            const parsed = parseBench(r.stdout, c.name);
            if (!parsed) {
                notes.push(`[${backend}] no BENCH line on run ${i + 1}: ${r.stdout.split("\n")[0]}`);
                return null;
            }
            bench_ms = parsed.bench_ms;
            checksum = parsed.checksum;
            const ops = parsed.ops;
            const s: Sample = {
                backend,
                bench_ms,
                wall_ms: r.wall_ms,
                checksum,
                ops,
                ops_per_sec: ops !== undefined && bench_ms > 0 ? (ops * 1000) / bench_ms : undefined,
            };
            if (best === null || s.bench_ms < best.bench_ms) best = s;
            continue;
        } else {
            bench_ms = r.wall_ms;
            checksum = checksumText(r.stdout);
        }
        const s: Sample = { backend, bench_ms, wall_ms: r.wall_ms, checksum };
        if (best === null || s.bench_ms < best.bench_ms) best = s;
    }
    return best;
}

function discoverManualCases(): BenchCase[] {
    return readdirSync(CASES_DIR)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => f.slice(0, -3))
        .sort()
        .map((name) => ({
            name,
            tsFile: join(CASES_DIR, name + ".ts"),
            mode: "self" as const,
        }));
}

function emitGeneratedE2eSource(name: string, sourceText: string): string {
    const sf = ts.createSourceFile("in.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const shouldEvaluateForSink = (expr: ts.Expression): boolean => {
        return !(
            ts.isStringLiteral(expr) ||
            ts.isNoSubstitutionTemplateLiteral(expr) ||
            ts.isNumericLiteral(expr) ||
            expr.kind === ts.SyntaxKind.TrueKeyword ||
            expr.kind === ts.SyntaxKind.FalseKeyword ||
            expr.kind === ts.SyntaxKind.NullKeyword ||
            ts.isObjectLiteralExpression(expr) ||
            ts.isArrayLiteralExpression(expr) ||
            ts.isRegularExpressionLiteral(expr)
        );
    };
    const outputCallInfo = (node: ts.CallExpression): { args: readonly ts.Expression[]; returnsBoolean: boolean } | null => {
        const expr = node.expression;
        if (!ts.isPropertyAccessExpression(expr)) return null;
        const method = expr.name.text;
        const recv = expr.expression;
        const isConsole =
            (method === "log" || method === "error" || method === "warn" || method === "info") &&
            ts.isIdentifier(recv) &&
            recv.text === "console";
        const isProcessWrite =
            method === "write" &&
            ts.isPropertyAccessExpression(recv) &&
            (recv.name.text === "stdout" || recv.name.text === "stderr") &&
            ts.isIdentifier(recv.expression) &&
            recv.expression.text === "process";
        if (!isConsole && !isProcessWrite) return null;
        return { args: node.arguments, returnsBoolean: isProcessWrite };
    };
    const checksumAssignment = (amount: number): ts.Expression => {
        return ts.factory.createBinaryExpression(
            ts.factory.createIdentifier("__benchChecksum"),
            ts.SyntaxKind.PlusEqualsToken,
            ts.factory.createNumericLiteral(amount.toString()),
        );
    };
    const sinkExpression = (args: readonly ts.Expression[], returnsBoolean: boolean): ts.Expression => {
        const assignment = checksumAssignment(args.length);
        if (!returnsBoolean) return assignment;
        return ts.factory.createParenthesizedExpression(ts.factory.createCommaListExpression([assignment, ts.factory.createTrue()]));
    };
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        const visit: ts.Visitor = (node) => {
            if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
                const info = outputCallInfo(node.expression);
                if (info) {
                    const statements: ts.Statement[] = [];
                    for (const arg of info.args) {
                        const value = ts.isSpreadElement(arg) ? arg.expression : arg;
                        if (!shouldEvaluateForSink(value)) continue;
                        statements.push(ts.factory.createExpressionStatement(ts.factory.createVoidExpression(value)));
                    }
                    statements.push(ts.factory.createExpressionStatement(checksumAssignment(info.args.length)));
                    return statements;
                }
            }
            if (ts.isCallExpression(node)) {
                const info = outputCallInfo(node);
                if (info) {
                    return sinkExpression(info.args, info.returnsBoolean);
                }
            }
            return ts.visitEachChild(node, visit, context);
        };
        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    };
    const transformed = ts.transform(sf, [transformer]).transformed[0]!;
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const imports: string[] = [];
    const hoisted: string[] = [];
    const body: string[] = [];
    for (const stmt of transformed.statements) {
        if (ts.isImportDeclaration(stmt)) {
            imports.push(printer.printNode(ts.EmitHint.Unspecified, stmt, transformed));
        } else if (ts.isModuleDeclaration(stmt)) {
            hoisted.push(printer.printNode(ts.EmitHint.Unspecified, stmt, transformed));
        } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt)) {
            hoisted.push(printer.printNode(ts.EmitHint.Unspecified, stmt, transformed));
        } else if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
            const fn = ts.factory.createFunctionExpression(
                stmt.modifiers,
                stmt.asteriskToken,
                undefined,
                stmt.typeParameters,
                stmt.parameters,
                stmt.type,
                stmt.body,
            );
            const decl = ts.factory.createVariableStatement(
                undefined,
                ts.factory.createVariableDeclarationList(
                    [ts.factory.createVariableDeclaration(stmt.name, undefined, undefined, fn)],
                    ts.NodeFlags.Const,
                ),
            );
            body.push(printer.printNode(ts.EmitHint.Unspecified, decl, transformed));
        } else {
            body.push(printer.printNode(ts.EmitHint.Unspecified, stmt, transformed));
        }
    }
    return [
        ...imports,
        ...hoisted,
        "",
        "let __benchChecksum = 0;",
        "function __benchCase(): void {",
        ...body.map((line) => line.split("\n").map((part) => "    " + part).join("\n")),
        "}",
        `const __benchIterations = ${FULL_ITERS};`,
        "const __benchStart = process.hrtime();",
        "for (let __benchI = 0; __benchI < __benchIterations; __benchI++) {",
        "    __benchCase();",
        "}",
        "const __benchElapsed = process.hrtime(__benchStart);",
        "const __benchElapsedMs = __benchElapsed[0] * 1000 + __benchElapsed[1] / 1000000;",
        `console.log("BENCH:${name}:" + __benchElapsedMs + ":" + __benchChecksum + ":" + __benchIterations);`,
        "",
    ].join("\n");
}

function prepareGeneratedE2eCase(name: string, sourceDir: string, sourceFile: string): string {
    const outDir = join(GENERATED_E2E_DIR, name);
    const outFile = join(outDir, "in.bench.ts");
    if (!existsSync(outFile) || FORCE) {
        rmSync(outDir, { recursive: true, force: true });
        cpSync(sourceDir, outDir, {
            recursive: true,
            force: true,
            filter: (src) => !src.endsWith("/expected.stdout") && !src.endsWith("/expected.exitcode"),
        });
        const generated = emitGeneratedE2eSource(`e2e/${name}`, readFileSync(sourceFile, "utf8"));
        writeFileSync(outFile, generated);
    }
    return outFile;
}

function discoverE2eCases(): BenchCase[] {
    return readdirSync(E2E_CASES_DIR)
        .sort()
        .flatMap((name) => {
            const dir = join(E2E_CASES_DIR, name);
            const tsFile = join(dir, "in.ts");
            const expectedPath = join(dir, "expected.stdout");
            if (!existsSync(tsFile) || !existsSync(expectedPath)) return [];
            return [{
                name: `e2e/${name}`,
                tsFile: prepareGeneratedE2eCase(name, dir, tsFile),
                mode: "self" as const,
                release: existsSync(join(dir, "compile.release")),
            }];
        });
}

const allCases = (
    BENCH_SOURCE === "manual" ? discoverManualCases() :
    BENCH_SOURCE === "e2e" ? discoverE2eCases() :
    BENCH_SOURCE === "all" ? [...discoverManualCases(), ...discoverE2eCases()] :
    (() => {
        console.error(`unknown BENCH_SOURCE=${BENCH_SOURCE}; expected manual, e2e, or all`);
        process.exit(1);
    })()
)
    .sort((a, b) => a.name.localeCompare(b.name));
const targets = filter.length === 0
    ? allCases
    : allCases.filter((c) => filter.includes(c.name) || filter.includes(c.name.replace(/^e2e\//, "")));

if (targets.length === 0) {
    console.error("no matching cases. available: " + allCases.map((c) => c.name).join(", "));
    process.exit(1);
}

console.error(`benchmarks: ${targets.length} case(s), ${RUNS} run(s) per backend, source=${BENCH_SOURCE}`);
if (BENCH_SOURCE === "e2e" || BENCH_SOURCE === "all") console.error(`full e2e iterations per generated case: ${FULL_ITERS}`);
console.error(`tsc2c flags: ${TSC2C_FLAGS.join(" ")}`);
console.error("");

const results: CaseResult[] = [];

for (const c of targets) {
    const name = c.name;
    const buildName = name.replace(/[^a-zA-Z0-9_.-]+/g, "__");
    const cBin = join(BUILD_DIR, buildName + ".bin");
    const jsBundle = join(BUILD_DIR, buildName + ".js");
    const notes: string[] = [];
    let compile_ms: number | undefined;
    let bundle_ms: number | undefined;

    let cBinReady = existsSync(cBin) && !FORCE;
    if (!cBinReady) {
        process.stderr.write(`[compile] tsc2c ${name} ... `);
        const compileFlags = [...TSC2C_FLAGS];
        if (c.release && !compileFlags.includes("--release")) compileFlags.push("--release");
        const r = timeRun(TSC2C, [c.tsFile, "-o", cBin, ...compileFlags]);
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
        const r = timeRun(BUN, ["build", c.tsFile, "--target=node", "--outfile", jsBundle]);
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
        const s = bestOf(c, "tsc2c", () => timeRun(cBin, [], false, RUN_TIMEOUT_MS), notes);
        if (s) samples.push(s);
        process.stderr.write("c");
    }
    {
        const s = bestOf(c, "bun", () => timeRun(BUN, [c.tsFile], false, RUN_TIMEOUT_MS), notes);
        if (s) samples.push(s);
        process.stderr.write("b");
    }
    if (jsReady) {
        const s = bestOf(c, "node", () => timeRun(NODE, [jsBundle], true, RUN_TIMEOUT_MS), notes);
        if (s) samples.push(s);
        process.stderr.write("n");
    }
    process.stderr.write("\n");

    // Sanity: verify checksums match across backends (correctness guard).
    const checksums = new Set(samples.map((s) => s.checksum));
    if (c.mode === "self" && checksums.size > 1) {
        notes.push("checksum mismatch across backends: " + samples.map((s) => `${s.backend}=${s.checksum}`).join(", "));
    }

    results.push({ name, mode: c.mode, compile_ms, bundle_ms, samples, notes });
}

const payload = {
    when: new Date().toISOString(),
    runs_per_backend: RUNS,
    source: BENCH_SOURCE,
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
function fmtOps(n: number | undefined, w: number): string {
    if (n === undefined || !isFinite(n)) return "—".padStart(w);
    if (n >= 1000000) return ((n / 1000000).toFixed(2) + "M").padStart(w);
    if (n >= 1000) return ((n / 1000).toFixed(1) + "k").padStart(w);
    return n.toFixed(0).padStart(w);
}
function pad(s: string, w: number): string { return s.padEnd(w); }

const hasOps = results.some((r) => r.samples.some((s) => s.ops_per_sec !== undefined));
const cols: Array<{ label: string; w: number; kind: "label" | "num" | "ratio" | "ops" }> = [
    { label: "benchmark",   w: Math.max(18, Math.min(48, Math.max(...results.map((r) => r.name.length)))), kind: "label" as const },
    { label: "tsc2c (ms)",  w: 12, kind: "num"   as const },
    { label: "bun (ms)",    w: 12, kind: "num"   as const },
    { label: "node (ms)",   w: 12, kind: "num"   as const },
    ...(hasOps ? [
        { label: "tsc2c ops/s", w: 13, kind: "ops" as const },
        { label: "bun ops/s",   w: 13, kind: "ops" as const },
        { label: "node ops/s",  w: 13, kind: "ops" as const },
    ] : []),
    { label: "vs bun",      w: 10, kind: "ratio" as const },
    { label: "vs node",     w: 10, kind: "ratio" as const },
];

console.log("");
console.log(
    "Best of " + RUNS + " run(s), lower is faster. " +
    (hasOps ? "Generated e2e cases report operation-loop self-time and ops/sec:" : "Manual cases report BENCH self-time:"),
);
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

    const row = [
        pad(r.name, cols[0].w),
        fmt(t?.bench_ms, 12),
        fmt(b?.bench_ms, 12),
        fmt(n?.bench_ms, 12),
    ];
    if (hasOps) {
        row.push(
            fmtOps(t?.ops_per_sec, 13),
            fmtOps(b?.ops_per_sec, 13),
            fmtOps(n?.ops_per_sec, 13),
        );
    }
    row.push(fmtRatio(vsBun, 10), fmtRatio(vsNode, 10));
    console.log(row.join("  "));
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
    "".padStart(12),
    "".padStart(12),
    "".padStart(12),
    ...(hasOps ? ["".padStart(13), "".padStart(13), "".padStart(13)] : []),
    fmtRatio(geomean(ratiosBun), 10),
    fmtRatio(geomean(ratiosNode), 10),
].join("  "));

console.log("");
const anyNotes = results.filter((r) => r.notes.length > 0);
if (anyNotes.length > 0) {
    console.log("notes:");
    for (const r of anyNotes) for (const note of r.notes) console.log(`  ${r.name}: ${note}`);
    console.log("");
}
console.log(`vs bun / vs node = factor by which tsc2c is faster (bun_ms / tsc2c_ms).`);
if (hasOps) console.log(`ops/sec is recorded in JSON for generated --full e2e cases as ops_per_sec.`);
console.log(`results JSON: ${RESULTS_FILE}`);
