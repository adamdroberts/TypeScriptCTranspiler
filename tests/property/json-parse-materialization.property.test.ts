import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

interface ValidParseProbe {
    readonly label: string;
    readonly source: string;
    readonly observation: string;
    readonly expected: string;
}

const validProbes: readonly ValidParseProbe[] = [
    { label: "null", source: "null", observation: "value === null", expected: "true" },
    { label: "boolean", source: "true", observation: "value === true", expected: "true" },
    { label: "whitespace", source: "\t\r\n null \x20", observation: "value === null", expected: "true" },
    { label: "negative-zero", source: "-0", observation: "1 / value", expected: "-Infinity" },
    { label: "fraction-exponent", source: "-12.5e+3", observation: "value", expected: "-12500" },
    {
        label: "integer-rounding",
        source: "9007199254740993",
        observation: "value === 9007199254740992",
        expected: "true",
    },
    { label: "overflow", source: "1e400", observation: "value === Infinity", expected: "true" },
    { label: "underflow", source: "1e-400", observation: "value === 0", expected: "true" },
    {
        label: "string-escapes",
        source: '"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u0000\\uD800"',
        observation: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map((index) => `String(value.charCodeAt(${index}))`)
            .join(" + ',' + "),
        expected: "34,92,47,8,12,10,13,9,0,55296",
    },
    {
        label: "array",
        source: '[1,{"x":true},null]',
        observation: "String(value.length) + ':' + String(value[0]) + ':' + String(value[1].x) + ':' + String(value[2] === null)",
        expected: "3:1:true:true",
    },
    {
        label: "object-own-data",
        source: '{"__proto__":{"safe":true},"duplicate":1,"duplicate":2}',
        observation: [
            "String(Object.getPrototypeOf(value) === Object.prototype)",
            "String(Object.hasOwn(value, '__proto__'))",
            "String(value.__proto__.safe)",
            "String(value.duplicate)",
        ].join(" + ':' + "),
        expected: "true:true:true:2",
    },
];

const invalidSources: readonly [label: string, source: string][] = [
    ["empty", ""],
    ["leading-plus", "+1"],
    ["leading-point", ".1"],
    ["leading-zero", "01"],
    ["incomplete-fraction", "1."],
    ["incomplete-exponent", "1e"],
    ["array-trailing-comma", "[1,]"],
    ["object-missing-value", '{"key":}'],
    ["object-unquoted-key", "{key: 1}"],
    ["unsupported-escape", '"\\x20"'],
    ["raw-control", '"raw\u0001control"'],
    ["trailing-input", "true false"],
    ["vertical-tab", "\vnull"],
    ["form-feed", "\fnull"],
    ["no-break-space", "\u00a0null"],
    ["byte-order-mark", "\ufeffnull"],
];

function subjectSource(): string {
    const valid = validProbes.flatMap((probe, index) => {
        const valueName = `value${index}`;
        const observation = probe.observation.replace(/\bvalue\b/g, valueName);
        return [
            `const ${valueName}: any = JSON.parse(${JSON.stringify(probe.source)});`,
            `console.log(${JSON.stringify(`${probe.label}:`)} + String(${observation}));`,
        ];
    });
    const invalid = invalidSources.flatMap(([label, source]) => [
        "try {",
        `  JSON.parse(${JSON.stringify(source)});`,
        `  console.log(${JSON.stringify(`${label}:accepted`)});`,
        "} catch (error) {",
        `  console.log(${JSON.stringify(`${label}:`)} + String(error instanceof SyntaxError));`,
        "}",
    ]);
    return [...valid, ...invalid, ""].join("\n");
}

test("JSON.parse materializes the strict grammar partitions through one runtime worklist", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-json-parse-property-"));
    const entry = path.join(temporary, "subject.ts");
    const expected = [
        ...validProbes.map((probe) => `${probe.label}:${probe.expected}`),
        ...invalidSources.map(([label]) => `${label}:true`),
        "",
    ].join("\n");
    try {
        await fs.writeFile(entry, subjectSource(), "utf8");
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
            expect(process.stdout.toString()).toBe(expected);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
