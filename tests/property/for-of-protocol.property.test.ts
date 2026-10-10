import { expect, test } from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const completions = {
    normal: `log.push("body:" + value);`,
    continue: `log.push("body:" + value); continue;`,
    break: `log.push("body:" + value); break;`,
    return: `log.push("body:" + value); return { answer: value };`,
    throw: `log.push("body:" + value); throw marker;`,
};
const returnMethods = {
    missing: `undefined`, null: `null`, invalid: `1`,
    object: `function() { log.push("return:" + (this === iterator) + ":" + arguments.length); return {}; }`,
    primitive: `function() { log.push("return"); return 1; }`,
    throw: `function() { log.push("return"); throw closeError; }`,
    getterThrow: `throw closeError;`,
};
const plans = Object.entries(completions).flatMap(([completion, body]) =>
    Object.entries(returnMethods).map(([close, method]) => {
        const getReturn = close === "getterThrow" ? method : `return ${method};`;
        return `{
            var log = [], marker = {}, closeError = {}, index = 0;
            var iterator = {
                get next() { log.push("get-next"); return function() {
                    log.push("next:" + index + ":" + (this === iterator) + ":" + arguments.length);
                    return { get done() { log.push("done:" + index); return index >= 2; },
                        get value() { log.push("value:" + index); return ++index; } };
                }; },
                get return() { log.push("get-return"); ${getReturn} }
            };
            var iterable = { get [Symbol.iterator]() { log.push("get-iterator"); return function() {
                log.push("iterator:" + (this === iterable) + ":" + arguments.length); return iterator;
            }; } };
            function run() { for (const value of iterable) { ${body} } return "finished"; }
            try { var answer = run(); print("plan:${completion}:${close}:" + (answer === "finished" ? answer : answer.answer) + ":" + log.join(",")); }
            catch (error) { print("plan:${completion}:${close}:" + (error === marker ? "marker" : error === closeError ? "close" : error.name) + ":" + log.join(",")); }
        }`;
    }),
).join("\n");

const partitions = String.raw`
function tracked(log, name, count) {
    var index = 0;
    return { [Symbol.iterator]: function() { return {
        next: function() { log.push(name + "-next:" + index); return { done: index >= count, value: index++ }; },
        return: function() { log.push(name + "-return"); return {}; }
    }; } };
}
for (var failure of ["next", "result", "done", "value"]) {
    var log = [], marker = {};
    var iterable = { [Symbol.iterator]: function() { return {
        next: function() { log.push("next"); if (failure === "next") throw marker;
            if (failure === "result") return 1;
            return { get done() { log.push("done"); if (failure === "done") throw marker; return false; },
                get value() { log.push("value"); throw marker; } };
        }, return: function() { log.push("return"); return {}; }
    }; } };
    try { for (const value of iterable) { log.push("body"); } }
    catch (error) { print("step:" + failure + ":" + (error === marker ? "marker" : error.name) + ":" + log.join(",")); }
}
var log = [], values = [1];
for (const value of values) { log.push(value); if (value === 1) values.push(2); }
print("live:" + log.join(","));
var old = String.prototype[Symbol.iterator];
String.prototype[Symbol.iterator] = function() { return [8, 9].values(); };
var log = [];
for (const value of "abc") log.push(value);
String.prototype[Symbol.iterator] = old;
print("string-override:" + log.join(","));
var array = [1];
array[Symbol.iterator] = function() { return [4, 5].values(); };
var log = [];
for (const value of array) log.push(value);
print("array-override:" + log.join(","));
var log = [];
outer: for (const value of tracked(log, "outer", 2)) {
    for (const inner of tracked(log, "inner", 2)) { log.push("body:" + value + ":" + inner); continue outer; }
}
print("outer-continue:" + log.join(","));
var log = [];
exit: for (const value of tracked(log, "outer", 2)) {
    for (const inner of tracked(log, "inner", 2)) { switch (inner) { case 0: log.push("body"); break exit; } }
}
print("outer-break:" + log.join(","));
var log = [], marker = {}, closeError = {};
var bad = { [Symbol.iterator]: function() { return { next: function() { throw marker; }, return: function() { log.push("inner-return"); return {}; } }; } };
try { for (const value of tracked(log, "outer", 2)) for (const inner of bad) {} }
catch (error) { print("outer-step-error:" + (error === marker) + ":" + log.join(",")); }
var log = [];
for (const value of tracked(log, "normal", 3)) {
    switch (value) { case 0: log.push("switch"); break; default: continue; }
}
print("inner-break:" + log.join(","));
var log = [];
try { for (const outer of tracked(log, "outer", 2)) { for (outer of tracked(log, "inner", 2)) {} } }
catch (error) { print("assignment-error:" + error.name + ":" + log.join(",")); }
var log = [], callbacks = [];
var iterable = { [Symbol.iterator]: function() { var index = 0; return {
    next: function() { return index++ < 2 ? { value: { source: [undefined, { nested: index }, 7, 8] }, done: false } : { done: true }; },
    return: function() { log.push("outer-return"); return {}; }
}; } };
for (let { source: [first = 5, { nested }, ...rest] } of iterable) {
    callbacks.push(function() { nested++; return first + ":" + nested + ":" + rest.join(","); });
}
print("binding-capture:" + callbacks.map(function(callback) { return callback(); }).join("/") + ":" + callbacks.map(function(callback) { return callback(); }).join("/") + ":" + log.join(","));
var log = [];
var iterable = { [Symbol.iterator]: function() { return {
    next: function() { return { done: false, value: {} }; }, return: function() { log.push("return"); return {}; }
}; } };
try { for (let { first = later, later = 2 } of iterable) {} }
catch (error) { print("binding-tdz:" + error.name + ":" + log.join(",")); }
var log = [];
var iterable = { [Symbol.iterator]: function() { return {
    next: function() { return { done: false, value: { get x() { log.push("get-x"); throw marker; } } }; },
    return: function() { log.push("return"); throw closeError; }
}; } };
try { for (const { x } of iterable) {} }
catch (error) { print("binding-error:" + (error === marker) + ":" + log.join(",")); }
function freshReturn() {
    var iterable = { [Symbol.iterator]: function() { return {
        next: function() { return { done: false, value: 1 }; },
        return: function() { if (NATIVE_GC) $262.gc(); return {}; }
    }; } };
    for (const value of iterable) return { answer: "retained" };
}
print("return-root:" + freshReturn().answer);
for (const source of [null, undefined, 1, true, 1n, Symbol("source"), {}]) {
    try { for (const value of source) {} } catch (error) { print("non-iterable:" + error.name); }
}
var headProbe, bodyProbe;
for (let [name, missing = headProbe = function() { return name; }] of [["inside"]]) {
    bodyProbe = function() { return name; };
}
print("binding-probes:" + headProbe() + ":" + bodyProbe());
try { for (let self of self) {} } catch (error) { print("head-tdz:" + error.name); }
var log = [];
var nested = { [Symbol.iterator]: function() { return { next: 1, return: function() { log.push("nested-return"); return {}; } }; } };
for (const [] of [nested]) { log.push("empty-body"); break; }
print("empty-binding:" + log.join(","));
var log = [];
var nested = { [Symbol.iterator]: function() { return { next: function() { throw marker; }, return: function() { log.push("nested-return"); return {}; } }; } };
var outer = { [Symbol.iterator]: function() { return { next: function() { return { done: false, value: nested }; }, return: function() { log.push("outer-return"); return {}; } }; } };
try { for (const [item] of outer) {} } catch (error) { print("binding-step-error:" + (error === marker) + ":" + log.join(",")); }
var depth = 1200, closed = 0, valid = true, marker = {};
function descend(level) {
    var iterable = { [Symbol.iterator]: function() { return {
        next: function() { return { done: false, value: level }; },
        return: function() { if (level !== closed) valid = false; closed++; return {}; }
    }; } };
    for (const value of iterable) { if (level === 0) throw marker; return descend(level - 1); }
}
try { descend(depth - 1); } catch (error) { print("stress:" + (error === marker) + ":" + valid + ":" + closed); }
`;

test("for-of steps one ordinary iterator between bodies and closes lexical scopes in completion order", async () => {
    const source = plans + partitions;
    const expected: string[] = [];
    new Function("print", source.replaceAll("NATIVE_GC", "false"))((value: unknown) => expected.push(String(value)));
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-of-"));
    try {
        for (const noGc of [false, true]) {
            const entry = path.join(temporary, noGc ? "subject-no-gc.js" : "subject.js");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(temporary, noGc ? "no-gc" : "gc");
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, noGc ? "build-no-gc" : "build-gc"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/for-of.js#sloppy",
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            const actual = (observation.stdout ?? "").trimEnd().split("\n");
            expect(actual.length).toBe(expected.length);
            expect(expected.flatMap((value, index) => actual[index] === value ? [] : [{ index, expected: value, actual: actual[index] }]).slice(0, 12)).toEqual([]);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 180_000);

test("synchronous iteration completions drain their resource scopes", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-for-of-resource-"));
    const source = `
        const marker:any={};
        for(const mode of ['normal','continue','break','return','throw']) {
            const log:string[]=[];
            function run():any {
                for(const value of [1,2]) {
                    using resource:any={ [Symbol.dispose]() {log.push('dispose:'+value);} };
                    log.push('body:'+value);
                    if(mode==='continue')continue;
                    if(mode==='break')break;
                    if(mode==='return')return marker;
                    if(mode==='throw')throw marker;
                }
                return undefined;
            }
            try {const answer=run();console.log(mode+':'+(answer===marker)+':'+log.join('|'));}
            catch(error){console.log(mode+':'+(error===marker)+':'+log.join('|'));}
        }
    `;
    try {
        const referenceFile=path.join(temporary,'reference.cjs');
        await fs.writeFile(referenceFile,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS}}).outputText);
        const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:30_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        for(const noGc of [false,true]) {
            const entry=path.join(temporary,`subject-${noGc}.ts`),output=path.join(temporary,`program-${noGc}`),diagnostics:string[]=[];
            await fs.writeFile(entry,source);
            const result=await compile({entry,output,noGc,buildDir:path.join(temporary,`build-${noGc}`),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:30_000});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            expect(native.stdout.toString()).toBe(reference.stdout.toString());
        }
    } finally {await fs.rm(temporary,{recursive:true,force:true});}
},90_000);
