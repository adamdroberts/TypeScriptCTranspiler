import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

test("delete distinguishes declarative References and expression values without GetValue on bindings", async () => {
    const syntax: string[] = [];
    for (const operand of ["x", "(x)", "((x))", "object.x", "object[key]", "(0,x)", "void x", "null", "delete 0"]) {
        for (const strict of [false, true]) syntax.push((strict ? '"use strict";' : "") + `delete ${operand};`);
        syntax.push(`class C{method(){delete ${operand};}}`);
    }
    syntax.push('"use strict";delete ' + "(".repeat(256) + "x" + ")".repeat(256) + ";");
    const oracleSyntax = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")).map(source=>{try{new vm.Script(source);return true;}catch(error){if(error instanceof SyntaxError)return false;throw error;}})));'],
        { stdin: new Blob([JSON.stringify(syntax)]), stdout: "pipe", stderr: "pipe" });
    expect({ exitCode: oracleSyntax.exitCode, stderr: oracleSyntax.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
    const accepted = syntax.map(source => {
        const tree = createEcmaSourceFile("source.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
        return earlyControlFlowStaticSemanticsFailure(tree) === null;
    });
    expect(accepted).toEqual(JSON.parse(oracleSyntax.stdout.toString()));
    const pieces = [
        'function local(){var x=31;return (delete x)+":"+x;}print(local());',
        'function lexical(){let x=37;return (delete x)+":"+x;}print(lexical());',
        'function constant(){const x=41;return (delete x)+":"+x;}print(constant());',
        'function formal(x){return (delete x)+":"+x;}print(formal(43));',
        'function tdz(){var result=delete x;let x=47;return result+":"+x;}print(tdz());',
        'try{throw 53;}catch(x){print(delete(x));print(x);}',
        'print(delete missing);try{delete (0,missing);}catch(error){print(error.name);}',
        'var count=0;print(delete void (++count));print(count);',
        'try{delete (function(){throw 59;})();}catch(error){print(error);}',
        'var object={get value(){print(61);return 67;}};print(delete (0,object.value));',
        'print(delete object.value);print(object.value);',
        'print(' + "delete ".repeat(256) + '0);',
    ];
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-delete-reference-"));
    try {
        const entry = path.join(directory, "source.js");
        await fs.writeFile(entry, pieces.join("\n"));
        const oracle = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});', entry], { stdout: "pipe", stderr: "pipe" });
        expect({ exitCode: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
        const expected = oracle.stdout.toString().trimEnd().split("\n");
        for (const noGc of [false, true]) {
            const output = path.join(directory, "program-" + noGc), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: path.join(directory, "build-" + noGc),
                isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/delete-reference.js#sloppy", setupEntries: [], testEntry: entry, async: false, scriptEntries: [entry] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exitCode: native.exitCode, stderr: native.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout?.trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
}, 300_000);
