import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

const reExportDepth = 24;

const anonymousModule = `
    import Self from "./anonymous.js";

    let readThrew = false;
    try { Self; }
    catch (error) { readThrew = error instanceof ReferenceError; }
    let typeofThrew = false;
    try { typeof Self; }
    catch (error) { typeofThrew = error instanceof ReferenceError; }
    export const tdzObservation = [readThrew, typeofThrew];

    export default class {
        static marker = 53;
        static answer() { return 47; }
        constructor(value) { this.value = value; }
        read() { return this.value; }
    }

    export const initializedObservation = [
        Self.name,
        Self["marker"],
        Self["answer"](),
        new Self(59).read(),
    ];
`;

const staticNameModule = `
    export default class {
        static name() { return "static-name"; }
    }
`;

const namedModule = `
    import Self from "./named.js";
    export default class NamedDefault {
        constructor(value) { this.value = value; }
        read() { return this.value; }
    }
    const original = NamedDefault;
    NamedDefault = Self;
    export const namedObservation = [
        Self === original,
        Self === NamedDefault,
        Self.name,
        new Self(61).read(),
    ];
`;

function reExportSource(index: number): string {
    const target = index === 0 ? "anonymous" : `bridge-${index - 1}`;
    return `export { default } from "./${target}.js";\n`;
}

function entrySource(): string {
    return `
        import DeepDefault from "./bridge-${reExportDepth - 1}.js";
        import { tdzObservation, initializedObservation } from "./anonymous.js";
        import StaticName from "./static-name.js";
        import { namedObservation } from "./named.js";

        if (tdzObservation[0] !== true || tdzObservation[1] !== true) {
            throw new Error("anonymous default class bypassed its TDZ");
        }
        if (
            initializedObservation[0] !== "default" ||
            initializedObservation[1] !== 53 ||
            initializedObservation[2] !== 47 ||
            initializedObservation[3] !== 59
        ) {
            throw new Error("anonymous default class initialization differs");
        }
        if (
            DeepDefault.name !== "default" ||
            DeepDefault["marker"] !== 53 ||
            DeepDefault["answer"]() !== 47 ||
            new DeepDefault(67).read() !== 67
        ) {
            throw new Error("deep default re-export lost the canonical class identity");
        }
        if (StaticName["name"]() !== "static-name") {
            throw new Error("static name method was overwritten by default-name inference");
        }
        if (
            namedObservation[0] !== true ||
            namedObservation[1] !== true ||
            namedObservation[2] !== "NamedDefault" ||
            namedObservation[3] !== 61
        ) {
            throw new Error("named default class did not retain its live local binding");
        }
        console.log("module-default-class-binding-ok");
    `;
}

test("default classes use one declaration-instantiation and class-evaluation plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-default-class-property-"));
    const entry = path.join(temporary, "subject.js");
    const anonymous = path.join(temporary, "anonymous.js");
    const staticName = path.join(temporary, "static-name.js");
    const named = path.join(temporary, "named.js");
    const bridges = Array.from(
        { length: reExportDepth },
        (_, index) => path.join(temporary, `bridge-${index}.js`),
    );
    const roots = [entry, anonymous, staticName, named, ...bridges];
    await Promise.all([
        fs.writeFile(entry, entrySource(), "utf8"),
        fs.writeFile(anonymous, anonymousModule, "utf8"),
        fs.writeFile(staticName, staticNameModule, "utf8"),
        fs.writeFile(named, namedModule, "utf8"),
        ...bridges.map((filename, index) => fs.writeFile(filename, reExportSource(index), "utf8")),
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
            expect(process.stdout.toString()).toBe("module-default-class-binding-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
