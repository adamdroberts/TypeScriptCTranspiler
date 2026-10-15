import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";

test("synthetic checker declarations retain source-global value ownership",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-binding-owner-model-"));
    try{for(const qualifier of ['this','globalThis','']){
        const file=path.join(directory,'source.js');
        await fs.writeFile(file,`${qualifier?qualifier+'.':''}source="31;";eval(source);`);
        const calls=sourceEvaluationInvocations(ts.createProgram([file],{allowJs:true,noLib:true}));
        expect(calls.map(call=>call.choices)).toEqual([['31;']]);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
});

test("source binding ownership follows declarations through properties, scopes and deletion in both memory modes",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-binding-owner-"));
    const parts:string[]=[],expected:string[]=[];
    const definitions=[
        (name:string)=>`this.${name}=31;`,
        (name:string)=>`globalThis.${name}=31;`,
        (name:string)=>`${name}=31;`,
        (name:string)=>`Object.defineProperty(this,"${name}",{value:31,configurable:true,writable:true});`,
        (name:string)=>`var target=globalThis;Object.defineProperty(target,"${name}",{value:31,configurable:true,writable:true});`,
    ];
    for(const [index,define] of definitions.entries())for(const present of [false,true])for(const removed of [false,true]){
        const name=`property_${index}_${present}_${removed}`;
        parts.push(`if(${present}){${define(name)}}${removed?`delete globalThis.${name};`:''}print(typeof ${name});try{print(${name});}catch(e){print(e.constructor.name);}`);
        expected.push(present&&!removed?'number':'undefined',present&&!removed?'31':'ReferenceError');
    }
    parts.push('this.shadow=31;let shadow=41;print(shadow);print(this.shadow);function inner(shadow){this.shadow=47;return shadow;}print(inner(53));print(this.shadow);');
    expected.push('41','31','53','47');
    parts.push('this.retained=59;function make(){return function(){return retained;};}var read=make();this.retained=61;if(NATIVE_GC)$262.gc();print(read());delete this.retained;try{read();}catch(e){print(e.constructor.name);}');
    expected.push('61','ReferenceError');
    parts.push('this.outside=67;var object={outside:71};with(object){outside=73;}print(outside);print(object.outside);');
    expected.push('67','73');
    // One representative deep lexical tree reads the same global record.
    const depth=256;
    parts.push('this.deep={value:79};'+ '{'.repeat(depth)+'if(NATIVE_GC)$262.gc();print(deep.value);'+'}'.repeat(depth));
    expected.push('79');
    const source=parts.join('\n');
    try{
        const entry=path.join(directory,'source.js');await fs.writeFile(entry,source.replaceAll('NATIVE_GC','false'));
        const reference=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        expect(reference.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        for(const noGc of [false,true]){
            await fs.writeFile(entry,source.replaceAll('NATIVE_GC',String(!noGc)));
            const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-binding-ownership.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');
            expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
