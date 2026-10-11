import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

test("property operations validate their base before key coercion through one runtime path",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-property-base-"));
    const operations=[
        {expression:'value.x',events:['base']},
        {expression:'value[key()]',events:['base','expression']},
        {expression:'value[key()]=rhs()',events:['base','expression','rhs']},
        {expression:'value[key()]+=rhs()',events:['base','expression']},
        {expression:'++value[key()]',events:['base','expression']},
        {expression:'delete value[key()]',events:['base','expression']},
        {expression:'value[key()]()',events:['base','expression']},
        {expression:'typeof value[key()]',events:['base','expression']},
        {expression:'value.x?.()',events:['base']},
        {expression:'value[key()]?.()',events:['base','expression']},
        {expression:'value?.[key()]',events:['base'],optional:true},
        {expression:'value?.x',events:['base'],optional:true},
    ];
    const parts:string[]=[],expected:string[]=[];
    for(const strict of [false,true])for(const base of ['null','undefined'])for(const operation of operations){
        parts.push(`(function(){${strict?'"use strict";':''}var events=[];function base(){events.push("base");return ${base};}function key(){events.push("expression");return {[Symbol.toPrimitive]:function(){events.push("coercion");if(NATIVE_GC)$262.gc();return "x";}};}function rhs(){events.push("rhs");return 37;}var value=base();try{var result=${operation.expression};events.push(String(result));}catch(e){events.push(e.constructor.name);}print(events.join(","));})();`);
        expected.push([...operation.events,operation.optional?'undefined':'TypeError'].join(','));
    }
    for(const base of ['null','undefined','void 0'])for(const expression of ['(BASE).x','(BASE)["x"]','(BASE).x()','(BASE)["x"]()']){
        parts.push(`try{${expression.replace('BASE',base)};}catch(e){print("literal:"+e.constructor.name);}`);
        expected.push('literal:TypeError');
    }
    for(const base of ['false','0','1n','"str"','Symbol("base")','Object.create(null)']){
        parts.push(`(function(){var value=${base};var events=[];var key={[Symbol.toPrimitive]:function(){events.push("coercion");if(NATIVE_GC)$262.gc();return "missing";}};events.push(String(value[key]));print(events.join(","));})();`);
        expected.push('coercion,undefined');
    }
    // Missing properties at the end of one deep object graph still enter the
    // same property operation. Prototype termination remains a normal miss.
    parts.push('var root={},cursor=root;for(var i=0;i<4096;i++){cursor.next={};cursor=cursor.next;}if(NATIVE_GC)$262.gc();cursor=root;for(var i=0;i<4096;i++)cursor=cursor.next;try{cursor.next.x;}catch(e){print("deep:"+e.constructor.name);}print("prototype:"+Object.create(null).missing);');
    expected.push('deep:TypeError','prototype:undefined');
    // Retain the regression that exposed this shared path, independently of
    // whether the missing value originated in an object environment.
    parts.push('var object={member:{value:31}};with(object){delete member;}try{object.member.value;}catch(e){print("deleted:"+e.constructor.name);}');
    expected.push('deleted:TypeError');
    const source=parts.join('\n');
    try{
        const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
        const reference=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        expect(reference.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        for(const noGc of [false,true]){
            await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
            const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/property-base.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');
            expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
