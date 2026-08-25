import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseAotFunctionBodyConstant } from "../../src/runtime-code-aot";

function bodyPlan(seed: number): string {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        return state;
    };
    const whitespace = ["", " ", "\t", "\n"][next() % 4]!;
    const parentheses = 1 + (next() % 9);
    return `${whitespace}return${whitespace || " "}${"(".repeat(parentheses)}this${")".repeat(parentheses)}${
        (next() & 1) === 0 ? ";" : ""
    }${whitespace}`;
}

test("static Function global-this bodies share one parsed AOT semantic", async () => {
    const bodies = [
        0x10293847,
        0x55667788,
        0x90abcdef,
        0xfedcba09,
    ].flatMap((seed) => Array.from({ length: 7 }, (_, offset) => bodyPlan(seed ^ offset)));
    for (const body of bodies) {
        expect(parseAotFunctionBodyConstant(body)).toEqual({ kind: "global-this" });
    }
    expect(parseAotFunctionBodyConstant('"use strict"; return this;')).toBeNull();
    expect(parseAotFunctionBodyConstant("return other;")).toBeNull();

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-runtime-code-aot-property-"));
    const entry = path.join(root, "in.ts");
    const executable = path.join(root, "program");
    const buildDir = path.join(root, "build");
    const source = 'const expectedGlobal: any = Function("return this;")();\n' +
        'if (expectedGlobal.Object !== Object) throw new Error("wrong global intrinsic");\n' +
        bodies.map((body, index) =>
        `const generated${index}: any = Function(${JSON.stringify(body)});\n` +
        `if (generated${index}() !== expectedGlobal) throw new Error("wrong global this");`
        ).join("\n") + '\nconsole.log("global-this-aot");\n';
    await fs.writeFile(entry, source);
    try {
        const result = await compile({ entry, output: executable, buildDir });
        expect(result.exitCode).toBe(0);
        const child = Bun.spawn([executable], { stdout: "pipe", stderr: "pipe" });
        const [exitCode, stdout, stderr] = await Promise.all([
            child.exited,
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
        ]);
        expect(exitCode).toBe(0);
        expect(stderr).toBe("");
        expect(stdout).toBe("global-this-aot\n");
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
}, 60_000);
