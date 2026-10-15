import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const fixture = new URL("../e2e/cases/function_binding_identity/in.ts", import.meta.url);

test("function expando inference retains declaration-owned lexical and capture identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "tsc2c-function-binding-"));
    try {
        const source = await readFile(fixture, "utf8");
        const reference = join(root, "reference.js"), stdout = join(root, "reference.stdout");
        await writeFile(reference, source);
        const oracle = Bun.spawnSync(["node", reference], { stdout: Bun.file(stdout), stderr: "pipe", timeout: 120_000 });
        expect({ code: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ code: 0, stderr: "" });
        const expected = await readFile(stdout, "utf8");
        expect(expected).toBe("function-binding-identity-ok\n");
        for (const extension of ["ts", "js"]) for (const noGc of [false, true]) {
            const entry = join(root, `main-${extension}-${noGc}.${extension}`), output = entry + "-native";
            await writeFile(entry, source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: output + "-build",
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: result.exitCode, diagnostics }).toEqual({ code: 0, diagnostics: [] });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: native.exitCode, stderr: native.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            expect(native.stdout.toString()).toBe(expected);
        }
        // Script evaluation instantiates Annex B outer aliases separately;
        // both lexical and outer bindings still retain their actual owners.
        for (const noGc of [false, true]) {
            const entry = join(root, `script-${noGc}.js`), output = entry + "-native";
            await writeFile(entry, source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: output + "-build", initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/function-binding.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: result.exitCode, diagnostics }).toEqual({ code: 0, diagnostics: [] });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ code: native.exitCode, stderr: native.stderr.toString() }).toEqual({ code: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout).toBe(expected);
        }
    } finally { await rm(root, { recursive: true, force: true }); }
}, 600_000);
