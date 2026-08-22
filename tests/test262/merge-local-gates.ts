#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { LocalGatesReport } from "./local-gates";
import { argumentValue, defaultArtifactRoot, loadBaseline, sha256File, stableJson } from "./model";

function argumentValues(name: string): string[] {
    const result: string[] = [];
    for (let index = 0; index < process.argv.length; index++) {
        if (process.argv[index] !== name) continue;
        const value = process.argv[index + 1];
        if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
        result.push(value);
        index++;
    }
    return result;
}

async function jsonFiles(directory: string): Promise<string[]> {
    const result: string[] = [];
    const worklist = [directory];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            const filename = path.join(current, entry.name);
            if (entry.isDirectory()) worklist.push(filename);
            else if (entry.isFile() && entry.name.endsWith(".json")) result.push(filename);
        }
    }
    return result.sort();
}

function same(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

async function main(): Promise<void> {
    const directory = argumentValue("--input-dir");
    const inputs = [
        ...argumentValues("--input").map((filename) => path.resolve(filename)),
        ...(directory ? await jsonFiles(path.resolve(directory)) : []),
    ];
    if (inputs.length === 0) throw new Error("provide local gate reports with --input or --input-dir");
    const baseline = await loadBaseline();
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "local-gates.json"));
    const reports = await Promise.all(inputs.map(async (filename) => JSON.parse(await fs.readFile(filename, "utf8")) as LocalGatesReport));
    const first = reports[0]!;
    const gates = new Map<string, LocalGatesReport["gates"][number]>();
    for (const report of reports) {
        if (report.kind !== "ecmascript-local-gates" || report.selection.exhaustive || report.selection.gate === null) {
            throw new Error("local gate merge accepts only single-gate reports");
        }
        for (const field of ["sourceStart", "sourceEnd", "toolchain", "executionProfile", "generatedEvidenceManifestSha256", "propertyEvidenceManifestSha256"] as const) {
            if (!same(report[field], first[field])) throw new Error(`local gate reports disagree on ${field}`);
        }
        if (report.gates.length !== 1 || report.gates[0]!.id !== report.selection.gate || gates.has(report.selection.gate)) {
            throw new Error(`duplicate or inconsistent local gate report ${report.selection.gate}`);
        }
        gates.set(report.selection.gate, report.gates[0]!);
    }
    if (!same([...gates.keys()].sort(), baseline.localGates.map((gate) => gate.id).sort())) {
        throw new Error("local gate report set is not exactly the baseline worklist");
    }
    const merged: LocalGatesReport & { mergedInputs: Array<{ filename: string; sha256: string }> } = {
        ...first,
        startedAt: reports.map((report) => report.startedAt).sort()[0]!,
        finishedAt: reports.map((report) => report.finishedAt).sort().at(-1)!,
        selection: { exhaustive: true, gate: null },
        gates: baseline.localGates.map((gate) => gates.get(gate.id)!),
        mergedInputs: await Promise.all(inputs.map(async (filename) => ({ filename, sha256: await sha256File(filename) }))),
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(merged), "utf8");
    console.log(`Wrote exhaustive local gate report to ${output}`);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`local gate merge: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
