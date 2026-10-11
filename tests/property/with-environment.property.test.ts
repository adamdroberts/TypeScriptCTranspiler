import {expect,test} from "bun:test";
import ts from "typescript";
import {earlyControlFlowStaticSemanticsFailure} from "../../src/control-static-semantics";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {invokeCc} from "../../src/link/cc";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

const source=[false,true].flatMap(present=>[false,true,"primitive"].map((blocked,index)=>`
function lookup_${present}_${index}(){var value=11;const object=${present?"{value:17}":"{}"};
object[Symbol.unscopables]=${blocked==="primitive"?"31":`{value:${blocked}}`};
with(object){print("lookup:"+value);value+=2;}print("stored:"+value+":"+object.value);}
lookup_${present}_${index}();`)).join("\n")+`
function reference(){var value=11;const object={};with(object){value=(object.value=17,19);}
print("capture:"+value+":"+object.value);}
reference();
function operations(){var value=11;const object={value:17};with(object){print("update:"+(value++)+":"+value);print("typeof:"+typeof value);print("delete:"+delete value);print("fallback:"+value);}
print("outside:"+value);}
operations();
function receiver(){const object={value:17,method(){return this.value;},eval(){return this.value;}};
with(object){print("receiver:"+method()+":"+(method)()+":"+eval());}}
receiver();
function constructor(){const object={Constructor:function(value){this.value=value;},tag(strings){return this.value+strings[0];},value:17};with(object){print("construct:"+(new Constructor(23)).value);print("tag:"+tag\`suffix\`);}}
constructor();
function directEval(){var value=11;const object={value:17};with(object){print("eval:"+eval("value"));eval("value=23");}print("eval-outside:"+value+":"+object.value);}
directEval();
function deleted(strict,write){var binding=11,seen=0;const object={binding:17,get [Symbol.unscopables](){seen++;delete object.binding;return null;}};let error="none",result="none";
with(object){try{if(strict){(function(){"use strict";if(write)binding=23;else result=binding;})();}else{if(write)binding=23;else result=binding;}}catch(reason){error=reason.constructor.name;}}
print("deleted:"+strict+":"+write+":"+error+":"+result+":"+seen+":"+object.binding+":"+binding);}
for(const strict of [false,true])for(const write of [false,true])deleted(strict,write);
function lexical(){var value=11;const object={value:17};with(object){let value=23;print("lexical:"+value);value++;}print("lexical-outside:"+value+":"+object.value);}
lexical();
function varInit(){var value=11;const object={value:17};with(object){var value=23;}print("var-init:"+value+":"+object.value);}
varInit();
function destructuring(){var value=11;const object={value:17};with(object){var {value}={value:23};}print("pattern:"+value+":"+object.value);}
destructuring();
function retained(){var value=11;const object={value:17};let closure;with(object){closure=function(){return value;};}object.value=23;print("closure:"+closure()+":"+value);}
retained();
function abrupt(){var value=11;const object={value:17};try{with(object){throw "thrown";}}catch(reason){print("throw:"+value);}
outer:for(let i=0;i<1;i++){with(object){break outer;}}print("break:"+value);
for(let i=0;i<1;i++){with(object){continue;}}print("continue:"+value);}
abrupt();
function primitive(){with("abc"){print("boxed:"+length);}for(const object of [null,undefined]){try{with(object){}}catch(error){print("nullish:"+error.constructor.name);}}}
primitive();
function order(){var value=11;const log=[];const object=new Proxy({value:17,[Symbol.unscopables]:{value:false}},{
has(target,key){if(key==="value")log.push("has");return Reflect.has(target,key);},
get(target,key,receiver){if(key===Symbol.unscopables)log.push("unscopables");else if(key==="value")log.push("get");return Reflect.get(target,key,receiver);}});
let result;with(object){result=value;}print("order:"+result+":"+log.join(","));}
order();
function* suspendedGenerator(){var value=11;const object={value:17};with(object){value=yield value;print("generator:"+value+":"+object.value);}print("generator-outside:"+value);}
const iterator=suspendedGenerator();print("yield:"+iterator.next().value);iterator.next(23);
function* returnGenerator(){var value=11;const object={value:17};try{with(object){yield value;}}finally{print("generator-finally:"+value);}}
const returned=returnGenerator();returned.next();returned.return(31);
async function suspended(){var value=11;const object={value:17,method(arg){return this.value+arg;}};
with(object){value=await Promise.resolve(23);print("async:"+value+":"+method(await Promise.resolve(2)));}print("async-outside:"+value);
with(object){var value=await Promise.resolve(29);var {value}={value:await Promise.resolve(23)};}print("async-var:"+value+":"+object.value);
with(object){for(let value=31;value<33;value++){print("async-loop:"+value);await Promise.resolve();}print("async-loop-after:"+value);}
with(object){for(const value of [37,41]){await Promise.resolve();print("async-iteration:"+value);}print("async-iteration-after:"+value);}
with(object){try{await Promise.reject(43);}catch(value){await Promise.resolve();print("async-catch:"+value);}print("async-catch-after:"+value);}
with(object){switch(1){case 1:let value=47;await Promise.resolve();print("async-case:"+value);break;}print("async-case-after:"+value);}
try{with(object){await Promise.reject("rejected");}}catch(reason){print("async-reject:"+value);}
const generator=(async function*(){with(object){yield await Promise.resolve(value);}return value;})();
print("async-generator:"+(await generator.next()).value+":"+(await generator.next()).value);
}
suspended();
`;

test("with grammar rejection follows strict code contexts",()=>{
    const directives=["",'"use strict";',String.raw`"use\u0020strict";`];
    const wrappers=[(body:string)=>body,(body:string)=>`function f(){${body}}`,
        (body:string)=>`function f(){function g(){${body}}}`, (body:string)=>`class C{method(){${body}}}`];
    for(const directive of directives)for(const wrap of wrappers){
        const source=wrap(directive+"with({}){}");
        const native=Bun.spawnSync(["node","-e",`try{new Function(${JSON.stringify(source)});process.stdout.write("accepted");}catch(error){process.stdout.write(error.constructor.name);}`],{stdout:"pipe",stderr:"pipe"});
        expect(native.exitCode).toBe(0);
        const tree=ts.createSourceFile("with-grammar.js",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
        const failure=earlyControlFlowStaticSemanticsFailure(tree);
        expect(failure===null).toBe(native.stdout.toString()==="accepted");
        if(failure)expect(failure.message).toBe("with statement is not permitted in strict mode");
    }
});

test("object Environment Records share captured References and completion lowering",async()=>{
    const oracle=Bun.spawnSync(["node","-e",`const vm=require("node:vm"),fs=require("node:fs");new vm.Script(${JSON.stringify(source)}).runInNewContext({print:line=>fs.writeSync(1,line+"\\n")});`],{stdout:"pipe",stderr:"pipe",timeout:120_000});
    expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
    // Node 26 re-resolves the assignment after RHS inserts object.value.
    // The pinned S11.13.1_A6_T3 and captured-Reference model retain the
    // original declarative base, so keep this engine difference separate.
    // Object GetBindingValue independently performs HasProperty before Get;
    // V8 omits this observable second has trap.
    const expected=oracle.stdout.toString().trimEnd().split("\n").map(line=>line.startsWith("capture:")?"capture:19:17":
        line.startsWith("order:")?"order:17:has,unscopables,has,get":
        line.startsWith("deleted:true:")?`deleted:true:${line.split(":")[2]}:ReferenceError:none:1:undefined:11`:line);
    const graph=finiteEvalScriptSourceGraph([{path:"with.js",source}]);expect(graph.error).toBeNull();
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-with-environment-"));
    try{const entry=path.join(directory,"with.js");await fs.writeFile(entry,source);
    const entries=[];
    for(const [index,record] of graph.directEvalSources.entries()){
        const entry=path.join(directory,"eval-"+index+".js");await fs.writeFile(entry,record.source);entries.push({...record,entry});
    }
    const roots=entries.map(record=>record.entry);
    for(const noGc of [true,false]){
        const output=path.join(directory,"native-"+noGc),diagnostics:string[]=[];
        const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),additionalRoots:roots,isolatedScriptRoots:[entry,...roots],initializationEntries:[entry],
            test262Observation:{kind:"test262-native-observation",scenarioId:"property/with-environment.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry,...roots],directEvalEntries:entries},diagnosticWriter:message=>diagnostics.push(message)});
        expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
        expect({kind:observation.kind,detail:observation.kind==="throw"?observation:undefined}).toEqual({kind:"normal",detail:undefined});
        expect((observation.stdout??"").trimEnd().split("\n")).toEqual(expected);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);

test("deep object environment trees retain independently resolved References after leaving their scopes",async()=>{
    const depth=4096;
    const records=Array.from({length:depth},(_,index)=>({present:index%7===0,blocked:index%2===1,value:index+17}));
    const expected:number[]=[];
    let resolved=11;
    for(const record of records){if(record.present&&!record.blocked)resolved=record.value;expected.push(resolved);}
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-with-tree-"));
    try{for(const noGc of [false,true]){
        const entry=path.join(directory,"entry.ts"),build=path.join(directory,"build-"+noGc),output=path.join(directory,"program-"+noGc);
        await fs.writeFile(entry,"export {};\n");
        expect((await compile({entry,output,buildDir:build,emitCOnly:true,noGc})).exitCode).toBe(0);
        const driver=path.join(build,"with-tree-driver.c");
        await fs.writeFile(driver,String.raw`
#define main generated_main
#include "main.c"
#undef main
int main(int argc,char** argv){
    tsc_bootstrap(argc,argv);
    const size_t depth=${depth};
    tsc_environment_t* outer=tsc_environment_new(NULL,true);
    tsc_environment_swap(outer);
    tsc_str_t* key=tsc_str_from_cstr("value");
    tsc_global_declaration_t declaration={key,TSC_GLOBAL_DECL_VAR,tsc_value_num(11),NULL};
    tsc_environment_declaration_instantiation(&declaration,1);
    tsc_environment_reference_set(key,tsc_value_num(11),false);
    tsc_str_t* root_key=tsc_str_from_cstr("rootValue");
    tsc_global_declaration_t root_declaration={root_key,TSC_GLOBAL_DECL_VAR,tsc_value_undefined(),NULL};
    tsc_environment_declaration_instantiation(&root_declaration,1);
    tsc_environment_reference_set(root_key,tsc_value_num(11),false);
    tsc_environment_scope_t* scopes=TSC_GC_MALLOC(depth*sizeof(*scopes));
    tsc_reference_t* references=TSC_GC_MALLOC(depth*sizeof(*references));
    for(size_t index=0;index<depth;++index){
        tsc_value_t object=tsc_value_object(tsc_object_new());
        void* volatile root=tsc_value_gc_root(object);(void)root;
        if(index%7==0)tsc_value_set_prop(object,key,tsc_value_num(index+17));
        tsc_value_t unscopables=tsc_value_object(tsc_object_new());
        void* volatile blocked_root=tsc_value_gc_root(unscopables);(void)blocked_root;
        tsc_value_set_prop(unscopables,key,tsc_value_bool(index%2==1));
        tsc_value_set_symbol_prop(object,tsc_symbol_unscopables(),unscopables);
        tsc_environment_object_enter(&scopes[index],object);
        references[index]=tsc_environment_reference_capture(key,false);
    }
    tsc_reference_t deep=tsc_environment_reference_capture(root_key,false);
    for(size_t index=depth;index>0;--index)tsc_environment_scope_leave(&scopes[index-1]);
#ifndef TSC_NO_GC
    GC_gcollect();
#endif
    for(size_t index=0;index<depth;++index)printf("%.0f\n",tsc_value_to_number(tsc_environment_reference_get_captured(&references[index])));
    printf("%.0f\n",tsc_value_to_number(tsc_environment_reference_get_captured(&deep)));
    return 0;
}
`);
        const names=await fs.readdir(build);
        const linked=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith("tsc_")&&name.endsWith(".c")).map(name=>path.join(build,name))],output,includeDirs:[build],libs:[...(noGc?[]:["gc"]),"m","resolv","ssl","crypto","icui18n","icuuc","icudata","gmp"],extraFlags:noGc?["-DTSC_NO_GC=1"]:[]});
        expect({exitCode:linked.exitCode,stderr:linked.exitCode?linked.stderr:""}).toEqual({exitCode:0,stderr:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        expect(native.stdout.toString().trimEnd().split("\n").map(Number)).toEqual([...expected,11]);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
