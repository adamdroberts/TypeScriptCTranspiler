import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

type ParameterMode = "mapped" | "strict" | "default";

interface ActivationPlan {
    readonly mode: ParameterMode;
    readonly formals: number;
    readonly actual: readonly (string | undefined)[];
    readonly target: number;
    readonly defaultIndex: number | null;
    readonly label: string;
}

interface SourceFactory {
    readonly nextInt: (exclusiveMaximum: number) => number;
    readonly nextValue: (prefix: string) => string;
}

function sourceFactory(seed: number): SourceFactory {
    let state = seed >>> 0;
    let serial = 0;
    return {
        nextInt: (exclusiveMaximum) => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state % exclusiveMaximum;
        },
        nextValue: (prefix) => `${prefix}_${serial++}`,
    };
}

function activationPlan(factory: SourceFactory): ActivationPlan {
    const formals = 1 + factory.nextInt(8);
    const actualLength = 1 + factory.nextInt(11);
    const actual: (string | undefined)[] = Array.from(
        { length: actualLength },
        () => factory.nextValue("arg"),
    );
    const target = factory.nextInt(Math.min(formals, actualLength));
    const mode = (["mapped", "strict", "default"] as const)[factory.nextInt(3)]!;
    const defaultIndex = mode === "default" ? factory.nextInt(formals) : null;
    if (defaultIndex !== null && factory.nextInt(2) === 0 && defaultIndex < actual.length) {
        actual[defaultIndex] = undefined;
    }
    return {
        mode,
        formals,
        actual,
        target,
        defaultIndex,
        label: factory.nextValue("plan"),
    };
}

function expectedArgumentCount(plan: ActivationPlan): number {
    return plan.defaultIndex ?? plan.formals;
}

function stringValue(value: string | undefined): string {
    return value === undefined ? "undefined" : value;
}

function expectedLine(plan: ActivationPlan): string {
    const parameters = Array.from({ length: plan.formals }, (_, index) => {
        const supplied = plan.actual[index];
        if (supplied === undefined && plan.defaultIndex === index) return `fallback_${plan.label}`;
        return supplied;
    });
    const arguments_ = [...plan.actual];
    const initial = parameters[plan.target];
    arguments_[plan.target] = `arguments_${plan.label}`;
    if (plan.mode === "mapped") parameters[plan.target] = arguments_[plan.target];
    const afterArgumentsWrite = parameters[plan.target];
    parameters[plan.target] = `parameter_${plan.label}`;
    if (plan.mode === "mapped") arguments_[plan.target] = parameters[plan.target];
    return [
        expectedArgumentCount(plan),
        plan.actual.length,
        stringValue(initial),
        stringValue(afterArgumentsWrite),
        stringValue(arguments_[plan.target]),
        ...arguments_.map(stringValue),
    ].join(":");
}

function sourceLineExpression(parts: readonly string[]): string {
    return parts.map((part) => `String(${part})`).join(' + ":" + ');
}

function activationSource(plan: ActivationPlan, index: number): string {
    const name = `activation_${index}`;
    const parameters = Array.from({ length: plan.formals }, (_, parameterIndex) => {
        const identifier = `p${parameterIndex}`;
        return plan.defaultIndex === parameterIndex
            ? `${identifier} = ${JSON.stringify(`fallback_${plan.label}`)}`
            : identifier;
    });
    const argumentSnapshots = plan.actual.map((_, argumentIndex) => `arguments[${argumentIndex}]`);
    const target = `p${plan.target}`;
    const strict = plan.mode === "strict" ? '"use strict";' : "";
    const callArguments = plan.actual.map((value) => value === undefined ? "undefined" : JSON.stringify(value));
    return `
        function ${name}(${parameters.join(", ")}) {
            ${strict}
            var initial = ${target};
            arguments[${plan.target}] = ${JSON.stringify(`arguments_${plan.label}`)};
            var afterArgumentsWrite = ${target};
            ${target} = ${JSON.stringify(`parameter_${plan.label}`)};
            console.log(${sourceLineExpression([
                `${name}.length`,
                "arguments.length",
                "initial",
                "afterArgumentsWrite",
                `arguments[${plan.target}]`,
                ...argumentSnapshots,
            ])});
        }
        ${name}(${callArguments.join(", ")});
    `;
}

function nativeSource(plans: readonly ActivationPlan[]): string {
    return [
        ...plans.map(activationSource),
        `
            function innerActivation(value) { throw value; }
            function outerActivation(value) {
                try { innerActivation("inner"); } catch (error) {}
                console.log(String(arguments[0]));
            }
            outerActivation("outer");
            function lexicalArguments(value) {
                var readOuter = () => arguments[0];
                console.log(String(readOuter("inner")));
            }
            lexicalArguments("lexical");
            function calleeIdentity() {
                console.log(String(arguments.callee === calleeIdentity));
            }
            calleeIdentity();
            function strictCallee() {
                "use strict";
                try {
                    arguments.callee;
                    console.log("unreachable");
                } catch (error) {
                    console.log(String(error instanceof TypeError));
                }
            }
            strictCallee();
            /**
             * @param {object} object
             * @param {string|symbol} name
             * @param {PropertyDescriptor|undefined} descriptor
             * @param {object} [options]
             */
            function aliasTarget(object, name, descriptor, options) {
                return arguments.length === 3 && object !== null && name === "name" && descriptor === undefined;
            }
            var aliasFunction = aliasTarget;
            console.log(String(aliasFunction({}, "name", undefined)));
        `,
    ].join("\n");
}

test("ordinary calls preserve one source-derived activation and parameter-map model", async () => {
    const plans = [0x10293847, 0x55667788, 0x90abcdef, 0xfedcba09].map((seed) =>
        activationPlan(sourceFactory(seed))
    );
    // One representative wide input guards the same worklist path against a
    // hidden fixed-shape implementation; its width is not completion evidence.
    plans.push({
        mode: "mapped",
        formals: 72,
        actual: Array.from({ length: 91 }, (_, index) => `stress_${index}`),
        target: 53,
        defaultIndex: null,
        label: "stress",
    });

    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-call-activation-property-"));
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
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString().trimEnd().split("\n")).toEqual([
                ...plans.map(expectedLine),
                "outer",
                "lexical",
                "true",
                "true",
                "true",
            ]);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
