import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

const reExportDepth = 24;

function bridgeSource(index: number): string {
    if (index === 0) {
        return `
            import { ModuleClass as Target } from "./subject.js";
            export { ModuleClass } from "./subject.js";

            export const cycleTdz = [];
            try { Target; }
            catch (error) { cycleTdz.push(error instanceof ReferenceError); }
            try { typeof Target; }
            catch (error) { cycleTdz.push(error instanceof ReferenceError); }
        `;
    }
    return `
        export { ModuleClass, cycleTdz } from "./bridge-${index - 1}.js";
    `;
}

function subjectSource(): string {
    return `
        import { ModuleClass as Indirect, cycleTdz } from "./bridge-${reExportDepth - 1}.js";

        if (cycleTdz.length !== 2 || cycleTdz[0] !== true || cycleTdz[1] !== true) {
            throw new Error("cyclic class import did not observe the exporter TDZ");
        }

        let readThrew = false;
        try { Indirect; }
        catch (error) { readThrew = error instanceof ReferenceError; }
        let typeofThrew = false;
        try { typeof Indirect; }
        catch (error) { typeofThrew = error instanceof ReferenceError; }
        if (!readThrew || !typeofThrew) {
            throw new Error("indirect class binding bypassed the TDZ");
        }

        export class ModuleClass {
            constructor(value) { this.value = value; }
            read() { return this.value; }
        }

        if (Indirect !== ModuleClass || ModuleClass.name !== "ModuleClass") {
            throw new Error("class aliases did not share one stable binding identity");
        }
        const instance = new Indirect(43);
        if (instance.read() !== 43) {
            throw new Error("construction through the canonical class binding differs");
        }

        let callThrew = false;
        try { ModuleClass(); }
        catch (error) { callThrew = error instanceof TypeError; }
        if (!callThrew) throw new Error("class binding was callable without new");

        const original = ModuleClass;
        ModuleClass = original;
        if (Indirect !== original) {
            throw new Error("class declaration binding was not mutable and live");
        }

        console.log("module-class-binding-ok");
    `;
}

test("module classes share the canonical TDZ-aware lexical binding plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-class-property-"));
    const entry = path.join(temporary, "subject.js");
    const bridges = Array.from(
        { length: reExportDepth },
        (_, index) => path.join(temporary, `bridge-${index}.js`),
    );
    const roots = [entry, ...bridges];
    await Promise.all([
        fs.writeFile(entry, subjectSource(), "utf8"),
        ...bridges.map((filename, index) => fs.writeFile(filename, bridgeSource(index), "utf8")),
    ]);
    try {
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                moduleRoots: roots,
                ignoreCheckJsDirectiveRoots: roots,
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("module-class-binding-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
