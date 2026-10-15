import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';import * as os from 'node:os';import * as path from 'node:path';
import ts from 'typescript';import {compile} from '../../src/compile';
import {sourceEvaluationInvocations,sourceConstructorInvocations} from '../../src/source-value-flow';
import {parseHostObservation} from '../test262/protocol';

const projections=[
    'eval(value);','var alias=value;eval(alias);','var holder={value};eval(holder.value);',
    'var holder={get value(){return value;}};eval(holder.value);','function pass(input){return input;}eval(pass(value));',
    'eval.apply(null,[value]);','eval(...[value]);','eval(`${value}`);',
];
test('unresolved expression facts survive joins, calls, properties and actual Lists',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-unknown-merge-model-'));
    try{
        const entry=path.join(directory,'source.js');
        for(const dynamic of ['external','external()','JSON.parse(input)','foreign.code'])for(const projection of projections){
            await fs.writeFile(entry,`var value=flag?"31;":${dynamic};${projection}`);
            const calls=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}));
            expect(calls.length>0).toBe(true);expect(calls.some(call=>call.choices===null)).toBe(true);
        }
        for(const source of ['var invoke=flag?function(){return "31;";}:external;eval(invoke());',
            'var holder=flag?{code:"31;"}:external;eval(holder.code);',
            'var args=flag?["31;"]:external;eval(...args);']){
            await fs.writeFile(entry,source);
            expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).some(call=>call.choices===null)).toBe(true);
        }
        await fs.writeFile(entry,'var value=flag?"return 31;":external();Function(value);');
        expect(sourceConstructorInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([null]);
        await fs.writeFile(entry,'var object=new external();eval(object);eval(object.code);Function(object);');
        const constructed=ts.createProgram([entry],{allowJs:true,noLib:true});
        expect(sourceEvaluationInvocations(constructed).sort((a,b)=>a.node.pos-b.node.pos).map(call=>call.choices)).toEqual([[],null]);
        expect(sourceConstructorInvocations(constructed).map(call=>call.choices)).toEqual([null]);
        // A complete finite branch and a normal numeric category remain admissible.
        await fs.writeFile(entry,'var value=flag?"31;":"37;";eval(value);eval(external-1);');
        expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).sort((a,b)=>a.node.pos-b.node.pos).map(call=>call.choices?.slice().sort()??null)).toEqual([['31;','37;'],[]]);
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},30_000);

test('merged unknown source requires admission and executes its explicit registry in both memory modes',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-unknown-merge-native-'));
    const pieces=['var source=false?"31;":JSON.parse(/.*/.exec(\'"37;"\')[0]);','var alias0=source;'];
    const depth=512;for(let index=1;index<depth;index++)pieces.push(`var alias${index}=alias${index-1};`);
    pieces.push(`if(NATIVE_GC)$262.gc();print(eval(alias${depth-1}));`);
    try{
        const entry=path.join(directory,'source.js'),manifest=path.join(directory,'manifest.json');
        await fs.writeFile(entry,'var source=false?"31;":JSON.parse(\'"37;"\');eval(source);');
        expect(sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(call=>call.choices)).toEqual([['37;']]);
        await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC','false'));await fs.writeFile(manifest,JSON.stringify({eval:['31;','37;']}));
        const calls=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}));expect(calls.map(call=>call.choices)).toEqual([null]);
        const diagnostics:string[]=[],rejected=await compile({entry,output:path.join(directory,'rejected'),noGc:true,buildDir:path.join(directory,'reject-build'),
            isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
        expect(rejected.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
        const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
        expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(oracle.stdout.toString()).toBe('37\n');
        for(const noGc of [false,true]){
            await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC',String(!noGc)));
            const output=path.join(directory,'program-'+noGc),messages:string[]=[];
            const result=await compile({entry,output,noGc,runtimeCodeManifest:manifest,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/source-value-unknown-merge.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>messages.push(message)});
            expect({exitCode:result.exitCode,diagnostics:messages.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation).toMatchObject({kind:'normal',stdout:'37\n'});
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
