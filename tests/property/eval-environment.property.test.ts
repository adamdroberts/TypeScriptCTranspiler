import {nodeReferenceSync} from './node-reference';
import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";
import { parseHostObservation } from "../test262/protocol";

const lexical = `
let retained = { value: 11 }; const constant = { marker: 13 };
({ read: function(){return retained;}, write: function(value){retained = value;},
   fixed: function(){return constant;}, reject: function(){constant = null;},
   get field(){return retained;}, set field(value){retained = value;},
   async readAsync(){await 0;return retained;},
   *readGenerator(){yield retained;return constant;},
   async *readAsyncGenerator(){await 0;yield retained;},
   constructor: function(value){this.value = retained;},
   throws: function(reason){throw reason;} });`;
const strict = `"use strict"; var evalVariable = 17; function evalFunction(){return evalVariable;}
({ read:evalFunction, write:function(value){evalVariable = value;} });`;
const tdz = `let saw = false; try { typeof evalTdz; } catch(reason) { saw = reason instanceof ReferenceError; }
let evalTdz = 19; saw && evalTdz === 19;`;
const destructuring = `let { value: pattern, absent = pattern + 1, ...remaining } = { value: 23, extra: 29 };
const [first, ...rest] = [31, 37, 41]; (() => [pattern, absent, remaining.extra, first, rest.join(",")]);`;
const shadow = `let outer = 43; (function(){return outer;});`;
const nonStrictVar = `var publishedEvalVar = 47; (function(){return publishedEvalVar;});`;
const nested = `let nestedLocal = retained.value + 53; (function(){return nestedLocal;});`;
const nestedCaller = `let retained = {value:59}; eval(${JSON.stringify(nested)});`;
const declaredFunction = `let functionLexical = 61; function localFunction(){return functionLexical;}
localFunction;`;
const dynamic = `let isolatedByFunction = 67; Function("return typeof isolatedByFunction;");`;
const indirect = `let isolatedByIndirect = 71; (0, eval)("typeof isolatedByIndirect");`;
const foreign = `let foreignLocal = {value:73}; (() => foreignLocal);`;
const writeOperations = [
    ["assign", "binding = rhs()"],
    ["compound", "binding += rhs()"],
    ["postfix", "binding++"],
    ["prefix", "--binding"],
    ["logical-and", "binding &&= rhs()"],
    ["logical-or", "binding ||= rhs()"],
    ["nullish", "binding ??= rhs()"],
    ["pattern", "[binding] = [rhs()]"],
] as const;
const declarationPartitions = ["let", "const", "var"].flatMap(kind => [false, true].map(strict => {
    const name = `partition_${kind}_${strict ? "strict" : "sloppy"}`;
    const bindings = writeOperations.map((_, index) => `${kind} ${name}_write_${index} = 89;`).join("\n");
    const operations = writeOperations.map(([label, expression], index) => {
        const binding = `${name}_write_${index}`;
        return `{name:${JSON.stringify(label)},read:function(){return ${binding};},
            write:function(rhs){return (${expression.replaceAll("binding", binding)});}}`;
    }).join(",\n");
    return {kind, strict, name, source:`${strict ? '"use strict";' : ''} ${kind} ${name} = {value:89};
        ${bindings}
        ({read:function(){return ${name};},write:function(value){${name}=value;},operations:[${operations}]});`};
}));
const declarationChecks = declarationPartitions.map(({kind, strict, name, source}, index) => `
var partition${index} = eval(${JSON.stringify(source)}), replacement${index} = {value:97};
var rejected${index} = false;
try {partition${index}.write(replacement${index});} catch(reason){rejected${index}=reason instanceof TypeError;}
check(rejected${index} === ${kind === "const"} && partition${index}.read().value === ${kind === "const" ? 89 : 97} &&
    Object.prototype.hasOwnProperty.call(host,${JSON.stringify(name)}) === ${kind === "var" && !strict}, ${JSON.stringify("declaration-" + name)});
for(const operation of partition${index}.operations){
    const trace=[]; let result="none", error="none";
    try{result=operation.write(function(){trace.push("rhs");return 3;});}
    catch(reason){error=reason.constructor.name;}
    print(${JSON.stringify("write-" + name + ":")} + operation.name + ":" + error + ":" + result + ":" + operation.read() + ":" + trace.join(","));
}
`).join("\n");
const scripts = [lexical, strict, tdz, destructuring, shadow, nonStrictVar, nested, nestedCaller, declaredFunction, dynamic, indirect, foreign,
    ...declarationPartitions.map(partition => partition.source)];
const text = `
var host = globalThis;
function collect(){if(NATIVE_GC) host.$262.gc();}
function check(value,label){if(!value)throw label;host.print(label+":true");}
var outer = "global";
const first = eval(${JSON.stringify(lexical)}), second = eval(${JSON.stringify(lexical)});
const snapshot = first.read(); collect();
check(first !== second && snapshot !== second.read() && first.fixed() !== second.fixed() &&
    typeof retained === "undefined" && !Object.prototype.hasOwnProperty.call(host,"retained"), "fresh-local-declarative-records");
const replacement = {value:79}; first.write(replacement);
check(first.read() === replacement && first.field === replacement && first.read.bind(null)() === replacement &&
    second.read().value === 11, "retained-read-write-and-bound-call");
first.field = snapshot; const getter = Object.getOwnPropertyDescriptor(first,"field").get;
check(first.read() === snapshot && getter.call(first) === snapshot, "retained-accessor-context");
let rejected = false; try {first.reject();} catch(reason){rejected = reason instanceof TypeError;}
check(rejected && first.fixed().marker === 13, "retained-immutable-binding");
check(new first.constructor().value === snapshot && Reflect.construct(first.constructor, []).value === snapshot,
    "retained-construction-context");
const reason = {}; try {first.throws(reason);} catch(caught){check(caught === reason && typeof retained === "undefined", "abrupt-environment-restoration");}
const strictRecord = eval(${JSON.stringify(strict)}); strictRecord.write(83);
check(strictRecord.read() === 83 && typeof evalVariable === "undefined" && typeof evalFunction === "undefined", "strict-eval-variable-environment");
check(eval(${JSON.stringify(tdz)}), "eval-lexical-tdz-and-typeof");
const pattern = eval(${JSON.stringify(destructuring)})(); check(pattern.join("|") === "23|24|29|31|37,41", "lexical-boundname-collection");
const shadowed = eval(${JSON.stringify(shadow)}); check(shadowed() === 43 && outer === "global", "eval-shadow-and-global-fallback");
const published = eval(${JSON.stringify(nonStrictVar)}); check(published() === 47 && host.publishedEvalVar === 47 &&
    Object.getOwnPropertyDescriptor(host,"publishedEvalVar").configurable, "sloppy-eval-variable-insertion");
check(eval(${JSON.stringify(nestedCaller)})() === 112 && typeof nestedLocal === "undefined", "nested-eval-environment-tree");
check(eval(${JSON.stringify(declaredFunction)})() === 61 && host.localFunction() === 61, "declaration-owned-environment");
check(eval(${JSON.stringify(dynamic)})() === "undefined" && eval(${JSON.stringify(indirect)}) === "undefined", "global-dynamic-and-indirect-boundaries");
${declarationChecks}
check(host.__environmentPreflight(), "atomic-declaration-preflight");
const realm = host.$262.createRealm(); const foreignReader = realm.evalScript(${JSON.stringify(foreign)});
check(foreignReader().value === 73 && typeof realm.global.foreignLocal === "undefined" && typeof foreignLocal === "undefined", "foreign-realm-environment-ownership");
async function finish(){
    const awaited = await first.readAsync(); check(awaited === snapshot, "async-environment-resumption");
    const generator = first.readGenerator(); check(generator.next().value === snapshot && generator.next().value === first.fixed(), "generator-environment-resumption");
    const asynchronous = first.readAsyncGenerator(); check((await asynchronous.next()).value === snapshot, "async-generator-environment-resumption");
    let chain = null;
    for(let index=0;index<4096;++index){chain=host.__environmentChild(chain,index);if(index%127===0)collect();}
    collect();
    for(let index=4095;index>=0;--index){const record=chain();if(record[0]!==index||record[1]!==0)throw "environment-tree lookup";chain=record[2];if(index%127===0)collect();}
    check(chain===null,"deep-retained-environment-tree");
}
finish();`;

// The ABI probe creates the same declarative record tree as the independent
// closure model. It exposes no production global or special emitter path.
const probe = String.raw`
#include "tsc_internal.h"
static tsc_value_t environment_reader(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), 3);
    tsc_array_push_value(out, tsc_environment_reference_get(tsc_str_from_cstr("own")));
    tsc_array_push_value(out, tsc_environment_reference_get(tsc_str_from_cstr("root")));
    tsc_array_push_value(out, tsc_environment_reference_get(tsc_str_from_cstr("previous")));
    return tsc_value_array(out);
}
static tsc_value_t environment_child(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_value_t previous = TSC_ARR(tsc_value_t, args, 0), own = TSC_ARR(tsc_value_t, args, 1);
    tsc_environment_t* parent = tsc_value_is_nullish(previous) ? NULL : ((tsc_function_identity_t*)value_ptr(previous))->lexical_environment;
    tsc_environment_t* volatile record = tsc_environment_new(parent, true);
    tsc_environment_t* saved = tsc_environment_swap(record);
    tsc_global_declaration_t declarations[3] = {
        {tsc_str_from_cstr("own"),TSC_GLOBAL_DECL_LEXICAL_MUTABLE,tsc_value_undefined(),NULL},
        {tsc_str_from_cstr("previous"),TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE,tsc_value_undefined(),NULL},
        {tsc_str_from_cstr("root"),TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE,tsc_value_undefined(),NULL},
    };
    tsc_environment_declaration_instantiation(declarations, parent ? 2 : 3);
    tsc_environment_binding_initialize(declarations[0].name, own);
    tsc_environment_binding_initialize(declarations[1].name, previous);
    if (!parent) tsc_environment_binding_initialize(declarations[2].name, own);
    tsc_value_t result = tsc_value_function_closure_named(environment_reader, NULL, 0, tsc_str_from_cstr("read"));
    tsc_environment_swap(saved);
    return result;
}
static tsc_value_t environment_preflight(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const tsc_global_declaration_kind_t kinds[] = {
        TSC_GLOBAL_DECL_LEXICAL_MUTABLE, TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE,
        TSC_GLOBAL_DECL_VAR, TSC_GLOBAL_DECL_FUNCTION,
    };
    for (size_t left = 0; left < sizeof(kinds)/sizeof(*kinds); ++left) {
        for (size_t right = 0; right < sizeof(kinds)/sizeof(*kinds); ++right) {
            if (left >= 2 && right >= 2) continue;
            tsc_environment_t* volatile record = tsc_environment_new(NULL, true);
            tsc_environment_t* saved = tsc_environment_swap(record);
            tsc_global_declaration_t declarations[] = {
                {tsc_str_from_cstr("unpublished"),TSC_GLOBAL_DECL_VAR,tsc_value_undefined(),NULL},
                {tsc_str_from_cstr("shared"),kinds[left],tsc_value_undefined(),NULL},
                {tsc_str_from_cstr("shared"),kinds[right],tsc_value_undefined(),NULL},
            };
            volatile bool rejected = false;
            {
                TSC_TRY_FRAME(frame);
                tsc_try_push(&frame);
                if (setjmp(frame.jb) == 0) tsc_environment_declaration_instantiation(declarations, sizeof(declarations)/sizeof(*declarations));
                else rejected = true;
            }
            bool unpublished = tsc_str_eq(tsc_environment_reference_typeof(declarations[0].name),tsc_str_from_cstr("undefined"));
            tsc_environment_swap(saved);
            if (!rejected || !unpublished) return tsc_value_bool(false);
        }
    }
    return tsc_value_bool(true);
}
static void install_environment_probe(void) {
    tsc_value_set_prop(tsc_global_object(), tsc_str_from_cstr("__environmentChild"),
        tsc_value_function_builtin_named(environment_child,NULL,2,tsc_str_from_cstr("child")));
    tsc_value_set_prop(tsc_global_object(), tsc_str_from_cstr("__environmentPreflight"),
        tsc_value_function_builtin_named(environment_preflight,NULL,0,tsc_str_from_cstr("preflight")));
}
`;

async function oracle(): Promise<string[]> {
    const reference = nodeReferenceSync(["node", "-e", `
    const vm=require("node:vm"),fs=require("node:fs"),lines=[];
    const context = vm.createContext({print:line=>lines.push(line), $262:{gc(){},createRealm(){
        const realm = vm.createContext({}); return {global:new vm.Script("globalThis").runInContext(realm),evalScript:code=>new vm.Script(code).runInContext(realm)};
    }}, __environmentChild(previous,own){const root=previous===null?own:previous()[1];return ()=>[own,root,previous];},
    __environmentPreflight(){
        for(const left of ["let shared;", "const shared = 0;", "var shared;", "function shared(){}"]){
            for(const right of ["let shared;", "const shared = 0;", "var shared;", "function shared(){}"]){
                if(!/^(let|const)/.test(left) && !/^(let|const)/.test(right))continue;
                const sandbox={};let rejected=false;
                try{vm.runInNewContext("var unpublished;"+left+right,sandbox);}catch(reason){rejected=reason.name==="SyntaxError";}
                if(!rejected||Object.prototype.hasOwnProperty.call(sandbox,"unpublished"))return false;
            }
        }
        return true;
    }});
    Promise.resolve(new vm.Script(${JSON.stringify(text.replaceAll("NATIVE_GC","false"))}).runInContext(context))
        .then(()=>fs.writeSync(1,JSON.stringify(lines))).catch(reason=>{console.error(reason);process.exitCode=1;});
    `], {stdout:"pipe",stderr:"pipe",timeout:120_000});
    expect(reference.exitCode).toBe(0);expect(reference.stderr.toString()).toBe("");
    return JSON.parse(reference.stdout.toString());
}

test("eval declarations and source contexts share one retained environment tree", async()=>{
    const expected=await oracle(); expect(expected.at(-1)).toBe("deep-retained-environment-tree:true");
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-eval-environment-"));
    try {
        for(const noGc of [false,true]){
            const name=noGc?"no-gc":"gc",entry=path.join(temporary,name+".js"),output=path.join(temporary,name),buildDir=path.join(temporary,name+"-build"),diagnostics:string[]=[];
            await fs.writeFile(entry,text.replaceAll("NATIVE_GC",String(!noGc)));
            const entries=[];
            for(const [index,source] of scripts.entries()){
                const script=path.join(temporary,name+"-eval-"+index+".js");await fs.writeFile(script,source);
                entries.push({source,entry:script,strictCaller:false,strict:source.startsWith('"use strict"')});
            }
            const indirectEntry=path.join(temporary,name+"-indirect.js");await fs.writeFile(indirectEntry,"typeof isolatedByIndirect");
            const roots=[...entries.map(record=>record.entry),indirectEntry];
            const result=await compile({entry,output,noGc,emitCOnly:true,additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],buildDir,
                test262Observation:{kind:"test262-native-observation",scenarioId:"property/eval-environment.js#sloppy",setupEntries:[],testEntry:entry,async:false,
                    scriptEntries:[entry,...roots],directEvalEntries:entries,indirectEvalEntries:[{source:"typeof isolatedByIndirect",entry:indirectEntry,strict:false}],
                    evalScriptEntries:[{source:foreign,entry:entries.find(record=>record.source===foreign)!.entry}]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const main=path.join(buildDir,"main.c"),emitted=await fs.readFile(main,"utf8");
            const begin = /    tsc_test262_begin\([^)]*\);/;
            expect(emitted).toMatch(begin);
            await fs.writeFile(main,probe+emitted.replace(begin,"$&\n    install_environment_probe();"));
            const sources=(await fs.readdir(buildDir)).filter(file=>file.endsWith(".c")).sort().map(file=>path.join(buildDir,file));
            const linked=await invokeCc({sources,output,includeDirs:[buildDir],libs:[...(noGc?[]:["gc"]),"m","resolv","ssl","crypto","icui18n","icuuc","icudata","gmp"],extraFlags:noGc?["-DTSC_NO_GC"]:[],stderrWriter:message=>diagnostics.push(message)});
            expect({exitCode:linked.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect(native.exitCode).toBe(0);expect(native.stderr.toString()).toBe("");
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:"normal"});
            expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},300_000);
