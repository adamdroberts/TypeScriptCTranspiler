import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

const reExportDepth = 24;

const targetSource = `
    import * as self from "./target.js";

    let descriptorTdz = false;
    try { Object.getOwnPropertyDescriptor(self, "lexical"); }
    catch (error) { descriptorTdz = error instanceof ReferenceError; }
    let enumerationTdz = false;
    try { Object.keys(self); }
    catch (error) { enumerationTdz = error instanceof ReferenceError; }
    export const tdzObservation = [descriptorTdz, enumerationTdz];

    export var mutable = 11;
    export let lexical = 13;
    export const fixed = 17;
    var renamed = 19;
    export { renamed };
    export default 23;

    export function advance() {
        mutable = 29;
        lexical = 31;
        renamed = 37;
    }

    export class Marker {
        static value = 41;
    }
`;

const bridgeSource = `
    export * as nested from "./target.js";
    export * from "./target.js";
`;

function reExportSource(index: number): string {
    const target = index === 0 ? "bridge" : `deep-${index - 1}`;
    return `export { nested } from "./${target}.js";\n`;
}

const leftSource = `
    export const collision = "left";
    export const leftOnly = 43;
`;

const rightSource = `
    export const collision = "right";
    export const rightOnly = 47;
`;

const ambiguousSource = `
    export * from "./left.js";
    export * from "./right.js";
`;

const defaultFunctionSource = `
    export default function(value, increment = 53) {
        return value + increment;
    }
`;

function entrySource(): string {
    return `
        import * as direct from "./target.js";
        import * as again from "./target.js";
        import * as bridge from "./bridge.js";
        import { nested } from "./deep-${reExportDepth - 1}.js";
        import * as ambiguous from "./ambiguous.js";
        import * as defaultFunction from "./default-function.js";

        function check(condition, message) {
            if (!condition) throw new Error(message);
        }

        check(direct === again, "one Module Record produced multiple namespace identities");
        check(direct === nested, "namespace re-export lost the target Module Record identity");
        check(bridge.nested === direct, "nested namespace export did not expose the target namespace");
        check(direct.default === 23, "direct namespace omitted the default export");
        check(bridge.default === undefined, "export star incorrectly forwarded default");
        check(ambiguous.collision === undefined, "ambiguous star export was not excluded");
        check(ambiguous.leftOnly === 43 && ambiguous.rightOnly === 47, "unambiguous star exports were excluded");
        check(direct.advance === direct.advance, "named function export identity changed between reads");
        check(defaultFunction.default === defaultFunction.default, "anonymous default function identity changed between reads");
        check(defaultFunction.default.name === "default", "anonymous default function name was not inferred");
        check(defaultFunction.default.length === 1, "anonymous default function length differs");
        check(defaultFunction.default(48) === 101, "anonymous default function namespace binding is not callable");
        check(direct.tdzObservation[0] === true && direct.tdzObservation[1] === true, "namespace metadata bypassed a lexical TDZ");

        check(direct.mutable === 11 && direct.lexical === 13 && direct.renamed === 19, "initial live bindings differ");
        direct.advance();
        check(direct.mutable === 29 && direct.lexical === 31 && direct.renamed === 37, "namespace getters captured stale values");
        check(direct.Marker.value === 41, "namespace class binding differs");

        const names = Object.getOwnPropertyNames(direct);
        const sortedNames = names.slice().sort();
        check(names.join("|") === sortedNames.join("|"), "namespace string keys are not sorted");
        check(names.indexOf("default") >= 0 && names.indexOf("mutable") >= 0, "namespace key set is incomplete");
        const symbols = Object.getOwnPropertySymbols(direct);
        check(symbols.length === 1 && symbols[0] === Symbol.toStringTag, "namespace symbol key set differs");
        const allKeys = Reflect.ownKeys(direct);
        check(allKeys.length === names.length + 1, "Reflect.ownKeys did not preserve every PropertyKey");
        check(allKeys[allKeys.length - 1] === Symbol.toStringTag, "namespace symbol key was not ordered after exports");

        const descriptor = Object.getOwnPropertyDescriptor(direct, "mutable");
        check(
            descriptor.value === 29 && descriptor.writable === true &&
            descriptor.enumerable === true && descriptor.configurable === false &&
            descriptor.get === undefined && descriptor.set === undefined,
            "namespace export descriptor is not the specified data descriptor"
        );
        check(Object.getPrototypeOf(direct) === null, "namespace prototype is not null");
        check(Object.isExtensible(direct) === false, "namespace is extensible");
        check(Object.isSealed(direct) === true, "namespace is not sealed");
        check(Object.isFrozen(direct) === false, "non-empty namespace is frozen");
        check(Object.prototype.toString.call(direct) === "[object Module]", "namespace toStringTag differs");

        check(Reflect.set(direct, "mutable", 101) === false, "Reflect.set changed an export");
        let assignmentThrew = false;
        try { direct.mutable = 101; }
        catch (error) { assignmentThrew = error instanceof TypeError; }
        check(assignmentThrew && direct.mutable === 29, "strict assignment did not reject the namespace write");

        check(Reflect.deleteProperty(direct, "mutable") === false, "Reflect.deleteProperty removed an export");
        check(Reflect.deleteProperty(direct, "absent") === true, "Reflect.deleteProperty rejected an absent key");
        let deleteThrew = false;
        try { delete direct.mutable; }
        catch (error) { deleteThrew = error instanceof TypeError; }
        check(deleteThrew && direct.mutable === 29, "strict delete did not reject an exported key");

        check(Reflect.defineProperty(direct, "mutable", { value: 29 }) === true, "compatible definition was rejected");
        check(Object.defineProperty(direct, "mutable", {}) === direct, "empty compatible definition was rejected");
        check(Reflect.defineProperty(direct, "mutable", { value: 101 }) === false, "incompatible definition succeeded");
        let defineThrew = false;
        try { Object.defineProperty(direct, "mutable", { value: 101 }); }
        catch (error) { defineThrew = error instanceof TypeError; }
        check(defineThrew, "Object.defineProperty did not throw for an incompatible definition");
        const compatibleDynamicKeys = ["mutable", Symbol.toStringTag];
        for (const compatibleDynamicKey of compatibleDynamicKeys) {
            check(
                Reflect.defineProperty(direct, compatibleDynamicKey, {}) === true,
                "dynamic compatible key was rejected: " + compatibleDynamicKey.toString()
            );
            check(
                Object.defineProperty(direct, compatibleDynamicKey, {}) === direct,
                "Object.defineProperty changed dynamic compatible key: " + compatibleDynamicKey.toString()
            );
        }
        const rejectedDynamicKeys = ["missing", 0, Symbol("missing"), Symbol.iterator];
        for (const rejectedDynamicKey of rejectedDynamicKeys) {
            check(
                Reflect.defineProperty(direct, rejectedDynamicKey, {}) === false,
                "dynamic absent key was accepted: " + rejectedDynamicKey.toString()
            );
            let rejectedDynamicThrew = false;
            try {
                (function () { Object.defineProperty(direct, rejectedDynamicKey, {}); })();
            } catch (error) {
                rejectedDynamicThrew = error instanceof TypeError;
            }
            check(
                rejectedDynamicThrew,
                "Object.defineProperty accepted dynamic absent key: " + rejectedDynamicKey.toString()
            );
        }
        let freezeThrew = false;
        try { Object.freeze(direct); }
        catch (error) { freezeThrew = error instanceof TypeError; }
        check(freezeThrew && Object.isFrozen(direct) === false, "Object.freeze changed a namespace export");

        check(typeof Object.setPrototypeOf === "function", "Object.setPrototypeOf is not callable");
        check(Object.is(Object.setPrototypeOf(direct, null), direct), "setting the existing null prototype failed");
        check(Reflect.setPrototypeOf(direct, null) === true, "Reflect rejected the existing null prototype");
        check(Reflect.setPrototypeOf(direct, {}) === false, "Reflect changed the namespace prototype");
        let prototypeThrew = false;
        try { (function() { Object.setPrototypeOf(direct, {}); })(); }
        catch (error) { prototypeThrew = error instanceof TypeError; }
        check(prototypeThrew && Object.getPrototypeOf(direct) === null, "Object.setPrototypeOf changed the namespace prototype");

        const unknown = Symbol("unknown");
        check(direct[unknown] === undefined, "unknown symbol read differs");
        check((unknown in direct) === false && Reflect.has(direct, unknown) === false, "unknown symbol presence differs");
        check(Reflect.set(direct, unknown, 1) === false, "unknown symbol write succeeded");
        check(Reflect.deleteProperty(direct, unknown) === true, "unknown symbol delete failed");
        check(direct[Symbol.iterator] === undefined, "namespace unexpectedly has @@iterator");

        console.log("module-namespace-exotic-ok");
    `;
}

test("module namespace objects derive exotic behavior from one resolved export plan", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-module-namespace-property-"));
    const entry = path.join(temporary, "entry.js");
    const target = path.join(temporary, "target.js");
    const bridge = path.join(temporary, "bridge.js");
    const left = path.join(temporary, "left.js");
    const right = path.join(temporary, "right.js");
    const ambiguous = path.join(temporary, "ambiguous.js");
    const defaultFunction = path.join(temporary, "default-function.js");
    const deep = Array.from({ length: reExportDepth }, (_, index) => path.join(temporary, `deep-${index}.js`));
    const roots = [entry, target, bridge, left, right, ambiguous, defaultFunction, ...deep];
    await Promise.all([
        fs.writeFile(entry, entrySource(), "utf8"),
        fs.writeFile(target, targetSource, "utf8"),
        fs.writeFile(bridge, bridgeSource, "utf8"),
        fs.writeFile(left, leftSource, "utf8"),
        fs.writeFile(right, rightSource, "utf8"),
        fs.writeFile(ambiguous, ambiguousSource, "utf8"),
        fs.writeFile(defaultFunction, defaultFunctionSource, "utf8"),
        ...deep.map((filename, index) => fs.writeFile(filename, reExportSource(index), "utf8")),
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
            expect(process.stderr.toString()).toBe("");
            expect(process.exitCode).toBe(0);
            expect(process.stdout.toString()).toBe("module-namespace-exotic-ok\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
