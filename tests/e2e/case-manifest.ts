import * as fs from "node:fs/promises";
import * as path from "node:path";
import { generateE2eCaseSource } from "./generated-cases";

export const e2eCasesDir = path.resolve(import.meta.dir, "cases");

export interface E2eCaseManifestEntry {
    name: string;
    entry: string;
    generatedSource?: string;
    generator?: string;
    expectedExitCode?: number;
    expectedStderrContains?: string;
}

async function exists(filename: string): Promise<boolean> {
    try {
        await fs.access(filename);
        return true;
    } catch {
        return false;
    }
}

/**
 * Canonical E2E worklist shared by the native runner and compliance matrix.
 * Directories without a source/generator are intentionally outside that set.
 */
export async function discoverE2eCaseManifest(filter?: string): Promise<E2eCaseManifestEntry[]> {
    const entries: E2eCaseManifestEntry[] = [];
    for (const name of await fs.readdir(e2eCasesDir)) {
        if (filter && !name.includes(filter)) continue;
        const directory = path.join(e2eCasesDir, name);
        const entry = path.join(directory, "in.ts");
        const generatedCasePath = path.join(directory, "generate.json");
        const expectedExitPath = path.join(directory, "expected.exitcode");
        const expectedStdoutPath = path.join(directory, "expected.stdout");
        const expectedStderrPath = path.join(directory, "expected.stderr.contains");
        const emitCOnlyPath = path.join(directory, "compile.emit_c_only");
        const hasEntry = await exists(entry);
        const hasGeneratedCase = await exists(generatedCasePath);
        if (!hasEntry && !hasGeneratedCase) continue;
        if (hasEntry && hasGeneratedCase) {
            throw new Error(`e2e case ${name} must use either in.ts or generate.json, not both`);
        }

        const generatedRaw = hasGeneratedCase ? await fs.readFile(generatedCasePath, "utf8") : undefined;
        const generatedSource = generatedRaw === undefined
            ? undefined
            : generateE2eCaseSource(generatedRaw, generatedCasePath);
        const generator = generatedRaw === undefined
            ? undefined
            : String((JSON.parse(generatedRaw) as { generator: unknown }).generator);
        let expectedExitCode: number | undefined;
        if (await exists(expectedExitPath)) {
            const raw = await fs.readFile(expectedExitPath, "utf8");
            expectedExitCode = Number(raw.trim());
            if (!Number.isInteger(expectedExitCode)) {
                throw new Error(`invalid expected.exitcode for ${name}: ${raw.trim()}`);
            }
        } else if (!(await exists(expectedStdoutPath)) && !(await exists(emitCOnlyPath))) {
            throw new Error(`missing expected.stdout or expected.exitcode for ${name}`);
        }

        entries.push({
            name,
            entry,
            generatedSource,
            generator,
            expectedExitCode,
            expectedStderrContains: await exists(expectedStderrPath)
                ? (await fs.readFile(expectedStderrPath, "utf8")).trimEnd()
                : undefined,
        });
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
}
