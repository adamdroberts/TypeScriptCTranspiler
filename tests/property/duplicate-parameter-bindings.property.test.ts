import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {evalSourceIsValid,evalSourceRequest} from '../../src/eval-source';
import {parseHostObservation} from '../test262/protocol';

function bindingModel(names:string[],actual:number[]):string[]{
    const bindings=new Map<string,number|undefined>(),argumentsValues=new Map<number,number>();
    names.forEach((name,index)=>bindings.set(name,actual[index]));
    actual.forEach((value,index)=>argumentsValues.set(index,value));
    const last=new Map<string,number>();names.forEach((name,index)=>last.set(name,index));
    const aliases=new Map<number,string>();for(const [name,index] of last)if(index<actual.length)aliases.set(index,name);
    const ordered=[...bindings.keys()],snap=()=>[...ordered.map(name=>String(bindings.get(name))),...actual.map((_,index)=>String(aliases.has(index)?bindings.get(aliases.get(index)!):argumentsValues.get(index))),String(actual.length)].join('|');
    const observations=[snap()];
    ordered.forEach((name,index)=>bindings.set(name,101+index));observations.push(snap());
    actual.forEach((_,index)=>{const name=aliases.get(index);if(name)bindings.set(name,201+index);else argumentsValues.set(index,201+index);});observations.push(snap());
    actual.forEach((_,index)=>{aliases.delete(index);argumentsValues.delete(index);});
    ordered.forEach((name,index)=>bindings.set(name,301+index));observations.push(snap());
    return observations;
}

test('duplicate formal grammar retains the simple sloppy parameter partition',()=>{
    const sources=['function f(x,x){}','(function(x,x){})','function* f(x,x){}','async function f(x,x){}','async function* f(x,x){}',
        '"use strict";function f(x,x){}','function f(x,x){"use strict";}','function f(x,x=0){}','function f(x,...x){}','({m(x,x){}})','(x,x)=>x'];
    const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");fs.writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{try{new vm.Script(source);return true}catch(e){if(e.name!=="SyntaxError")throw e;return false}})));',JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe'});
    expect(oracle.exitCode).toBe(0);expect(oracle.stderr.toString()).toBe('');
    expect(sources.map(source=>evalSourceIsValid(evalSourceRequest('direct',source,false)))).toEqual(JSON.parse(oracle.stdout.toString()));
});

test('ordered ABI slots feed one source binding and mapped arguments model in both memory modes',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-duplicate-formals-'));
    const pieces:string[]=[],expected:string[]=[];
    const layouts=[['x','x'],['x','y','x'],['x','x','y'],['x','y','x','y']];
    // One wide formal list exercises the same collection and binding map.
    layouts.push(Array.from({length:192},(_,index)=>'wide'+index%7));
    let caseIndex=0;
    for(const names of layouts)for(const count of [0,names.length-1,names.length])for(const expression of [false,true]){
        if(names.length===192&&(count!==names.length||expression))continue;
        const actual=Array.from({length:count},(_,index)=>11+index),unique=[...new Set(names)],fn='f'+caseIndex++;
        const snapshot=`print([${unique.join(',')}${count?','+actual.map((_,index)=>`arguments[${index}]`).join(','):''},arguments.length].map(String).join('|'));`;
        const body=snapshot+unique.map((name,index)=>`${name}=${101+index};`).join('')+snapshot+
            actual.map((_,index)=>`arguments[${index}]=${201+index};`).join('')+snapshot+
            actual.map((_,index)=>`delete arguments[${index}];`).join('')+unique.map((name,index)=>`${name}=${301+index};`).join('')+snapshot;
        pieces.push(expression?`var ${fn}=function(${names.join(',')}){${body}};`:`function ${fn}(${names.join(',')}){${body}}`);
        pieces.push(`${fn}(${actual.join(',')});`);expected.push(...bindingModel(names,actual));
    }
    pieces.push('function retain(x,x){var args=arguments;return function(value){if(NATIVE_GC)$262.gc();x=value;return [x,args[0],args[1]].join("|");};}var retained=retain(41,43);print(retained(47));');expected.push('47|41|47');
    pieces.push('function* resumed(x,x){yield x;if(NATIVE_GC)$262.gc();x=53;yield arguments[1];}var generator=resumed(59,61);print(generator.next().value);print(generator.next().value);');expected.push('61','53');
    pieces.push('async function resumedAsync(x,x){await Promise.resolve(0);if(NATIVE_GC)$262.gc();x=67;return [x,arguments[0],arguments[1]].join("|");}resumedAsync(71,73).then(function(value){print(value);});');expected.push('67|71|67');
    try{
        const entry=path.join(directory,'source.js');
        await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC','false'));
        const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
        expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        expect(oracle.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        for(const noGc of [false,true]){
            await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC',String(!noGc)));
            const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/duplicate-formals.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');
            expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
