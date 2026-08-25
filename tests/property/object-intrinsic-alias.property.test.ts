import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface DescriptorPlan {
    readonly key: string;
    readonly value: string;
    readonly writable: boolean;
    readonly enumerable: boolean;
    readonly configurable: boolean;
}

function descriptorPlans(seed: number, count: number): DescriptorPlan[] {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    const prefixes = ["plain", "17", "space key", "café", "_"] as const;
    return Array.from({ length: count }, (_, index) => {
        const bits = next();
        return {
            key: `${prefixes[bits % prefixes.length]}_${index}_${bits.toString(16)}`,
            value: `value_${index}_${next().toString(16)}`,
            writable: (bits & 1) !== 0,
            enumerable: (bits & 2) !== 0,
            configurable: (bits & 4) !== 0,
        };
    });
}

function nativeSource(plans: readonly DescriptorPlan[]): string {
    const stressFormals = Array.from({ length: 41 }, (_, index) => `formal_${index}`);
    const lastStressFormal = stressFormals.at(-1)!;
    const definitions = plans.map((plan) => `
        definePropertyAlias(target, ${JSON.stringify(plan.key)}, {
            value: ${JSON.stringify(plan.value)},
            writable: ${plan.writable},
            enumerable: ${plan.enumerable},
            configurable: ${plan.configurable},
        });
        var descriptor_${plan.key.length}_${plan.value.length}_${plans.indexOf(plan)} =
            getOwnPropertyDescriptorAlias(target, ${JSON.stringify(plan.key)});
        console.log([
            hasOwnPropertyAlias(target, ${JSON.stringify(plan.key)}),
            descriptor_${plan.key.length}_${plan.value.length}_${plans.indexOf(plan)}.value,
            descriptor_${plan.key.length}_${plan.value.length}_${plans.indexOf(plan)}.writable,
            descriptor_${plan.key.length}_${plan.value.length}_${plans.indexOf(plan)}.enumerable,
            descriptor_${plan.key.length}_${plan.value.length}_${plans.indexOf(plan)}.configurable,
            propertyIsEnumerableAlias(target, ${JSON.stringify(plan.key)}),
        ].join(":"));
    `);
    return `
        var definePropertyAlias = Object.defineProperty;
        var getOwnPropertyDescriptorAlias = Object.getOwnPropertyDescriptor;
        var getOwnPropertyNamesAlias = Object.getOwnPropertyNames;
        var hasOwnPropertyAlias = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
        var propertyIsEnumerableAlias = Function.prototype.call.bind(Object.prototype.propertyIsEnumerable);
        var joinAlias = Function.prototype.call.bind(Array.prototype.join);
        var target = {};
        ${definitions.join("\n")}
        console.log(joinAlias(getOwnPropertyNamesAlias(target), "|"));
        function dynamicIdentity(value) {
            return value;
        }
        function inspectNarrowedNames(value) {
            /** @type {string[]} */
            var names = dynamicIdentity(getOwnPropertyNamesAlias(value));
            var allStrings = true;
            for (var index = 0; index < names.length; index++) {
                allStrings = allStrings && typeof names[index] === "string";
            }
            console.log(joinAlias(names, "|") + ":" + String(allStrings));
        }
        inspectNarrowedNames(target);
        console.log([
            Object(target) === target,
            Object(false).valueOf(),
            Object("boxed").valueOf(),
            new Object(12).valueOf(),
        ].join(":"));

        var accessorTrace = [];
        var directAccessorTarget = {};
        function directGetter(missing, ...remaining) {
            accessorTrace.push([
                "direct-get",
                this === directAccessorTarget,
                missing === undefined,
                remaining.length,
            ].join(":"));
        }
        function directSetter(first, missing, ...remaining) {
            accessorTrace.push([
                "direct-set",
                this === directAccessorTarget,
                first,
                missing === undefined,
                remaining.length,
            ].join(":"));
        }
        definePropertyAlias(directAccessorTarget, "value", {
            get: directGetter,
            set: directSetter,
            configurable: true,
        });
        void directAccessorTarget.value;
        directAccessorTarget.value = "written";

        var closureAccessorTarget = {};
        definePropertyAlias(closureAccessorTarget, "value", {
            get: function (first = "getter-default", ...remaining) {
                accessorTrace.push([
                    "closure-get",
                    this === closureAccessorTarget,
                    first,
                    remaining.length,
                ].join(":"));
                return first;
            },
            set: function (...actuals) {
                accessorTrace.push([
                    "closure-set",
                    this === closureAccessorTarget,
                    actuals.length,
                    actuals[0],
                ].join(":"));
            },
            configurable: true,
        });
        accessorTrace.push("closure-read:" + closureAccessorTarget.value);
        closureAccessorTarget.value = "assigned";

        var zeroSetterTarget = {};
        definePropertyAlias(zeroSetterTarget, "value", {
            set: function () { accessorTrace.push("zero-set"); },
        });
        zeroSetterTarget.value = "ignored";

        var stressAccessorTarget = {};
        function stressSetter(${stressFormals.join(", ")}) {
            accessorTrace.push([
                "stress-set",
                formal_0,
                ${lastStressFormal} === undefined,
            ].join(":"));
        }
        definePropertyAlias(stressAccessorTarget, "value", { set: stressSetter });
        stressAccessorTarget.value = "stress-value";
        console.log(accessorTrace.join("|"));
    `;
}

function expectedOutput(plans: readonly DescriptorPlan[]): string[] {
    return [
        ...plans.map((plan) => [
            true,
            plan.value,
            plan.writable,
            plan.enumerable,
            plan.configurable,
            plan.enumerable,
        ].join(":")),
        plans.map((plan) => plan.key).join("|"),
        `${plans.map((plan) => plan.key).join("|")}:true`,
        "true:false:boxed:12",
        [
            "direct-get:true:true:0",
            "direct-set:true:written:true:0",
            "closure-get:true:getter-default:0",
            "closure-read:getter-default",
            "closure-set:true:1:assigned",
            "zero-set",
            "stress-set:stress-value:true",
        ].join("|"),
    ];
}

test("Object intrinsic aliases share one descriptor and key worklist", async () => {
    const plans = descriptorPlans(0x7f4a7c15, 13);
    // This single wide input guards the same key/descriptor worklist against a
    // hidden fixed-shape lowering. Its width is not completion evidence.
    plans.push(...descriptorPlans(0x51ed270b, 67));

    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-object-intrinsic-alias-"));
    const entry = path.join(temporary, "subject.js");
    try {
        await fs.writeFile(entry, nativeSource(plans), "utf8");
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
            expect(process.stderr.toString()).toBe("");
            expect(process.exitCode).toBe(0);
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual(expectedOutput(plans));
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
