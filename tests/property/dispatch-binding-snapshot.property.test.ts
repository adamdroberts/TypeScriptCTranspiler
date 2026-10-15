import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { compile, findDispatchLinkOptions } from "../../src/compile";

// Native dispatch has snapshot capture semantics; both initialized data and
// the uninitialized state must pass through the same binding descriptor.
const source = String.raw`
const queue: any = new DispatchQueue('binding-snapshot');
function before(): void {
    dispatch.async(queue, () => (() => late.values[0])()).then(
        () => console.log('unexpected initialized capture'),
        error => console.log('captured TDZ:', String(error) === "ReferenceError: Cannot access 'late' before initialization"));
}
before();
const late: any = { values: [31] };
const snapshot: any = { values: [37] };
const pending = dispatch.async(queue, () => (() => snapshot.values[0])());
snapshot.values[0] = 99;
pending.then(result => console.log('captured value:', result === 37));
`;

for (const dispatch of ["serial", "threaded"] as const) {
    const available = dispatch === "serial" || findDispatchLinkOptions() !== null;
    (available ? test : test.skip)(`binding snapshots retain initialized and TDZ state (${dispatch})`, async () => {
        const root = await mkdtemp(join(tmpdir(), "tsc2c-binding-snapshot-"));
        try { for (const module of [false, true]) for (const erased of [false, true]) for (const noGc of [false, true]) {
            const mode = `${module}-${erased}-${noGc}`, entry = join(root, `source-${mode}.${erased ? "js" : "ts"}`);
            const input = (module ? "export {};\n" : "") + source;
            await writeFile(entry, erased ? ts.transpile(input, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }) : input);
            const output = join(root, `program-${mode}`), diagnostics: string[] = [];
            const result = await compile({ entry, output, buildDir: join(root, `build-${mode}`), dispatch, noGc,
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ code: result.exitCode, diagnostics }).toEqual({ code: 0, diagnostics: [] });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 30_000 });
            expect({ code: native.exitCode, stdout: native.stdout.toString().trim().split("\n").sort(), stderr: native.stderr.toString() })
                .toEqual({ code: 0, stdout: ["captured TDZ: true", "captured value: true"], stderr: "" });
        } } finally { await rm(root, { recursive: true, force: true }); }
    }, 600_000);
}
