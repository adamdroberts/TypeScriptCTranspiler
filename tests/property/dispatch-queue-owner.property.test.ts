import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { compile, findDispatchLinkOptions } from "../../src/compile";

// DispatchQueue is a native extension, so the expected handle identity and
// snapshot policy are asserted directly rather than delegated to Node.
const source = String.raw`
export {};
const label = 'owner:' + 'q'.repeat(1024);
const serial: any = new DispatchQueue(label);
const concurrent: any = DispatchQueue.concurrent();
function retain(value: any): any { return { value }; }
let graph: any = { value: serial };
for (let depth = 0; depth < 256; depth++) graph = retain(graph);
for (let depth = 0; depth < 256; depth++) graph = graph.value;
const alias: any = graph.value;
const descriptor = Object.getOwnPropertyDescriptor(alias, 'label')!;
console.log('queue owner:', alias === serial, alias !== concurrent,
    alias.label === label, concurrent.label === 'concurrent',
    descriptor.writable === false, descriptor.enumerable === true,
    descriptor.configurable === false, Reflect.ownKeys(alias).join(',') === 'label');

const fakes: any[] = [undefined, null, 1, 'queue', {}, {label},
    Object.create(serial), new Proxy(serial, {}),
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(serial))];
let rejected = 0;
for (const fake of fakes) {
    try { dispatch.sync(fake, () => 1); }
    catch (error) { if (error instanceof TypeError) rejected++; }
}
console.log('queue brand:', rejected === fakes.length);

async function exercise(): Promise<void> {
    const snapshot: any = { values: [7] };
    const pending = dispatch.async(serial, () =>
        alias === serial && alias.label === label && snapshot.values[0] === 7);
    snapshot.values[0] = 99;
    console.log('queue capture:', await pending);
    console.log('queue operations:', dispatch.sync(alias, () => 11) === 11,
        await dispatch.after(0, alias, () => 13) === 13,
        await dispatch.barrier(concurrent, () => 17) === 17,
        (await dispatch.group(concurrent, [() => 19, () => 23])).join(',') === '19,23');
}
exercise().then(() => console.log('queue complete: true'));
`;

const expected = "queue owner: true true true true true true true true\n" +
    "queue brand: true\nqueue capture: true\nqueue operations: true true true true\n" +
    "queue complete: true\n";

for (const dispatch of ["serial", "threaded"] as const) {
    const available = dispatch === "serial" || findDispatchLinkOptions() !== null;
    (available ? test : test.skip)(`DispatchQueue owners retain identity and validate actual handles (${dispatch})`, async () => {
        const root = await mkdtemp(join(tmpdir(), "tsc2c-dispatch-owner-"));
        try {
            for (const erased of [false, true]) for (const noGc of [false, true]) {
                const mode = `${erased}-${noGc}`;
                const entry = join(root, `owner-${mode}.${erased ? "js" : "ts"}`);
                await writeFile(entry, erased ? ts.transpile(source, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }) : source);
                const output = join(root, `program-${mode}`), buildDir = join(root, `build-${mode}`);
                const diagnostics: string[] = [];
                const result = await compile({ entry, output, buildDir, noGc, dispatch,
                    diagnosticWriter: message => diagnostics.push(message) });
                expect({ code: result.exitCode, diagnostics }).toEqual({ code: 0, diagnostics: [] });
                const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 30_000 });
                expect({ code: native.exitCode, stderr: native.stderr.toString(), stdout: native.stdout.toString() })
                    .toEqual({ code: 0, stderr: "", stdout: expected });
                const emitted = await readFile(join(buildDir, "main.c"), "utf8");
                expect(emitted).toContain("tsc_value_as_dispatch_queue(");
                expect(emitted).toContain("tsc_dispatch_capture(");
            }
        } finally { await rm(root, { recursive: true, force: true }); }
    }, 600_000);
}
