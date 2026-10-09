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
    for (const source of ["Ab AB ab", "\naB\nAB", "AbB ABb"]) {
        for (const [pattern, flags] of [["(?i:(a))b", "g"], ["(?-i:(a))b", "gi"],
            ["(?im:^a.$)", "g"], ["(?i:[\\q{ab|a}])b", "gv"]]) {
            for (const operation of ["replace", "split", "match", "search"] as const)
                result.push({ operation, source, pattern: pattern!, flags: flags!, replacement: "[$&:$1]" });
        }
    }
    for (const source of ["", "aa", "bb", "aabb", "abab", "xz"])
        for (const flags of ["", "g", "gu", "gv"])
            for (const pattern of ["(?<part>a)|(?<part>b)", "(?:(?<part>a)|(?<part>b))\\k<part>",
                "(?:(?<left>a)(?<right>a)|(?<right>b)(?<left>b))", "(?:(?<part>x)|(?<part>y)|z){2}\\k<part>"])
                for (const operation of ["replace", "split", "match", "search"] as const)
                    result.push({ operation, source, pattern, flags, replacement: "[$&:$<part>:$<left>:$<right>]" });
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
        var plans = JSON.parse(${JSON.stringify(JSON.stringify(plan))});
        for (var index = 0; index < plans.length; index++) {
            var entry = plans[index];
            var regexp = new RegExp(entry.pattern, entry.flags);
            var receiver = Reflect.get({ text: entry.source }, "text");
            var observed;
            switch (entry.operation) {
                case "replace": observed = receiver.replace(regexp, entry.replacement); break;
                case "split": observed = receiver.split(regexp, entry.limit); break;
                case "match": observed = receiver.match(regexp); break;
                case "search": observed = receiver.search(regexp); break;
            }
            print(index + ":" + encode(observed));
        }
        var calls = [];
        var dynamicText = Reflect.get({ text: "aab" }, "text");
        var output = dynamicText.replace(/(?<part>a)(b)?/g, function(match, part, optional, offset, input, groups) {
            calls.push(encode([match, part, optional, offset, input, groups.part, Object.getPrototypeOf(groups) === null]));
            return "[" + offset + "]";
        });
        print("callback:" + output + ":" + calls.join(";"));
        var namedCalls = [];
        var namedOutput = dynamicText.replace(/(?<part>a)|(?<part>b)/g, function(match, left, right, offset, input, groups) {
            namedCalls.push(encode([left, right, groups.part, Object.getPrototypeOf(groups) === null]));
            return groups.part.toUpperCase();
        });
        print("named-callback:" + namedOutput + ":" + namedCalls.join(";"));
    `;
    const calls: string[] = [];
    const output = "aab".replace(/(?<part>a)(b)?/g, (...args) => {
        const [match, part, optional, offset, input, groups] = args;
        calls.push(encode([match, part, optional, offset, input, groups.part, Object.getPrototypeOf(groups) === null]));
        return `[${offset}]`;
    });
    const namedCalls: string[] = [];
    const namedOutput = "aab".replace(new RegExp("(?<part>a)|(?<part>b)", "g"), (...args) => {
        const [match, left, right, offset, input, groups] = args;
        namedCalls.push(encode([left, right, groups.part, Object.getPrototypeOf(groups) === null]));
        return groups.part.toUpperCase();
    });
    const expected = plan.map((entry, index) => `${index}:${encode(observe(entry))}\n`).join("") +
        `callback:${output}:${calls.join(";")}\n` + `named-callback:${namedOutput}:${namedCalls.join(";")}\n`;
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
