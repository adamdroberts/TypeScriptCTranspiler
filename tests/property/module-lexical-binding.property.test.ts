import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface CompoundPartition {
    readonly operator: string;
    readonly initial: number;
    readonly operand: number;
    readonly expected: number;
}

const compoundPartitions: readonly CompoundPartition[] = [
    { operator: "+=", initial: 7, operand: 2, expected: 9 },
    { operator: "-=", initial: 7, operand: 2, expected: 5 },
    { operator: "*=", initial: 7, operand: 2, expected: 14 },
    { operator: "**=", initial: 3, operand: 3, expected: 27 },
    { operator: "/=", initial: 8, operand: 2, expected: 4 },
    { operator: "%=", initial: 8, operand: 3, expected: 2 },
    { operator: "&=", initial: 6, operand: 3, expected: 2 },
    { operator: "|=", initial: 4, operand: 3, expected: 7 },
    { operator: "^=", initial: 7, operand: 3, expected: 4 },
    { operator: "<<=", initial: 3, operand: 2, expected: 12 },
    { operator: ">>=", initial: -8, operand: 2, expected: -2 },
    { operator: ">>>=", initial: -8, operand: 2, expected: 1073741822 },
];

function compoundAssertions(): string {
    return compoundPartitions.map(({ operator, initial, operand, expected }) => `
        local = ${initial};
        local ${operator} ${operand};
        if (local !== ${expected} || indirect !== ${expected}) {
            throw new Error("module lexical compound partition differs: ${operator}");
        }
    `).join("\n");
}

function subjectSource(): string {
    return `
        import { indirect, callableAlias, cycleTdz } from "./bridge.js";

        if (cycleTdz.length !== 2 || cycleTdz[0] !== true || cycleTdz[1] !== true) {
            throw new Error("cyclic import did not observe the exporter TDZ");
        }

        let readThrew = false;
        try { indirect; } catch (error) { readThrew = error instanceof ReferenceError; }
        let typeofThrew = false;
        try { typeof indirect; } catch (error) { typeofThrew = error instanceof ReferenceError; }
        let callableThrew = false;
        try { callableAlias; } catch (error) { callableThrew = error instanceof ReferenceError; }
        if (!readThrew || !typeofThrew || !callableThrew) {
            throw new Error("module lexical alias bypassed the TDZ");
        }

        export let local;
        if (local !== undefined || indirect !== undefined) {
            throw new Error("let without initializer did not initialize to undefined");
        }
        export const local__initialized = "user-binding";
        if (local__initialized !== "user-binding") {
            throw new Error("generated TDZ state collided with source binding storage");
        }

        local = 11;
        if (indirect !== 11) throw new Error("indirect export was not a live binding");
        ${compoundAssertions()}

        let effects = 0;
        local = 0;
        local &&= (++effects, 1);
        if (local !== 0 || effects !== 0) throw new Error("&&= false partition differs");
        local = 2;
        local &&= (++effects, 3);
        if (local !== 3 || effects !== 1) throw new Error("&&= true partition differs");
        local ||= (++effects, 4);
        if (local !== 3 || effects !== 1) throw new Error("||= true partition differs");
        local = 0;
        local ||= (++effects, 5);
        if (local !== 5 || effects !== 2) throw new Error("||= false partition differs");
        local = null;
        local ??= (++effects, 6);
        if (local !== 6 || effects !== 3) throw new Error("??= nullish partition differs");
        local ??= (++effects, 7);
        if (local !== 6 || effects !== 3) throw new Error("??= present partition differs");
        if (local++ !== 6 || local !== 7 || ++local !== 8 || indirect !== 8) {
            throw new Error("module lexical update partition differs");
        }

        let selfReadThrew = false;
        export const selfRead = (() => {
            try { return selfRead; }
            catch (error) {
                selfReadThrew = error instanceof ReferenceError;
                return 29;
            }
        })();
        if (!selfReadThrew || selfRead !== 29) {
            throw new Error("initializer did not retain the binding TDZ");
        }

        export const fixed = 19;
        effects = 0;
        let fixedWriteThrew = false;
        try { fixed = (++effects, 20); }
        catch (error) { fixedWriteThrew = error instanceof TypeError; }
        let fixedCompoundThrew = false;
        try { fixed += (++effects, 2); }
        catch (error) { fixedCompoundThrew = error instanceof TypeError; }
        let fixedUpdateThrew = false;
        try { fixed++; }
        catch (error) { fixedUpdateThrew = error instanceof TypeError; }
        if (!fixedWriteThrew || !fixedCompoundThrew || !fixedUpdateThrew || effects !== 2 || fixed !== 19) {
            throw new Error("immutable lexical Reference write semantics differ");
        }

        export const callable = () => local;
        local = 71;
        if (callableAlias() !== 71) {
            throw new Error("function-valued lexical alias did not read its initialized slot");
        }

        console.log("module-lexical-binding-ok");
    `;
}

const bridgeSource = `
    import { local as target } from "./subject.js";
    export { local as indirect, callable as callableAlias } from "./subject.js";

    export const cycleTdz = [];
    try { target; }
    catch (error) { cycleTdz.push(error instanceof ReferenceError); }
    try { typeof target; }
    catch (error) { cycleTdz.push(error instanceof ReferenceError); }
`;

test("module lexical bindings share one TDZ-aware exporter slot plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-lexical-property-"));
    const entry = path.join(temporary, "subject.js");
    const bridge = path.join(temporary, "bridge.js");
    await Promise.all([
        fs.writeFile(entry, subjectSource(), "utf8"),
        fs.writeFile(bridge, bridgeSource, "utf8"),
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
                moduleRoots: [entry, bridge],
                ignoreCheckJsDirectiveRoots: [entry, bridge],
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("module-lexical-binding-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
