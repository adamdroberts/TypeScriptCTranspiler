import {nodeReferenceSync} from './node-reference';
import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { createEcmaSourceFile } from "../../src/ecmascript-source";
import { earlyControlFlowStaticSemanticsFailure } from "../../src/control-static-semantics";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

test("one expression graph preserves optional-chain References, guards and operand order", async () => {
    const pieces = [
        'function check(label,callback){try{print(label+":"+callback());}catch(error){print(label+":"+(error.name||error)+":"+effects.join(","));}}',
        'var effects=[];function key(){effects.push("key");return "value";}function arg(){effects.push("arg");return 31;}function collect(){if(NATIVE_GC)$262.gc();return 37;}',
    ];
    const expressions = [
        'root?.leaf.value', 'root?.leaf?.value', 'root?.[key()].value',
        'delete root?.leaf.value', 'delete root?.leaf?.value', 'delete root?.[key()].value',
        'root?.method(arg()).value', 'root?.method?.(arg()).value',
        '(root?.method)(arg()).value', '(root?.method)?.(arg()).value',
        'delete root?.method(arg()).value', 'delete root?.method?.(arg()).value',
        '(root?.leaf).value', 'delete (root?.leaf).value',
    ];
    for (const [index, expression] of expressions.entries()) for (const empty of [false, true]) {
        pieces.push(`check("${index}:${empty}",function(){effects=[];var leaf={get value(){effects.push("value");return 41;}};var root=${empty ? "null" : '{tag:43,get leaf(){effects.push("leaf");return leaf;},method(value){effects.push("method:"+this.tag+":"+value);return leaf;}}'};var result=${expression};return result+":"+effects.join(",");});`);
    }
    for (const expression of ['root?.method(yield "argument").value', 'root.method?.(yield "argument").value',
        '(root?.method)(yield "argument").value', 'delete root?.[yield "key"].value']) {
        for (const empty of [false, true]) pieces.push(`check(${JSON.stringify("yield:" + expression + ":" + empty)},function(){effects=[];var root=${empty ? "null" : '{tag:107,leaf:{value:109},method(value){effects.push("method:"+this.tag+":"+value);return this.leaf;}}'};function* subject(){return ${expression};}var iterator=subject(),first=iterator.next();effects.push("first:"+first.value+":"+first.done);var final=first.done?first:iterator.next(expressionKey());return final.value+":"+final.done+":"+effects.join(",");function expressionKey(){return ${expression.includes('[yield') ? '"leaf"' : '113'};}});`);
    }
    pieces.push(
        'check("callee-null",function(){effects=[];var root={method:null};var result=delete root.method?.(arg());return result+":"+effects.join(",");});',
        'check("parenthesized-receiver",function(){var root={tag:47,method(){return this.tag;}};return (root.method)?.();});',
        'check("tagged-receiver",function(){var root={tag:101,method(strings){return this.tag+":"+strings[0];}};return (root?.method)`tag`;});',
        'check("constructed",function(){var root={Owner:function(value){this.tag=value;}};return new (root?.Owner)(103).tag;});',
        'check("primitive-receiver",function(){return "hello".slice?.(1);});',
        'check("Math-owner",function(){return Math?.max(53,59);});',
        'check("private",function(){class C{#value=61;read(other){return other?.#value;}}var owner=new C();return owner.read(owner)+":"+owner.read(null);});',
        'check("super",function(){class Base{method(){return this.tag;}}class Derived extends Base{method(){return super.method?.();}}var owner=new Derived();owner.tag=67;return owner.method();});',
        'var scope=71;check("indirect-eval",function(){var scope=73;return eval?.("scope;");});',
        'check("GC",function(){var root={tag:79,get method(){collect();return function(value){return this.tag+value;};}};return root.method?.(collect());});',
        'check("abrupt-key",function(){var root={};return root?.[{toString(){throw 83;}}];});',
        'check("delete-no-get",function(){var root={get value(){throw 89;}};return delete root?.value;});',
    );
    const chain = "root?" + ".next".repeat(512) + ".tag";
    pieces.push(`check("deep",function(){var root={tag:97};root.next=root;return ${chain};});`);
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-optional-chain-"));
    try {
        const entry = path.join(directory, "source.js");
        const oracleSource = pieces.join("\n").replaceAll("NATIVE_GC", "false");
        await fs.writeFile(entry, oracleSource);
        const oracle = nodeReferenceSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});', entry], { stdout: "pipe", stderr: "pipe" });
        expect({ exitCode: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
        const expected = oracle.stdout.toString().trimEnd().split("\n");
        for (const noGc of [false, true]) {
            await fs.writeFile(entry, pieces.join("\n").replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(directory, "program-" + noGc), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: path.join(directory, "build-" + noGc),
                isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/optional-chain-references.js#sloppy", setupEntries: [], testEntry: entry, async: false, scriptEntries: [entry] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exitCode: native.exitCode, stderr: native.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout?.trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
}, 600_000);

test("optional-chain grammar distinguishes transparent boundaries from tag and constructor targets", () => {
    const sources: string[] = [];
    for (const target of ["root?.member", "root?.[key]", "root.method?.()", "(root?.member)"]) {
        for (const source of [target + "`tag`;", "new " + target + "();", "new (" + target + ")();"])
            for (const strict of [false, true]) sources.push((strict ? '"use strict";' : "") + source);
    }
    for (const source of ["root?.`tag`;", "root?.`tag${value}`;"])
        for (const strict of [false, true]) sources.push((strict ? '"use strict";' : "") + source);
    sources.push("root?" + ".next".repeat(512) + "`tag`;");
    const oracle = nodeReferenceSync(["node", "-e", 'const vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(source=>{try{new vm.Script(source);return true;}catch(error){if(error.name!=="SyntaxError")throw error;return false;}})));', JSON.stringify(sources)], { stdout: "pipe", stderr: "pipe" });
    expect({exitCode: oracle.exitCode, stderr: oracle.stderr.toString()}).toEqual({exitCode: 0, stderr: ""});
    const expected: boolean[] = JSON.parse(oracle.stdout.toString());
    for (const [index, source] of sources.entries()) {
        const tree = createEcmaSourceFile("optional-chain.js", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, "script");
        const diagnostics = (tree as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
        const accepted = !diagnostics?.length && earlyControlFlowStaticSemanticsFailure(tree) === null;
        expect({source, accepted}).toEqual({source, accepted: expected[index]});
    }
});
