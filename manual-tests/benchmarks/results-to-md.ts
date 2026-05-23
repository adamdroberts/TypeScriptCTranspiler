#!/usr/bin/env bun
// Convert a benchmark results JSON file into a Markdown report.
//
// Usage:
//   bun manual-tests/benchmarks/results-to-md.ts
//   bun manual-tests/benchmarks/results-to-md.ts results-e2e-full.json
//   bun manual-tests/benchmarks/results-to-md.ts results-e2e-full.json results-e2e-full.md

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const HERE = import.meta.dir;
const inputPath = process.argv[2] ?? join(HERE, "results-e2e-full.json");
const outputPath = process.argv[3] ?? join(
    dirname(inputPath),
    basename(inputPath, extname(inputPath)) + ".md",
);

type Backend = "tsc2c" | "bun" | "node";

interface Sample {
    backend: Backend;
    bench_ms: number;
    wall_ms: number;
    checksum: string;
}

interface CaseResult {
    name: string;
    c_binary_bytes?: number;
    samples: Sample[];
}

interface ResultsPayload {
    when?: string;
    runs_per_backend?: number;
    source?: string;
    tsc2c_flags?: string[];
    results: CaseResult[];
}

function sample(result: CaseResult, backend: Backend): Sample | undefined {
    return result.samples.find((s) => s.backend === backend);
}

function fmtMs(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return "-";
    if (value >= 1000) return value.toFixed(0);
    if (value >= 100) return value.toFixed(1);
    return value.toFixed(2);
}

function fmtRatio(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return "-";
    return value.toFixed(2) + "x";
}

function fmtBytes(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return "-";
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + "MiB";
    if (value >= 1024) return (value / 1024).toFixed(1) + "KiB";
    return value.toFixed(0) + "B";
}

function ratio(reference: Sample | undefined, compared: Sample | undefined): number | undefined {
    if (!reference || !compared || reference.bench_ms <= 0) return undefined;
    return compared.bench_ms / reference.bench_ms;
}

function geomean(values: number[]): number | undefined {
    const valid = values.filter((v) => Number.isFinite(v) && v > 0);
    if (valid.length === 0) return undefined;
    let total = 0;
    for (const value of valid) total += Math.log(value);
    return Math.exp(total / valid.length);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function displayName(name: string): string {
    return name.replace(/^e2e\//, "").replace(/_/g, " ");
}

function td(value: string, align: "left" | "right" = "left", style = "white-space: nowrap;"): string {
    return `    <td align="${align}" style="${style}" nowrap>${value}</td>`;
}

const payload = JSON.parse(readFileSync(inputPath, "utf8")) as ResultsPayload;
const results = payload.results;
const ratiosBun: number[] = [];
const ratiosNode: number[] = [];

const maxBenchNameLen = results.reduce(
    (m, r) => Math.max(m, displayName(r.name).length),
    "Benchmark".length,
);
/** Extra room so fractional widths do not clip in preview panes. */
const benchColMin = `${maxBenchNameLen + 3}ch`;
const firstColStyle = `min-width: ${benchColMin}; white-space: nowrap;`;

const lines: string[] = [];
lines.push("# Benchmark Results");
lines.push("");
lines.push(`Source: \`${inputPath}\``);
if (payload.when) lines.push(`Generated from benchmark run: \`${payload.when}\``);
if (payload.source) lines.push(`Benchmark source: \`${payload.source}\``);
if (payload.runs_per_backend !== undefined) lines.push(`Runs per backend: \`${payload.runs_per_backend}\``);
lines.push(`TSC2C flags: \`${payload.tsc2c_flags?.join(" ") || "(none)"}\``);
lines.push("");
lines.push("Lower milliseconds are faster. `vs bun` and `vs node` are the factors by which `tsc2c` is faster, calculated as `backend_ms / tsc2c_ms`.");
lines.push("");

lines.push('<div style="overflow-x: auto;">');
lines.push('<table style="table-layout: auto; width: max-content;">');
lines.push("  <colgroup>");
lines.push(`    <col style="min-width: ${benchColMin};">`);
lines.push("    <col style=\"width: 7rem;\">");
lines.push("    <col style=\"width: 7rem;\">");
lines.push("    <col style=\"width: 7rem;\">");
lines.push("    <col style=\"width: 7rem;\">");
lines.push("    <col style=\"width: 6rem;\">");
lines.push("    <col style=\"width: 6rem;\">");
lines.push("  </colgroup>");
lines.push("  <thead>");
lines.push("    <tr>");
lines.push(`      <th align="left" style="${firstColStyle}" nowrap>Benchmark</th>`);
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>tsc2c ms</th>");
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>bun ms</th>");
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>node ms</th>");
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>bin size</th>");
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>vs bun</th>");
lines.push("      <th align=\"right\" style=\"white-space: nowrap;\" nowrap>vs node</th>");
lines.push("    </tr>");
lines.push("  </thead>");
lines.push("  <tbody>");

for (const result of results) {
    const tsc2c = sample(result, "tsc2c");
    const bun = sample(result, "bun");
    const node = sample(result, "node");
    const vsBun = ratio(tsc2c, bun);
    const vsNode = ratio(tsc2c, node);
    if (vsBun !== undefined) ratiosBun.push(vsBun);
    if (vsNode !== undefined) ratiosNode.push(vsNode);

    lines.push("    <tr>");
    lines.push(
        td(escapeHtml(displayName(result.name)), "left", firstColStyle),
    );
    lines.push(td(fmtMs(tsc2c?.bench_ms), "right"));
    lines.push(td(fmtMs(bun?.bench_ms), "right"));
    lines.push(td(fmtMs(node?.bench_ms), "right"));
    lines.push(td(fmtBytes(result.c_binary_bytes), "right"));
    lines.push(td(fmtRatio(vsBun), "right"));
    lines.push(td(fmtRatio(vsNode), "right"));
    lines.push("    </tr>");
}

lines.push("    <tr>");
lines.push(td("<strong>geomean</strong>", "left", firstColStyle));
lines.push(td(""));
lines.push(td(""));
lines.push(td(""));
lines.push(td(""));
lines.push(td(`<strong>${fmtRatio(geomean(ratiosBun))}</strong>`, "right"));
lines.push(td(`<strong>${fmtRatio(geomean(ratiosNode))}</strong>`, "right"));
lines.push("    </tr>");
lines.push("  </tbody>");
lines.push("</table>");
lines.push("</div>");

writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(outputPath);
