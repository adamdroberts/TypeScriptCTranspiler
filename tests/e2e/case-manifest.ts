import * as fs from "node:fs/promises";
import * as path from "node:path";
import { generateE2eCaseSource, parseGeneratedCaseSpec } from "./generated-cases";
import {
    projectRoot,
    requireTrackedRegularProjectFile,
    sha256File,
    sha256Text,
    trackedProjectFiles,
} from "../test262/model";

export const e2eCasesDir = path.resolve(import.meta.dir, "cases");

export interface E2eCaseManifestEntry {
    name: string;
    entry: string;
    generatedSource?: string;
    generator?: string;
    generatorParameters?: Readonly<Record<string, number>>;
    expectedExitCode?: number;
    expectedStderrContains?: string;
    emitCOnly: boolean;
    unsafeEval: boolean;
    nativeAddon: boolean;
    semanticDelegation: boolean;
    dispatch: boolean;
    dispatchSerial: boolean;
    dispatchNoGc: boolean;
    inputs: Array<{ path: string; sha256: string }>;
    inputManifestSha256: string;
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
export async function discoverE2eCaseManifest(
    filter?: string,
    suppliedTrackedFiles?: ReadonlySet<string>,
): Promise<E2eCaseManifestEntry[]> {
    const trackedFiles = suppliedTrackedFiles ?? await trackedProjectFiles();
    const entries: E2eCaseManifestEntry[] = [];
    const rootEntries = await fs.readdir(e2eCasesDir, { withFileTypes: true });
    for (const rootEntry of rootEntries) {
        const name = rootEntry.name;
        if (filter && !name.includes(filter)) continue;
        const directory = path.join(e2eCasesDir, name);
        if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) {
            throw new Error(`E2E case root entry must be a regular directory: ${name}`);
        }
        const inputs: Array<{ path: string; sha256: string }> = [];
        const worklist = [directory];
        while (worklist.length > 0) {
            const current = worklist.pop()!;
            const children = await fs.readdir(current, { withFileTypes: true });
            children.sort((left, right) => left.name.localeCompare(right.name));
            for (const child of children) {
                const childPath = path.join(current, child.name);
                if (child.isSymbolicLink()) {
                    throw new Error(`E2E case ${name} contains a symlink: ${path.relative(directory, childPath)}`);
                }
                if (child.isDirectory()) {
                    worklist.push(childPath);
                    continue;
                }
                if (!child.isFile()) {
                    throw new Error(`E2E case ${name} contains a non-regular input: ${path.relative(directory, childPath)}`);
                }
                const relative = path.relative(projectRoot, childPath).split(path.sep).join("/");
                await requireTrackedRegularProjectFile(relative, trackedFiles, `E2E case ${name} input`);
                inputs.push({ path: relative, sha256: await sha256File(childPath) });
            }
        }
        inputs.sort((left, right) => left.path.localeCompare(right.path));
        const entry = path.join(directory, "in.ts");
        const generatedCasePath = path.join(directory, "generate.json");
        const expectedExitPath = path.join(directory, "expected.exitcode");
        const expectedStdoutPath = path.join(directory, "expected.stdout");
        const expectedStderrPath = path.join(directory, "expected.stderr.contains");
        const emitCOnlyPath = path.join(directory, "compile.emit_c_only");
        const unsafeEvalPath = path.join(directory, "compile.unsafe_eval");
        const nativeAddonManifestPath = path.join(directory, "native-addon-manifest.json");
        const dispatchPath = path.join(directory, "compile.dispatch");
        const dispatchSerialPath = path.join(directory, "compile.dispatch.serial");
        const dispatchNoGcPath = path.join(directory, "compile.dispatch.no_gc");
        const hasEntry = await exists(entry);
        const hasGeneratedCase = await exists(generatedCasePath);
        if (!hasEntry && !hasGeneratedCase) continue;
        if (hasEntry && hasGeneratedCase) {
            throw new Error(`e2e case ${name} must use either in.ts or generate.json, not both`);
        }

        const generatedRaw = hasGeneratedCase ? await fs.readFile(generatedCasePath, "utf8") : undefined;
        const generatedSpec = generatedRaw === undefined
            ? undefined
            : parseGeneratedCaseSpec(generatedRaw, generatedCasePath);
        const generatedSource = generatedRaw === undefined
            ? undefined
            : generateE2eCaseSource(generatedRaw, generatedCasePath);
        const generator = generatedSpec?.generator;
        const generatorParameters = generatedSpec === undefined
            ? undefined
            : Object.fromEntries(
                Object.entries(generatedSpec)
                    .filter((entry): entry is [string, number] => entry[0] !== "generator" && typeof entry[1] === "number")
                    .sort(([left], [right]) => left.localeCompare(right)),
            );
        let expectedExitCode: number | undefined;
        if (await exists(expectedExitPath)) {
            const raw = await fs.readFile(expectedExitPath, "utf8");
            expectedExitCode = Number(raw.trim());
            if (!Number.isInteger(expectedExitCode)) {
                throw new Error(`invalid expected.exitcode for ${name}: ${raw.trim()}`);
            }
        }
        const emitCOnly = await exists(emitCOnlyPath);
        if (expectedExitCode === undefined && !(await exists(expectedStdoutPath)) && !emitCOnly) {
            throw new Error(`missing expected.stdout or expected.exitcode for ${name}`);
        }
        const unsafeEval = await exists(unsafeEvalPath);
        let nativeAddon = false;
        if (await exists(nativeAddonManifestPath)) {
            const parsed = JSON.parse(await fs.readFile(nativeAddonManifestPath, "utf8")) as { addons?: unknown };
            if (!parsed.addons || typeof parsed.addons !== "object" || Array.isArray(parsed.addons)) {
                throw new Error(`invalid native-addon-manifest.json for ${name}`);
            }
            nativeAddon = Object.keys(parsed.addons).length > 0;
        }

        entries.push({
            name,
            entry,
            generatedSource,
            generator,
            generatorParameters,
            expectedExitCode,
            expectedStderrContains: await exists(expectedStderrPath)
                ? (await fs.readFile(expectedStderrPath, "utf8")).trimEnd()
                : undefined,
            emitCOnly,
            unsafeEval,
            nativeAddon,
            semanticDelegation: unsafeEval || nativeAddon,
            dispatch: await exists(dispatchPath),
            dispatchSerial: await exists(dispatchSerialPath),
            dispatchNoGc: await exists(dispatchNoGcPath),
            inputs,
            inputManifestSha256: sha256Text(JSON.stringify(inputs)),
        });
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
}
