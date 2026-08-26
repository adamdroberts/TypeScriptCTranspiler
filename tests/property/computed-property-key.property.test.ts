import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface KeyPlan {
    readonly expression: string;
    readonly canonical: string;
}

function generatedKeyPlans(): KeyPlan[] {
    const semanticPartitions: KeyPlan[] = [
        { expression: JSON.stringify("alpha"), canonical: "alpha" },
        { expression: "17", canonical: "17" },
        { expression: "3.25", canonical: "3.25" },
        { expression: "true", canonical: "true" },
        { expression: "false", canonical: "false" },
        { expression: "null", canonical: "null" },
        { expression: "undefined", canonical: "undefined" },
        { expression: "{}", canonical: "[object Object]" },
        { expression: "['left', 'right']", canonical: "left,right" },
    ];
    let state = 0x6d2b79f5;
    const generated = Array.from({ length: 12 }, (_, index): KeyPlan => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        if ((state & 1) === 0) {
            const value = state % 10_000;
            return { expression: String(value), canonical: String(value) };
        }
        const value = `generated_${index}_${state.toString(16)}`;
        return { expression: JSON.stringify(value), canonical: value };
    });
    return [...semanticPartitions, ...generated];
}

function expectedLine(index: number): string {
    return [
        `value_${index}`,
        "true",
        `value_${index}!`,
        `value_${index}!`,
        "4",
        "5",
        "true",
        "false",
        "undefined",
    ].join(":");
}

function expectedSharedLine(plans: readonly KeyPlan[]): string {
    const properties = new Map<string, string>();
    plans.forEach((plan, index) => properties.set(plan.canonical, `shared_${index}`));
    return `shared:${plans.map((plan) => properties.get(plan.canonical)).join(",")}`;
}

function nativeSource(plans: readonly KeyPlan[], stressKeys: readonly string[]): string {
    return `
        function setRead(target, key, value) { target[key] = value; return target[key]; }
        function contains(target, key) { return key in target; }
        function append(target, key) { target[key] += "!"; return target[key]; }
        function retain(target, key, value) { target[key] ??= value; return target[key]; }
        function increment(target, key) { return target[key]++; }
        function removeKey(target, key) { return delete target[key]; }
        function optionalRead(target, key) { return target?.[key]; }

        var keys = [${plans.map((plan) => plan.expression).join(", ")}];
        for (var i = 0; i < keys.length; i++) {
            var target = {};
            var value = "value_" + String(i);
            var written = setRead(target, keys[i], value);
            var present = contains(target, keys[i]);
            var combined = append(target, keys[i]);
            var retained = retain(target, keys[i], "replacement");
            var numeric = {};
            setRead(numeric, keys[i], 4);
            var before = increment(numeric, keys[i]);
            var after = numeric[keys[i]];
            var removed = removeKey(target, keys[i]);
            var absent = contains(target, keys[i]);
            var optional = optionalRead(target, keys[i]);
            console.log(
                String(written) + ":" + String(present) + ":" + String(combined) + ":" +
                String(retained) + ":" + String(before) + ":" + String(after) + ":" +
                String(removed) + ":" + String(absent) + ":" + String(optional)
            );
        }

        var shared = {};
        for (var sharedSet = 0; sharedSet < keys.length; sharedSet++) {
            shared[keys[sharedSet]] = "shared_" + String(sharedSet);
        }
        var sharedLine = "shared:";
        for (var sharedGet = 0; sharedGet < keys.length; sharedGet++) {
            if (sharedGet !== 0) sharedLine += ",";
            sharedLine += String(shared[keys[sharedGet]]);
        }
        console.log(sharedLine);

        var dataSymbol = Symbol("literal-data");
        var methodSymbol = Symbol("literal-method");
        var accessorSymbol = Symbol("literal-accessor");
        var literalTrace = 0;
        var backing = 1;
        function literalKey(key, label) { literalTrace = literalTrace * 10 + label; return key; }
        var literal = {
            [literalKey(dataSymbol, 1)]: (literalTrace = literalTrace * 10 + 2, 11),
            [literalKey(methodSymbol, 3)]() {
                literalTrace = literalTrace * 10 + 6;
                return this[dataSymbol];
            },
            get [literalKey(accessorSymbol, 4)]() {
                literalTrace = literalTrace * 10 + 8;
                return backing;
            },
            set [literalKey(accessorSymbol, 5)](value) {
                literalTrace = literalTrace * 10 + 7;
                backing = value;
            }
        };
        var methodResult = literal[methodSymbol]();
        literal[accessorSymbol] = 7;
        var accessorResult = literal[accessorSymbol];
        var dataDescriptor = Object.getOwnPropertyDescriptor(literal, dataSymbol);
        var methodDescriptor = Object.getOwnPropertyDescriptor(literal, methodSymbol);
        var accessorDescriptor = Object.getOwnPropertyDescriptor(literal, accessorSymbol);
        console.log(
            "literal:" + literalTrace + ":" + String(methodResult) + ":" +
            String(accessorResult) + ":" + String(dataDescriptor.writable) + ":" +
            String(dataDescriptor.enumerable) + ":" + String(dataDescriptor.configurable) + ":" +
            String(methodDescriptor.writable) + ":" + String(methodDescriptor.enumerable) + ":" +
            String(methodDescriptor.configurable) + ":" + String(typeof accessorDescriptor.get) + ":" +
            String(typeof accessorDescriptor.set) + ":" + String(accessorDescriptor.enumerable) + ":" +
            String(accessorDescriptor.configurable)
        );

        // One representative wide object exercises the same canonical key
        // path without treating its width as completion evidence.
        var stressKeys = [${stressKeys.map((key) => JSON.stringify(key)).join(", ")}];
        var wide = {};
        for (var j = 0; j < stressKeys.length; j++) wide[stressKeys[j]] = j;
        var checksum = 0;
        for (var k = 0; k < stressKeys.length; k++) checksum += Number(wide[stressKeys[k]]);
        console.log("stress:" + String(checksum));
    `;
}

test("computed property operations share one runtime key-coercion model", async () => {
    const plans = generatedKeyPlans();
    const stressKeys = Array.from({ length: 137 }, (_, index) => `stress_key_${index}`);
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-computed-key-property-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, nativeSource(plans, stressKeys), "utf8");
        const expected = [
            ...plans.map((_, index) => expectedLine(index)),
            expectedSharedLine(plans),
            "literal:12345678:11:7:true:true:true:true:true:true:function:function:true:true",
            `stress:${stressKeys.reduce((sum, _, index) => sum + index, 0)}`,
        ];
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
