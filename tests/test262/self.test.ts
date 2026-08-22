import { describe, expect, test } from "bun:test";
import { harnessIncludeNames, needsModuleDirectory, siblingModuleResources } from "./inventory";
import { expandModes, parseTest262Metadata, scenarioSource } from "./metadata";
import { parseHostObservation } from "./protocol";
import { judge } from "./run";
import { extractClauseCatalog, independentlyExtractClauseIds } from "./spec-catalog";
import { discoverE2eCaseManifest } from "../e2e/case-manifest";

describe("Test262 metadata and scenarios", () => {
    test("parses CRLF YAML and preserves exact negative phase/type", () => {
        const source = "/*---\r\nesid: sec-example\r\nflags: [async]\r\nnegative:\r\n  phase: parse\r\n  type: SyntaxError\r\n---*/\r\n0;\r\n";
        expect(parseTest262Metadata(source, "example.js")).toEqual({
            esid: "sec-example",
            es5id: undefined,
            es6id: undefined,
            features: [],
            flags: ["async"],
            includes: [],
            negative: { phase: "parse", type: "SyntaxError" },
        });
    });

    test("expands the official execution modes without count ladders", () => {
        const base = { features: [], flags: [], includes: [] };
        expect(expandModes(base, "default.js")).toEqual(["sloppy", "strict"]);
        expect(expandModes({ ...base, flags: ["onlyStrict"] }, "strict.js")).toEqual(["strict"]);
        expect(expandModes({ ...base, flags: ["noStrict"] }, "sloppy.js")).toEqual(["sloppy"]);
        expect(expandModes({ ...base, flags: ["module", "raw"] }, "module.js")).toEqual(["module"]);
        expect(expandModes({ ...base, flags: ["raw"] }, "raw.js")).toEqual(["raw"]);
        expect(() => expandModes({ ...base, flags: ["raw", "noStrict"] }, "raw-sloppy.js")).toThrow("redundant combination");
        expect(() => expandModes({ ...base, flags: ["raw", "async"] }, "invalid.js")).toThrow("forbids harness injection");
        expect(scenarioSource("value;", "strict")).toBe('"use strict";\nvalue;');
        expect(scenarioSource("value;", "raw")).toBe("value;");
    });

    test("orders harness scripts and leaves raw tests unmodified", () => {
        expect(harnessIncludeNames(["async"], ["compareArray.js"])).toEqual([
            "assert.js",
            "sta.js",
            "doneprintHandle.js",
            "compareArray.js",
        ]);
        expect(harnessIncludeNames(["raw"], ["compareArray.js"])).toEqual([]);
        expect(parseTest262Metadata("/*---\nincludes: [assert.js, assert.js]\n---*/", "ordered.js").includes).toEqual([
            "assert.js",
            "assert.js",
        ]);
        expect(() => parseTest262Metadata(
            "/*---\nnegative: { phase: parse, type: SyntaxError, extra: invalid }\n---*/",
            "negative-extra.js",
        )).toThrow("exactly phase and type");
        expect(() => parseTest262Metadata(
            "/*---\nnegative: { type: SyntaxError, phase: parse }\n---*/",
            "negative-order.js",
        )).toThrow("phase must precede type");
    });

    test("materializes one pinned sibling-resource set for every module-loading shape", () => {
        const ordinary = { flags: [], features: [] };
        expect(needsModuleDirectory({ flags: ["module"], features: [] }, "export {};" )).toBeTrue();
        expect(needsModuleDirectory({ flags: ["async"], features: ["dynamic-import"] }, "import(x + suffix);" )).toBeTrue();
        expect(needsModuleDirectory(ordinary, 'eval("import(\'./dep.js\')")')).toBeTrue();
        expect(needsModuleDirectory(ordinary, "const importName = 1;")).toBeFalse();
        expect(siblingModuleResources("test/example/root.js", [
            { path: "test/example/root.js", sha256: "root" },
            { path: "test/example/ordinary-sibling.js", sha256: "module" },
            { path: "test/example/data_FIXTURE.json", sha256: "json" },
            { path: "test/other/not-visible.js", sha256: "other" },
        ])).toEqual([
            { path: "test/example/data_FIXTURE.json", sha256: "json" },
            { path: "test/example/ordinary-sibling.js", sha256: "module" },
        ]);
    });
});

describe("host result contract", () => {
    test("accepts only structured phases and exact negative constructors", () => {
        const observation = parseHostObservation({
            protocolVersion: 1,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "parse",
            errorConstructor: "SyntaxError",
        });
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "parse", type: "SyntaxError" }, async: false },
            observation,
        ).status).toBe("pass");
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "runtime", type: "SyntaxError" }, async: false },
            observation,
        ).status).toBe("fail");
        expect(() => parseHostObservation({
            protocolVersion: 1,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "early",
            errorConstructor: "SyntaxError",
        })).toThrow("invalid phase");
        expect(() => parseHostObservation({
            protocolVersion: 1,
            scenarioId: "forged.js#sloppy",
            kind: "pass",
            detail: "authored verdict",
        })).toThrow("unknown kind");
    });

    test("requires the exact asynchronous completion marker", () => {
        const withoutMarker = parseHostObservation({
            protocolVersion: 1,
            scenarioId: "async.js#sloppy",
            kind: "normal",
        });
        const withMarker = parseHostObservation({
            protocolVersion: 1,
            scenarioId: "async.js#sloppy",
            kind: "normal",
            asyncCompletion: "Test262:AsyncTestComplete",
        });
        expect(judge({ id: "async.js#sloppy", async: true }, withoutMarker).status).toBe("fail");
        expect(judge({ id: "async.js#sloppy", async: true }, withMarker).status).toBe("pass");
    });
});

describe("local evidence worklist", () => {
    test("admits only executable E2E cases and binds negative diagnostics", async () => {
        const manifest = await discoverE2eCaseManifest();
        expect(manifest.some((entry) => entry.name === "_probe_async_string_raw_selector")).toBeFalse();
        const negative = manifest.find((entry) => entry.name === "async_cfg_fail_closed");
        expect(negative?.expectedExitCode).toBe(3);
        expect(negative?.expectedStderrContains).toContain("canonical CFG");
    });
});

describe("pinned specification catalog", () => {
    test("maps canonical, legacy, element, and grammar-production anchors", () => {
        const source = [
            '<emu-clause id="sec-root"><h1>Root</h1>',
            '<emu-clause id="sec-child" oldids="sec-old" namespace="annexB"><h1>Child</h1>',
            '<emu-xref href="#sec-root"></emu-xref>',
            '<emu-note id="note-anchor"></emu-note>',
            '<emu-grammar type="definition">Thing : `x`</emu-grammar>',
            "</emu-clause></emu-clause>",
        ].join("\n");
        const catalog = extractClauseCatalog(source);
        expect(independentlyExtractClauseIds(source)).toEqual(["sec-child", "sec-root"]);
        expect(catalog.clauses.map((clause) => clause.id)).toEqual(["sec-root", "sec-child"]);
        expect(catalog.clauses[1]?.references).toEqual(["sec-root"]);
        expect(new Map(catalog.anchors.map((anchor) => [anchor.id, anchor.clauseId]))).toEqual(new Map([
            ["note-anchor", "sec-child"],
            ["prod-annexB-Thing", "sec-child"],
            ["sec-child", "sec-child"],
            ["sec-old", "sec-child"],
            ["sec-root", "sec-root"],
        ]));
    });

    test("propagates optional and informative clause classification to descendants", () => {
        const source = [
            '<emu-clause id="sec-optional" normative-optional><h1>Optional</h1>',
            '<emu-clause id="sec-optional-child"><h1>Optional child</h1></emu-clause>',
            "</emu-clause>",
            '<emu-annex id="sec-info"><h1>Information</h1>',
            '<emu-clause id="sec-info-child"><h1>Information child</h1></emu-clause>',
            "</emu-annex>",
        ].join("\n");
        expect(extractClauseCatalog(source).clauses.map((clause) => [clause.id, clause.classification])).toEqual([
            ["sec-optional", "normative-optional"],
            ["sec-optional-child", "normative-optional"],
            ["sec-info", "informative"],
            ["sec-info-child", "informative"],
        ]);
    });
});
