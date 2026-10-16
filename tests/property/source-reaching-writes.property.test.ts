import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';

const original='{let code=String(Math.random())+";";code="17;";print(eval(code));print("replacement-complete");}';
function reference(source:string):string {
    const script='const fs=require("node:fs"),vm=require("node:vm"),context=vm.createContext({external:()=>"19;",print:value=>{fs.writeSync(1,String(value)+"\\n");}});context.$262={evalScript:source=>new vm.Script(source).runInContext(context)};new vm.Script("Math.random=()=>19;").runInContext(context);new vm.Script(fs.readFileSync(0,"utf8")).runInContext(context);';
    const result=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30000});expect({code:result.exitCode,stderr:result.stderr.toString()}).toEqual({code:0,stderr:''});return result.stdout.toString();
}
const finish='print(eval(code));print("replacement-complete");';
const finite=[
    original,
    '{function run(){let code=String(Math.random())+";";code="17;";'+finish+'}run();}',
    '{let code=String(Math.random())+";";(code="17;",print(eval(code)),print("replacement-complete"));}',
    '{function run(flag){let code=String(Math.random())+";";if(flag)code="17;";else code="19;";'+finish+'}run(true);run(false);}',
    '{let code=String(Math.random())+";";[code]=["17;"];'+finish+'}',
    '{let code=String(Math.random())+";";({value:code="17;"}={});'+finish+'}',
    '{let code=String(Math.random())+";";let saved;[code,saved=code]=["17;",undefined];print(eval(saved));print("replacement-complete");}',
    '{let code=String(Math.random())+";";code="17;";const saved=code;code=String(Math.random())+";";print(eval(saved));print("replacement-complete");}',
    '{function run(flag){let code=String(Math.random())+";";if(flag)return;code="17;";'+finish+'}run(false);run(true);}',
];
const opaque=[
    '{let code=String(Math.random())+";";if(Math.random()>0.5)code="17;";'+finish+'}',
    '{let code=String(Math.random())+";";Math.random()>0.5&&(code="17;");'+finish+'}',
    '{let code=String(Math.random())+";";const saved=code;code="17;";print(eval(saved));print("replacement-complete");}',
    '{var code="17;";function run(depth){code=String(Math.random())+";";if(!depth)throw 0;code="17;";try{run(0);}catch(error){}'+finish+'}run(1);}',
    '{let code="17;";function run(depth){code=String(Math.random())+";";if(!depth)throw 0;code="17;";try{eval("run(0);");}catch(error){}'+finish+'}run(1);}',
    '{var code="17;";function run(depth){code=String(Math.random())+";";if(!depth)throw 0;code="17;";try{(0,eval)("run(0);");}catch(error){}'+finish+'}run(1);}',
    '{var code="17;";function run(depth){code=String(Math.random())+";";if(!depth)throw 0;code="17;";try{$262.evalScript("run(0);");}catch(error){}'+finish+'}run(1);}',
    '{let code=String(Math.random())+";";try{code="17;";}catch(error){}'+finish+'}',
];
test('reaching definitions retain definite stores, binding plans, snapshots and conservative reentrant or skipped stores',()=>{
    for(const source of finite){const output=reference(source);expect(output.endsWith('replacement-complete\n')).toBe(true);const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});for(const line of output.trimEnd().split('\n').filter(line=>line!=='replacement-complete'))expect(result.directEvalSources.map(entry=>entry.source)).toContain(line+';');}
    for(const source of opaque){expect(reference(source).endsWith('replacement-complete\n')).toBe(true);expect({source,error:graph([{path:'subject.js',source}]).error}).toEqual({source,error:expect.stringContaining('direct eval source is not a finite static string expression')});}
});

type Flow={kind:'write';value:string}|{kind:'skip'}|{kind:'branch';left:Flow;right:Flow}|{kind:'sequence';children:readonly Flow[]};
function generated(seed:number):Flow {
    let state=seed;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
    const leaf=():Flow=>next()%3?{kind:'write',value:next()%2?'17;':'19;'}:{kind:'skip'};
    const children:Flow[]=[];for(let index=0;index<8;index++)children.push(next()%2?{kind:'branch',left:leaf(),right:leaf()}:leaf());
    return {kind:'sequence',children};
}
function model(flow:Flow,input:ReadonlySet<string|null>):Set<string|null> {
    if(flow.kind==='write')return new Set([flow.value]);if(flow.kind==='skip')return new Set(input);
    if(flow.kind==='branch')return new Set([...model(flow.left,input),...model(flow.right,input)]);
    let values=new Set(input);for(const child of flow.children)values=model(child,values);return values;
}
function render(flow:Flow):string {
    if(flow.kind==='write')return 'code='+JSON.stringify(flow.value)+';';if(flow.kind==='skip')return ';';
    if(flow.kind==='branch')return 'if(Math.random()>0.5){'+render(flow.left)+'}else{'+render(flow.right)+'}';
    return flow.children.map(render).join('\n');
}
test('generated control trees agree with an independent reaching-definition model',()=>{
    for(let seed=1;seed<=16;seed++){
        const flow=generated(seed),expected=model(flow,new Set([null])),source='{let code=String(Math.random())+";";'+render(flow)+finish+'}';
        expect(reference(source).endsWith('replacement-complete\n')).toBe(true);const result=graph([{path:'subject.js',source}]);
        if(expected.has(null))expect(result.error).toContain('direct eval source is not a finite static string expression');
        else{expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source).sort()).toEqual([...expected].sort() as string[]);}
    }
});
function retained():string {
    let tree='code=String(17)+";";';for(let index=0;index<512;index++)tree='if(Math.random()>0.5){code=String(17)+";";}else{'+tree+'}';
    return '{let code=String(Math.random())+";";'+tree+'const saved=code;code=String(Math.random())+";";COLLECT print(eval(saved));print("replacement-complete");}';
}
test('the unchanged replacement counterexample, semantic partitions and one retained control tree match complete Node in both memory modes',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'tsc2c-reaching-writes-'));
    try{for(const [index,source]of [original,finite.join('\n'),retained()].entries()){
        const expected=reference(source.replace('COLLECT',''));expect(expected.endsWith('replacement-complete\n')).toBe(true);
        for(const noGc of [false,true]){
            const entry=join(directory,'subject-'+index+'.js'),output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,source.replace('COLLECT',noGc?'':'$262.gc();'));
            const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/reaching-writes#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
            expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
        }
    }}finally{await rm(directory,{recursive:true,force:true});}
},900000);

const defaultOriginal='{const evaluate=code=>{print(code);return eval(code);};const run=body=>{[body,body=body]=["17;",undefined];evaluate(body);};run("23;");}';
const persistentOriginal='{const evaluate=code=>{print(code);return eval(code);};let body="17;";const run=()=>{const saved=body;body=external();evaluate(saved);};run();run();}';
test('unchanged incoming and self-default counterexamples retain their actual source alternatives',()=>{
    expect(reference(defaultOriginal)).toBe('17;\n');const selected=graph([{path:'subject.js',source:defaultOriginal}]);expect(selected.error).toBeNull();expect(selected.directEvalSources.map(entry=>entry.source)).toContain('17;');
    expect(reference(persistentOriginal)).toBe('17;\n19;\n');expect(graph([{path:'subject.js',source:persistentOriginal}]).error).toContain('direct eval source is not a finite static string expression');
});
test('the unchanged incoming and self-default scripts complete natively with the actual external setup in both memory modes',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'tsc2c-reaching-originals-'));try{
        const setup=join(directory,'setup.js');await writeFile(setup,'function external(){return "19;";}');
        for(const [index,source]of [defaultOriginal,persistentOriginal].entries()){
            const expected=reference(source),entry=join(directory,'subject-'+index+'.js');await writeFile(entry,source);
            for(const noGc of [false,true]){
                const output=join(directory,'program-'+index+'-'+noGc),diagnostics:string[]=[];
                const built=await compile({entry,output,noGc,buildDir:output+'-build',additionalRoots:[setup],isolatedScriptRoots:[setup,entry],initializationEntries:[setup,entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/reaching-originals#sloppy',setupEntries:[setup],testEntry:entry,scriptEntries:[setup,entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
                expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
            }
        }
    }finally{await rm(directory,{recursive:true,force:true});}
},900000);

const actualRead='{function keep(code){const saved=code;code="19;";return saved;}const selected=keep("17;");keep(String(Math.random())+";");print(eval(selected));print("read-input-complete");}';
const copiedRead='{let code=String(Math.random())+";";code="17;";code=code;print(eval(code));print("read-input-complete");}';
const priorReturn='{let previous;function run(flag){let code;if(flag){code=previous;return code;}else{code="19;";return code;}}previous=run(false);print(eval(run(true)));print("read-input-complete");}';
test('binding-read boundaries retain actual inputs, self-copy dependencies and values returned by prior calls',()=>{
    for(const source of [actualRead,copiedRead]){expect(reference(source)).toBe('17\nread-input-complete\n');const result=graph([{path:'subject.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.map(entry=>entry.source)).toContain('17;');}
    const opaque=actualRead.replace('const selected=keep("17;")','const selected=keep(String(Math.random())+";")');expect(reference(opaque)).toBe('19\nread-input-complete\n');expect(graph([{path:'subject.js',source:opaque}]).error).toContain('direct eval source is not a finite static string expression');
    expect(reference(priorReturn)).toBe('19\nread-input-complete\n');const prior=graph([{path:'subject.js',source:priorReturn}]);if(prior.error===null)expect(prior.directEvalSources.map(entry=>entry.source)).toContain('19;');else expect(prior.error).toContain('direct eval source is not a finite static string expression');
});

test('binding-read actual substitutions and copied stores match complete Node in both memory modes',async()=>{
    const source=actualRead+"\n"+copiedRead,expected=reference(source),directory=await mkdtemp(join(tmpdir(),'tsc2c-binding-read-native-'));
    try{const entry=join(directory,'subject.js');await writeFile(entry,source);for(const noGc of [false,true]){
        const output=join(directory,'program-'+noGc),diagnostics:string[]=[];
        const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/binding-read#sloppy',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
        expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind:'normal',stdout:expected});
    }}finally{await rm(directory,{recursive:true,force:true});}
},900000);
