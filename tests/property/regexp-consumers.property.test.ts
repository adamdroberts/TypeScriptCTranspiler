import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

type Operation = "replace" | "split" | "match" | "search";
type Plan = { operation: Operation; source: string; pattern: string; flags: string; replacement?: string; limit?: number };
function encode(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (Array.isArray(value)) return "[" + value.map(encode).join("|") + "]";
    if (typeof value !== "string") return String(value);
    return Array.from({ length: value.length }, (_, index) => value.charCodeAt(index)).join(",");
}
function plans(): Plan[] {
    const result: Plan[] = [];
    for (const source of ["", "abc", "aaa", "A\u{1f600}B\u{1f600}", "\ud83d\ude00"]) {
        for (const [pattern, flags] of [["", "g"], ["", "gu"], [".", "g"], [".", "gu"],
            ["(a)|(b)", "g"], ["\\ud83d", "g"], ["(?<part>.)(.)?", "gu"]]) {
            for (const operation of ["replace", "split", "match", "search"] as const) {
                result.push({ operation, source, pattern: pattern!, flags: flags!, replacement: "$$:$&:$1:$2:$12:$<part>" });
                if (operation === "split") result.push({ operation, source, pattern: pattern!, flags: flags!, limit: 2 });
            }
        }
    }
    return result;
}
function observe(plan: Plan): unknown {
    const re = new RegExp(plan.pattern, plan.flags);
    switch (plan.operation) {
        case "replace": return plan.source.replace(re, plan.replacement!);
        case "split": return plan.source.split(re, plan.limit);
        case "match": return plan.source.match(re);
        case "search": return plan.source.search(re);
    }
}

test("native RegExp consumers share UTF-16 offsets, capture worklists and empty advancement", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-consumers-"));
    const plan = plans();
    const source = `
        function encode(value) {
            if (value === undefined) return "undefined";
            if (value === null) return "null";
            if (Array.isArray(value)) {
                var parts = [];
                for (var index = 0; index < value.length; index++) parts.push(encode(value[index]));
                return "[" + parts.join("|") + "]";
            }
            if (typeof value !== "string") return String(value);
            var units = [];
            for (var index = 0; index < value.length; index++) units.push(value.charCodeAt(index));
            return units.join(",");
        }
        ${plan.map((entry, index) => {
            const re = `new RegExp(${JSON.stringify(entry.pattern)}, ${JSON.stringify(entry.flags)})`;
            const receiver = `Reflect.get({ text: ${JSON.stringify(entry.source)} }, "text")`;
            const args = entry.operation === "replace" ? `, ${JSON.stringify(entry.replacement)}` :
                entry.operation === "split" && entry.limit !== undefined ? `, ${entry.limit}` : "";
            return `print(${JSON.stringify(String(index) + ":")} + encode(${receiver}.${entry.operation}(${re}${args})));`;
        }).join("\n")}
        var calls = [];
        var dynamicText = Reflect.get({ text: "aab" }, "text");
        var output = dynamicText.replace(/(?<part>a)(b)?/g, function(match, part, optional, offset, input, groups) {
            calls.push(encode([match, part, optional, offset, input, groups.part, Object.getPrototypeOf(groups) === null]));
            return "[" + offset + "]";
        });
        print("callback:" + output + ":" + calls.join(";"));
    `;
    const calls: string[] = [];
    const output = "aab".replace(/(?<part>a)(b)?/g, (...args) => {
        const [match, part, optional, offset, input, groups] = args;
        calls.push(encode([match, part, optional, offset, input, groups.part, Object.getPrototypeOf(groups) === null]));
        return `[${offset}]`;
    });
    const expected = plan.map((entry, index) => `${index}:${encode(observe(entry))}\n`).join("") +
        `callback:${output}:${calls.join(";")}\n`;
    try {
        const entry = path.join(temporary, "subject.js"); await fs.writeFile(entry, source);
        for (const noGc of [false, true]) {
            const executable = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: executable, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/regexp-consumers.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal"); expect(observation.stdout).toBe(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);
