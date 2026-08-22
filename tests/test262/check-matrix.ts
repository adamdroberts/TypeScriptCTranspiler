#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { argumentValue, projectRoot } from "./model";
import { loadAndValidateMatrix, renderMatrixChecklist } from "./matrix";

async function main(): Promise<void> {
    const test262 = argumentValue("--test262");
    const { catalog, matrix, featureMap } = await loadAndValidateMatrix(test262 ? path.resolve(test262) : undefined);
    const doc = path.join(projectRoot, "docs/ecmascript-2026-coverage.md");
    const expected = renderMatrixChecklist(catalog, matrix, featureMap);
    const actual = await fs.readFile(doc, "utf8");
    if (actual !== expected) throw new Error(`${doc} is stale; run bun run compliance:matrix:render`);
    console.log("ECMAScript 2026 matrix, evidence references, host profile, and generated checklist are structurally valid.");
}

main().catch((error) => {
    console.error(`matrix check: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
