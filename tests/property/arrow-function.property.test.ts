import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyFunctionStaticSemanticsFailure } from "../../src/function-static-semantics";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

function parsedScript(source: string): ts.SourceFile {
    return createEcmaSourceFile(
        "arrow-function-property.js",
        source,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS,
    );
}

interface EarlyErrorPartition {
    readonly source: string;
    readonly diagnostic: string | null;
}

const earlyErrorPartitions: readonly EarlyErrorPartition[] = [
    {
        source: "(value, value) => value;\n",
        diagnostic: "ArrowFormalParameters BoundNames contains duplicate 'value'",
    },
    {
        source: "({ left: { value } }, [value]) => value;\n",
        diagnostic: "ArrowFormalParameters BoundNames contains duplicate 'value'",
    },
    {
        source: "(value) => { let value; };\n",
        diagnostic: "arrow parameter 'value' conflicts with a body lexical declaration",
    },
    {
        source: "([value]) => { 'use strict'; return value; };\n",
        diagnostic: "a use strict directive is not permitted with a non-simple parameter list",
    },
    {
        source: "(...rest = []) => rest;\n",
        diagnostic: "a rest parameter cannot have an initializer",
    },
    {
        source: "(...rest,) => rest;\n",
        diagnostic: "a rest parameter must be the final parameter and cannot have a trailing comma",
    },
    {
        source: "async (value = await 1) => value;\n",
        diagnostic: "ArrowParameters contains AwaitExpression",
    },
    {
        source: "function* outer() { (value = yield 1) => value; }\n",
        diagnostic: "ArrowParameters contains YieldExpression",
    },
    {
        source: "'use strict'; arguments => arguments;\n",
        diagnostic: "binding identifier 'arguments' is not permitted in strict mode",
    },
    {
        source: "'use strict'; ({ value: eval }) => eval;\n",
        diagnostic: "binding identifier 'eval' is not permitted in strict mode",
    },
    {
        source: "'use strict'; package => package;\n",
        diagnostic: "binding identifier 'package' is not permitted in strict mode",
    },
    {
        source: "arguments => arguments;\n",
        diagnostic: null,
    },
    {
        source: "(value = function* () { yield 1; }) => value;\n",
        diagnostic: null,
    },
    {
        source: "(first, second) => { var first; let third; return second; };\n",
        diagnostic: null,
    },
    {
        source: "function ordinary(value, value) { return value; }\n",
        diagnostic: null,
    },
];

interface CoverGrammarPartition {
    readonly source: string;
    readonly valid: boolean;
}

const coverGrammarPartitions: readonly CoverGrammarPartition[] = [
    { source: "({ value }) => value;\n", valid: true },
    { source: "([value]) => value;\n", valid: true },
    { source: "(value = 1) => value;\n", valid: true },
    { source: "(...values) => values;\n", valid: true },
    { source: "(left + right) => left;\n", valid: false },
    { source: "({ value: 1 }) => value;\n", valid: false },
    { source: "(...values,) => values;\n", valid: false },
    { source: "(value)\n=> value;\n", valid: false },
];

function parseDiagnostics(sourceFile: ts.SourceFile): readonly ts.Diagnostic[] {
    return (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
        .parseDiagnostics ?? [];
}

test("arrow static semantics derive from one source worklist and binding tree", () => {
    for (const partition of earlyErrorPartitions) {
        const failure = earlyFunctionStaticSemanticsFailure(parsedScript(partition.source));
        if (partition.diagnostic === null) expect(failure).toBeNull();
        else expect(failure?.message).toContain(partition.diagnostic);
    }

    for (const partition of coverGrammarPartitions) {
        const sourceFile = parsedScript(partition.source);
        const diagnostics = parseDiagnostics(sourceFile);
        const staticFailure = earlyFunctionStaticSemanticsFailure(sourceFile);
        expect(diagnostics.length === 0 && staticFailure === null).toBe(partition.valid);
    }
});

function subjectSource(): string {
    return `
        var failures = [];
        function check(condition, label) { if (!condition) failures.push(label); }
        function checkThrowsExact(label, constructor, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) {
                check(error.constructor === constructor, label + ":constructor:" +
                    (error && error.constructor ? error.constructor.name : typeof error));
            }
        }
        function checkThrowsIdentity(label, sentinel, callback) {
            try { callback(); check(false, label + ":missing"); }
            catch (error) { check(error === sentinel, label + ":identity"); }
        }

        var order = [];
        var ordered = ((first = (order.push("first"), 3),
            second = (order.push("second"), first + 4), ...tail) =>
            [first, second, tail.length])(undefined, undefined, 8, 9);
        check(order.join("|") === "first|second", "default-order");
        check(ordered.join("|") === "3|7|2", "default-prior-and-rest");

        var computedCalls = 0;
        function computedKey() { computedCalls++; return "selected"; }
        var source = { selected: 17, omitted: 19, kept: 23 };
        var delayed = (([first = 11, , ...tail],
            { [computedKey()]: selected = 13, omitted, ...remaining }) => {
            check(first === 11 && tail.join("|") === "2|3", "array-binding-tree");
            check(selected === 17 && omitted === 19 && remaining.kept === 23,
                "object-binding-tree");
            check(remaining.selected === undefined && remaining.omitted === undefined,
                "object-rest-exclusion");
            return () => first + tail.length + selected + omitted + remaining.kept;
        })([undefined, 99, 2, 3], source);
        check(computedCalls === 1, "computed-key-once");
        check(delayed() === 72, "parameter-capture");

        checkThrowsExact("later-parameter-tdz", ReferenceError, function() {
            ((first = second, second = 1) => first)(undefined, 1);
        });
        checkThrowsExact("self-parameter-tdz", ReferenceError, function() {
            ((first = first) => first)(undefined);
        });
        checkThrowsExact("object-null", TypeError, function() {
            (({ value }) => value)(null);
        });
        checkThrowsExact("array-null", TypeError, function() {
            (([value]) => value)(null);
        });

        var closeCount = 0;
        var iterable = {};
        iterable[Symbol.iterator] = function() {
            return {
                next: function() { return { value: 29, done: false }; },
                return: function() { closeCount++; return { done: true }; }
            };
        };
        check((([head]) => head)(iterable) === 29, "iterator-value");
        check(closeCount === 1, "iterator-close");

        var abrupt = {};
        var sentinel = {};
        abrupt[Symbol.iterator] = function() {
            return { next: function() { throw sentinel; } };
        };
        checkThrowsIdentity("iterator-abrupt", sentinel, function() {
            (([head]) => head)(abrupt);
        });

        check(((value) => value + 1)(4) === 5, "expression-concise-body");
        check(((value) => { value + 1; })(4) === undefined, "block-empty-completion");
        check(((value) => { return value + 1; })(4) === 5, "block-return");
        check((() => ({ value: 31 }))().value === 31, "object-expression-body");

        function makeArrow() { return (value = 2) => this.base + value; }
        var lexical = makeArrow.call({ base: 40 });
        check(lexical() === 42, "lexical-this-direct");
        check(lexical.call({ base: 100 }, 2) === 42, "lexical-this-call");
        check(lexical.apply({ base: 100 }, [2]) === 42, "lexical-this-apply");
        check(lexical.bind({ base: 100 }, 2)() === 42, "lexical-this-bind");
        function lexicalHof() {
            return [2].map(value => this.base + value, { base: 100 })[0];
        }
        check(lexicalHof.call({ base: 40 }) === 42, "lexical-this-hof");

        function makeNestedArrow() { return () => () => this; }
        var receiver = {};
        var nested = makeNestedArrow.call(receiver)();
        check(nested.call({}) === receiver, "nested-lexical-this");

        var surface = () => {};
        check(!surface.hasOwnProperty("caller") && !surface.hasOwnProperty("arguments"),
            "restricted-not-own");
        checkThrowsExact("restricted-caller-get", TypeError, function() { return surface.caller; });
        checkThrowsExact("restricted-caller-set", TypeError, function() { surface.caller = {}; });
        checkThrowsExact("restricted-arguments-get", TypeError, function() { return surface.arguments; });
        checkThrowsExact("restricted-arguments-set", TypeError, function() { surface.arguments = {}; });
        var marker = {};
        surface.extra = marker;
        check(surface.extra === marker && surface.hasOwnProperty("extra"), "ordinary-function-set");
        var callerDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "caller");
        var argumentsDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "arguments");
        check(callerDescriptor.get !== undefined && callerDescriptor.set !== undefined &&
            callerDescriptor.enumerable === false && callerDescriptor.configurable === false,
            "caller-descriptor");
        check(argumentsDescriptor.get !== undefined && argumentsDescriptor.set !== undefined &&
            argumentsDescriptor.enumerable === false && argumentsDescriptor.configurable === false,
            "arguments-descriptor");

        print(failures.length === 0 ? "arrow-function-ok" : failures.join(","));
    `;
}

test("arrow functions share one formal-binding and lexical-this runtime path", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-arrow-function-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/arrow-function.js#sloppy";
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
                stdout: "arrow-function-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
