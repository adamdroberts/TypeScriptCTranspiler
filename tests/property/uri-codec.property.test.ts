import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface EncodeProbe {
    readonly label: string;
    readonly input: string;
    readonly uri: string;
    readonly component: string;
}

interface DecodeProbe {
    readonly label: string;
    readonly input: string;
    readonly uri: string;
    readonly component: string;
}

const encodeProbes: readonly EncodeProbe[] = [
    {
        label: "always-unescaped",
        input: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()",
        uri: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()",
        component: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()",
    },
    {
        label: "uri-reserved",
        input: ";/?:@&=+$,#",
        uri: ";/?:@&=+$,#",
        component: "%3B%2F%3F%3A%40%26%3D%2B%24%2C%23",
    },
    { label: "ascii-escape", input: " \"%", uri: "%20%22%25", component: "%20%22%25" },
    { label: "two-byte-low", input: "\u0080", uri: "%C2%80", component: "%C2%80" },
    { label: "two-byte-high", input: "\u07ff", uri: "%DF%BF", component: "%DF%BF" },
    { label: "three-byte-low", input: "\u0800", uri: "%E0%A0%80", component: "%E0%A0%80" },
    { label: "three-byte-high", input: "\uffff", uri: "%EF%BF%BF", component: "%EF%BF%BF" },
    { label: "four-byte-low", input: "\u{10000}", uri: "%F0%90%80%80", component: "%F0%90%80%80" },
    { label: "four-byte-high", input: "\u{10ffff}", uri: "%F4%8F%BF%BF", component: "%F4%8F%BF%BF" },
] as const;

const decodeProbes: readonly DecodeProbe[] = [
    { label: "literal-copy", input: "plain \u03a9 \u{1f600}", uri: "plain \u03a9 \u{1f600}", component: "plain \u03a9 \u{1f600}" },
    { label: "ascii-upper", input: "%41%7E%25", uri: "A~%", component: "A~%" },
    { label: "ascii-lower", input: "%61%7e", uri: "a~", component: "a~" },
    { label: "nul", input: "a%00b", uri: "a\0b", component: "a\0b" },
    {
        label: "preserved-reserved-case",
        input: "%3b%2F%3f%3A%40%26%3D%2b%24%2C%23",
        uri: "%3b%2F%3f%3A%40%26%3D%2b%24%2C%23",
        component: ";/?:@&=+$,#",
    },
    { label: "two-byte-low", input: "%C2%80", uri: "\u0080", component: "\u0080" },
    { label: "two-byte-high", input: "%DF%BF", uri: "\u07ff", component: "\u07ff" },
    { label: "three-byte-low", input: "%E0%A0%80", uri: "\u0800", component: "\u0800" },
    { label: "three-byte-high", input: "%EF%BF%BF", uri: "\uffff", component: "\uffff" },
    { label: "four-byte-low", input: "%F0%90%80%80", uri: "\u{10000}", component: "\u{10000}" },
    { label: "four-byte-high", input: "%F4%8F%BF%BF", uri: "\u{10ffff}", component: "\u{10ffff}" },
] as const;

const malformedEncodings = [
    "%", "%0", "%GG", "%80", "%BF", "%C0%AF", "%C1%BF", "%C2",
    "%C2%20", "%C2A0", "%E0%9F%BF", "%ED%A0%80", "%ED%BF%BF", "%E1%80",
    "%E1%7F%80", "%F0%8F%BF%BF", "%F4%90%80%80", "%F5%80%80%80", "%FF",
] as const;

const roundTripScalars = ["A", " ", "\u0080", "\u0800", "\u{10000}", "\u{10ffff}"] as const;

function subjectSource(): string {
    const lines = [
        "var failures = [];",
        "function check(condition, label) { if (!condition) failures.push(label); }",
        "function checkValue(label, callback, expected) {",
        "  try { check(callback() === expected, label); }",
        "  catch (error) { failures.push(label + ':throw:' + (error && error.name)); }",
        "}",
        "function checkThrows(label, constructor, callback) {",
        "  try { callback(); check(false, label + ':missing'); }",
        "  catch (error) { check(error instanceof constructor, label + ':type'); }",
        "}",
    ];
    for (const probe of encodeProbes) {
        const input = JSON.stringify(probe.input);
        lines.push(
            `checkValue(${JSON.stringify(`encodeURI:${probe.label}`)}, function() { return encodeURI(${input}); }, ${JSON.stringify(probe.uri)});`,
            `checkValue(${JSON.stringify(`encodeURIComponent:${probe.label}`)}, function() { return encodeURIComponent(${input}); }, ${JSON.stringify(probe.component)});`,
            `checkValue(${JSON.stringify(`encodeURI-reflect:${probe.label}`)}, function() { return Reflect.apply(globalThis.encodeURI, null, [${input}]); }, ${JSON.stringify(probe.uri)});`,
            `checkValue(${JSON.stringify(`encodeURIComponent-reflect:${probe.label}`)}, function() { return Reflect.apply(globalThis.encodeURIComponent, null, [${input}]); }, ${JSON.stringify(probe.component)});`,
        );
    }
    for (const probe of decodeProbes) {
        const input = JSON.stringify(probe.input);
        lines.push(
            `checkValue(${JSON.stringify(`decodeURI:${probe.label}`)}, function() { return decodeURI(${input}); }, ${JSON.stringify(probe.uri)});`,
            `checkValue(${JSON.stringify(`decodeURIComponent:${probe.label}`)}, function() { return decodeURIComponent(${input}); }, ${JSON.stringify(probe.component)});`,
            `checkValue(${JSON.stringify(`decodeURI-reflect:${probe.label}`)}, function() { return Reflect.apply(globalThis.decodeURI, null, [${input}]); }, ${JSON.stringify(probe.uri)});`,
            `checkValue(${JSON.stringify(`decodeURIComponent-reflect:${probe.label}`)}, function() { return Reflect.apply(globalThis.decodeURIComponent, null, [${input}]); }, ${JSON.stringify(probe.component)});`,
        );
    }
    for (const input of malformedEncodings) {
        const source = JSON.stringify(input);
        lines.push(
            `checkThrows(${JSON.stringify(`decodeURI-malformed:${input}`)}, URIError, function() { decodeURI(${source}); });`,
            `checkThrows(${JSON.stringify(`decodeURIComponent-malformed:${input}`)}, URIError, function() { decodeURIComponent(${source}); });`,
        );
    }
    for (const [index, scalar] of roundTripScalars.entries()) {
        const source = JSON.stringify(scalar);
        lines.push(
            `checkValue(${JSON.stringify(`uri-round-trip:${index}`)}, function() { return decodeURI(encodeURI(${source})); }, ${source});`,
            `checkValue(${JSON.stringify(`component-round-trip:${index}`)}, function() { return decodeURIComponent(encodeURIComponent(${source})); }, ${source});`,
        );
    }
    lines.push(`
        var high = String.fromCharCode(0xd800);
        var low = "\\udfff";
        checkValue("high-surrogate-preservation", function() { return high.isWellFormed(); }, false);
        checkValue("low-surrogate-preservation", function() { return low.isWellFormed(); }, false);
        checkValue("high-surrogate-repair", function() { return high.toWellFormed(); }, "\ufffd");
        checkValue("low-surrogate-repair", function() { return low.toWellFormed(); }, "\ufffd");
        checkThrows("encodeURI-high-surrogate", URIError, function() { encodeURI(high); });
        checkThrows("encodeURIComponent-low-surrogate", URIError, function() { encodeURIComponent(low); });
        checkThrows("encodeURI-reflect-high-surrogate", URIError,
            function() { Reflect.apply(globalThis.encodeURI, null, [high]); });
        checkValue("surrogate-pair-encode",
            function() { return encodeURI(String.fromCharCode(0xd83d, 0xde00)); },
            "%F0%9F%98%80");

        var trace = "";
        var inputObject = {
            valueOf: function() { trace += "wrong"; return 1; },
            toString: function() { trace += "s"; return "a b"; }
        };
        function ignored() { trace += "i"; return 0; }
        checkValue("object-to-string", function() { return encodeURIComponent(inputObject, ignored()); }, "a%20b");
        check(trace === "is", "arguments-before-to-string");
        checkValue("null-to-string", function() { return encodeURI(null); }, "null");
        checkValue("bigint-to-string", function() { return encodeURI(1n); }, "1");
        checkThrows("symbol-to-string", TypeError, function() { encodeURI(Symbol("uri")); });
        var sentinel = {};
        var abrupt = { toString: function() { throw sentinel; } };
        var exact = false;
        try { Reflect.apply(globalThis.decodeURI, null, [abrupt]); }
        catch (error) { exact = error === sentinel; }
        check(exact, "abrupt-identity");

        print(failures.length === 0 ? "uri-codec-ok" : failures.join(","));
    `);
    return lines.join("\n");
}

test("URI Encode and Decode share one strict scalar codec", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-uri-codec-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/uri-codec.js#sloppy";
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
                initializationEntries: [entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(parseHostObservation(JSON.parse(process.stdout.toString()))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: "uri-codec-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
