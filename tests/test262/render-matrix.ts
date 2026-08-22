#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { projectRoot } from "./model";
import { loadAndValidateMatrix, renderMatrixChecklist } from "./matrix";

async function main(): Promise<void> {
    const { catalog, matrix, featureMap } = await loadAndValidateMatrix();
    const output = path.join(projectRoot, "docs/ecmascript-2026-coverage.md");
    await fs.writeFile(output, renderMatrixChecklist(catalog, matrix, featureMap), "utf8");
    console.log(`Wrote ${output}`);
}

main().catch((error) => {
    console.error(`matrix render: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
