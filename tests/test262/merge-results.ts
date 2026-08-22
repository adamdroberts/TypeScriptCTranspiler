#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildInventory, type Test262Inventory } from "./inventory";
import { argumentValue, defaultArtifactRoot, defaultCacheRoot, sha256Text, stableJson } from "./model";
import type { Test262RunReport } from "./run";

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

function same(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
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

async function main(): Promise<void> {
    const inputDirectory = argumentValue("--input-dir");
    const inputs = [
        ...argumentValues("--input").map((filename) => path.resolve(filename)),
        ...(inputDirectory ? await jsonFiles(path.resolve(inputDirectory)) : []),
    ];
    if (inputs.length === 0) throw new Error("provide every shard report with repeated --input arguments");
    const test262 = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const output = path.resolve(argumentValue("--output") ?? path.join(defaultArtifactRoot, "test262-run.json"));
    const reports = await Promise.all(inputs.map(async (filename) => JSON.parse(await fs.readFile(filename, "utf8")) as Test262RunReport));
    const first = reports[0]!;
    const shardTotal = first.inventory.selection.shard?.total;
    if (!shardTotal || reports.length !== shardTotal) {
        throw new Error("input set does not contain the declared number of shards");
    }
    const shardIndices = new Set<number>();
    for (const report of reports) {
        if (report.kind !== "test262-run" || report.inventory.selection.filter !== null) {
            throw new Error("only unfiltered Test262 shard reports can be merged");
        }
        const shard = report.inventory.selection.shard;
        if (!shard || shard.total !== shardTotal || shardIndices.has(shard.index)) {
            throw new Error("duplicate or inconsistent Test262 shard identity");
        }
        shardIndices.add(shard.index);
        if (report.resultSetSha256 !== sha256Text(JSON.stringify(report.results))) {
            throw new Error("Test262 shard result digest is invalid");
        }
        if (report.corpusEndSha256 !== report.inventory.corpusManifestSha256) {
            throw new Error("Test262 shard corpus end identity differs from its inventory");
        }
        for (const field of ["runnerContractVersion", "sourceStart", "sourceEnd", "toolchain", "executionProfile", "host", "timeoutMs", "corpusEndSha256"] as const) {
            if (!same(report[field], first[field])) throw new Error(`shards disagree on ${field}`);
        }
    }
    for (let index = 0; index < shardTotal; index++) {
        if (!shardIndices.has(index)) throw new Error(`missing Test262 shard ${index}/${shardTotal}`);
    }
    const fullInventory = await buildInventory({ test262, filter: null, shard: null });
    const scenarioById = new Map<string, Test262Inventory["scenarios"][number]>();
    const resultById = new Map<string, Test262RunReport["results"][number]>();
    for (const report of reports) {
        for (const scenario of report.inventory.scenarios) {
            if (scenarioById.has(scenario.id)) throw new Error(`duplicate scenario across shards: ${scenario.id}`);
            scenarioById.set(scenario.id, scenario);
        }
        for (const result of report.results) {
            if (resultById.has(result.id)) throw new Error(`duplicate result across shards: ${result.id}`);
            resultById.set(result.id, result);
        }
    }
    if (scenarioById.size !== fullInventory.scenarios.length) throw new Error("merged shard scenario set is incomplete");
    for (const scenario of fullInventory.scenarios) {
        if (!same(scenarioById.get(scenario.id), scenario)) throw new Error(`scenario differs from fresh pinned inventory: ${scenario.id}`);
    }
    const expectedResultIds = new Set(
        fullInventory.scenarios
            .filter((scenario) => scenario.scope === "in-scope" || scenario.scope === "runner-self-test")
            .map((scenario) => scenario.id),
    );
    for (const id of expectedResultIds) {
        if (!resultById.has(id)) throw new Error(`missing merged result ${id}`);
    }
    for (const id of resultById.keys()) {
        if (!expectedResultIds.has(id)) throw new Error(`extra merged result ${id}`);
    }
    const results = [...resultById.values()].sort((a, b) => a.id.localeCompare(b.id));
    const merged = {
        ...first,
        startedAt: reports.map((report) => report.startedAt).sort()[0]!,
        finishedAt: reports.map((report) => report.finishedAt).sort().at(-1)!,
        inventory: fullInventory,
        resultSetSha256: sha256Text(JSON.stringify(results)),
        results,
        mergedShards: inputs.map((filename, index) => ({ filename, sha256: sha256Text(JSON.stringify(reports[index])) })),
    };
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, stableJson(merged), "utf8");
    console.log(`Wrote exhaustive merged Test262 report to ${output}`);
}

main().catch((error) => {
    console.error(`Test262 merge: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
