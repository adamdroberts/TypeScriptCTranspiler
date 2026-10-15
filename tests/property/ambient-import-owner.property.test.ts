import {nodeReferenceSync} from './node-reference';
import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

test("ambient imports select native owners while source aliases retain their module graph", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-ambient-import-owner-"));
    const erase = (source: string) => ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    }).outputText;
    try {
        for (const typed of [true, false]) for (const noGc of [false, true]) {
            const directory = path.join(root, `${typed}-${noGc}`);
            await fs.mkdir(directory);
            const extension = typed ? ".ts" : ".mjs";
            const specifierExtension = typed ? ".js" : extension;
            const depth = typed && !noGc ? 128 : 2;
            for (let index = 0; index < depth; index++) {
                const source = index + 1 < depth
                    ? `export { Source as Source } from './owner-${index + 1}${specifierExtension}';`
                    : "export class Source { token: number = 37; read(): number { return this.token; } }";
                await fs.writeFile(path.join(directory, `owner-${index}${extension}`), typed ? source : erase(source));
                await fs.writeFile(path.join(directory, `reference-owner-${index}.mjs`), erase(source.replace(`./owner-${index + 1}${specifierExtension}`, `./reference-owner-${index + 1}.mjs`)));
            }
            const imports: string[] = [], checks: string[] = [];
            for (const [index, module] of ["events", "node:events"].entries()) {
                const name = index === 0 ? "EventEmitter" : "ImportedEmitter";
                imports.push(`import { EventEmitter as ${name} } from '${module}';`);
                checks.push(`{
                    let ignored: number = 0;
                    const emitter = new ${name}((ignored++, {}));
                    let total: number = 0;
                    emitter.on('tick', (value: number): void => { total += value; });
                    const before: boolean = emitter.emit('tick', 11);
                    await Promise.resolve(0);
                    const after: boolean = emitter.emit('tick', 13);
                    console.log('native-${index}', before, after, total, ignored, emitter.listenerCount('tick'));
                }`);
            }
            const source = `${imports.join("\n")}
                import { Source as RenamedSource } from './owner-0${specifierExtension}';
                function shadow(EventEmitter: any): any { return new EventEmitter(); }
                async function verify(): Promise<void> {
                    ${checks.join("\n")}
                    const ordinary = new RenamedSource();
                    await Promise.resolve(0);
                    console.log('source-owner', ordinary.read(), shadow(RenamedSource).read());
                }
                verify().catch((error: any): void => { console.log('failure', String(error)); throw error; });`;
            const entry = path.join(directory, `main${extension}`);
            await fs.writeFile(entry, typed ? source : erase(source));
            const reference = path.join(directory, "reference.mjs");
            await fs.writeFile(reference, erase(source.replace(`./owner-0${specifierExtension}`, "./reference-owner-0.mjs")));
            const node = nodeReferenceSync(["node", reference], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exit: node.exitCode, stderr: node.stderr.toString() }).toEqual({ exit: 0, stderr: "" });
            expect(node.stdout.toString()).toBe("native-0 true true 24 1 1\nnative-1 true true 24 1 1\nsource-owner 37 37\n");
            const output = path.join(directory, "program"), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, moduleRoots: [entry],
                initializationEntries: [entry], buildDir: path.join(directory, "build"),
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exit: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exit: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exit: native.exitCode, stderr: native.stderr.toString() }).toEqual({ exit: 0, stderr: "" });
            expect(native.stdout.toString()).toBe(node.stdout.toString());
        }
    } finally { await fs.rm(root, { recursive: true, force: true }); }
}, 600_000);
