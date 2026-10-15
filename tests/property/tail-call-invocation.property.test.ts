import {nodeReferenceSync} from './node-reference';
import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import { isTailPositionCall } from "../../src/tail-position";
import { parseHostObservation } from "../test262/protocol";

test("canonical invocation records hand off strict tail calls without retaining caller frames", async () => {
    const pieces = [
        '"use strict";',
        'function check(label,callback){try{print(label+":"+callback());}catch(error){print(label+":"+(error.name||error));}}',
        'var effects=[];function collect(){if(NATIVE_GC)$262.gc();return 31;}',
    ];
    for (const result of ['37', '"value"', '{tag:41}']) {
        for (const body of ['return next(value);', 'return (next(value));', 'return true?next(value):43;',
            'return false||next(value);', 'return true&&next(value);', 'return null??next(value);',
            'return (effects.push("comma"),next(value));', 'try{throw 47;}catch(error){return next(value);}',
            'try{}finally{return next(value);}', 'try{return next(value);}catch(error){return error.name;}',
            'try{return next(value);}finally{effects.push("finally");}']) {
            pieces.push(`check(${JSON.stringify(result+":"+body)},function(){effects=[];function next(value){effects.push("next:"+value);return ${result};}function source(value){"use strict";${body}}var value=source(53);return (typeof value==="object"?value.tag:value)+":"+effects.join(",");});`);
        }
    }
    pieces.push(
        'check("receiver",function(){var owner={tag:59,first(value){return this.second(value);},second(value){return this.tag+value;}};return owner.first(61);});',
        'check("tag",function(){var owner={tag:67,first(){return this.second`value`;},second(strings){return this.tag+":"+strings[0];}};return owner.first();});',
        'check("spread-effects",function(){effects=[];function next(){return Array.prototype.join.call(arguments,",");}function source(){"use strict";return next(...{[Symbol.iterator](){return {next(){effects.push("next");return {done:true};}};}},collect(),71);}return source()+":"+effects.join(",");});',
        'check("abrupt-callee",function(){function source(){"use strict";return ({get method(){throw 73;}}).method();}try{return source();}catch(error){return error;}});',
        'check("abrupt-target",function(){function source(){"use strict";return target();}function target(){throw 79;}try{return source();}catch(error){return error;}});',
        'check("construct",function(){function Owner(){"use strict";return target();}function target(){return {tag:83};}return new Owner().tag;});',
        'check("with-finally",function(){effects=[];function source(){"use strict";try{return target();}finally{effects.push("cleanup");}}function target(){throw 89;}try{source();}catch(error){return error+":"+effects.join(",");}});',
        'check("retained-closure",function(){function source(value){var held={tag:value};return (function(){collect();return held.tag;})();}return source(131);});',
        'check("getter",function(){var owner={get value(){return target();}};function target(){return 137;}return owner.value;});',
        'check("saved-callee",function(){var owner={method:function(value){return 139+value;}};function argument(){owner.method=function(){return 149;};return 2;}function source(){return owner.method(argument());}return source();});',
        'check("arguments-owner",function(){var saved;function first(value){saved=arguments;return second(value);}function second(value){return (saved===arguments)+":"+arguments[0];}return first(151);});',
        'check("deep",function(){"use strict";function left(n){return n?targets[n%3](n-1):97;}function right(n){try{throw null;}catch(error){return n?left.call(null,n-1):97;}}var targets=[right,right.bind(null),new Proxy(right,{apply(target,receiver,args){return Reflect.apply(target,receiver,args);}})];return left(TAIL_DEPTH);});',
    );
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-tail-invocation-"));
    try {
        const entry = path.join(directory, "source.js");
        const oracleSource = pieces.join("\n").replaceAll("NATIVE_GC", "false").replaceAll("TAIL_DEPTH", "17");
        await fs.writeFile(entry, oracleSource);
        const oracle = nodeReferenceSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});', entry], { stdout: "pipe", stderr: "pipe" });
        expect({ exitCode: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
        const expected = oracle.stdout.toString().trimEnd().split("\n");
        for (const noGc of [false, true]) {
            await fs.writeFile(entry, pieces.join("\n").replaceAll("NATIVE_GC", String(!noGc)).replaceAll("TAIL_DEPTH", "100000"));
            const output = path.join(directory, "program-" + noGc), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: path.join(directory, "build-" + noGc),
                isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/tail-call-invocation.js#sloppy", setupEntries: [], testEntry: entry, async: false, scriptEntries: [entry] },
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

test("tail positions follow the source path and completion obligations", () => {
    const templates: [string, boolean][] = [
        ['return TARGET();',true], ['return (TARGET());',true], ['return true?TARGET():0;',true],
        ['return false||TARGET();',true], ['return TARGET()||0;',false], ['return TARGET()+1;',false],
        ['try{return TARGET();}catch(error){}',false], ['try{}catch(error){return TARGET();}',true],
        ['try{return TARGET();}finally{}',false], ['try{}finally{return TARGET();}',true],
        ['for(const value of []){return TARGET();}',false], ['for(const key in {}){return TARGET();}',true],
    ];
    for (const [body, expected] of templates) for (const strict of [false,true]) {
        const tree=ts.createSourceFile("tail.js",`function owner(){${strict?'"use strict";':''}${body}}`,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
        const worklist:ts.Node[]=[tree];let actual:boolean|undefined;
        while(worklist.length){const node=worklist.pop()!;if(ts.isCallExpression(node)&&node.expression.getText(tree)==="TARGET")actual=isTailPositionCall(node);ts.forEachChild(node,child=>{worklist.push(child)});}
        expect({body,strict,actual}).toEqual({body,strict,actual:strict&&expected});
    }
});
