import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {compile} from '../../src/compile';
import {sourceEvaluationInvocations,sourceConstructorInvocations} from '../../src/source-value-flow';
import {parseHostObservation} from '../test262/protocol';

const numeric=['-','*','**','/','%','<<','>>','>>>','&','|','^'];
const comparison=['<','<=','>','>=','==','!=','===','!==','in','instanceof'];
const expressions=[...numeric.map(op=>`left ${op} right`),...comparison.map(op=>`left ${op} right`),
    ...numeric.map(op=>`left ${op}= right`),...['+','-','~','!','++','--'].map(op=>`${op}left`),'left++','left--','delete left.key','void left'];

test('normal non-String result categories flow without enumerating numeric values',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-eval-result-model-'));
    try{
        const entry=path.join(directory,'source.js');
        await fs.writeFile(entry,'var left=external,right=external2;'+expressions.map(expr=>`eval(${expr});`).join('')+'eval(typeof left);');
        const calls=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).sort((a,b)=>a.node.pos-b.node.pos);
        expect(calls.slice(0,-1).map(call=>call.choices)).toEqual(expressions.map(()=>[]));
        expect(calls.at(-1)!.choices?.slice().sort()).toEqual(['undefined','object','boolean','number','bigint','string','symbol','function'].sort());
        await fs.writeFile(entry,'var n=external;var item=external2?"31;":n-1;eval(item);eval(`${item}`);Function(item);$262.evalScript(item);');
        const program=ts.createProgram([entry],{allowJs:true,noLib:true});
        expect(sourceEvaluationInvocations(program).sort((a,b)=>a.node.pos-b.node.pos).map(call=>call.choices)).toEqual([['31;'],null,null]);
        expect(sourceConstructorInvocations(program).map(call=>call.choices)).toEqual([null]);
        await fs.writeFile(entry,'var left=external,right=external2;eval(`${left<right}`);Function(left<right);');
        const booleanProgram=ts.createProgram([entry],{allowJs:true,noLib:true});
        expect(sourceEvaluationInvocations(booleanProgram).map(call=>call.choices)).toEqual([['true','false']]);
        expect(sourceConstructorInvocations(booleanProgram).map(call=>call.choices)).toEqual([[['true','false']]]);
    }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('unbounded numeric text conversion retains the explicit unknown-source diagnostic',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-eval-result-guard-'));
    try{
        const entry=path.join(directory,'source.js'),diagnostics:string[]=[];
        await fs.writeFile(entry,'var n=37;var item=flag?"31;":n-1;eval(`${item}`);');
        const result=await compile({entry,output:path.join(directory,'program'),noGc:true,buildDir:path.join(directory,'build'),
            isolatedScriptRoots:[entry],initializationEntries:[entry],diagnosticWriter:message=>diagnostics.push(message)});
        expect(result.exitCode).toBe(3);
        expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list or gated --unsafe-eval embedded Node bridge');
    }finally{await fs.rm(directory,{recursive:true,force:true});}
});

test('eval preserves primitive results and abrupt conversion through native source flow in both memory modes',async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-eval-result-native-'));
    const pieces:string[]=[],expected:string[]=[];
    // Independent value/order expectations cover semantic result categories.
    const cases:[string,string][]=[['17-3','number:14'],['17*3','number:51'],['17**3','number:4913'],['17/3','number:'+String(17/3)],['17%3','number:2'],
        ['17<<3','number:136'],['17>>3','number:2'],['17>>>3','number:2'],['17&3','number:1'],['17|3','number:19'],['17^3','number:18'],
        ['17n-3n','bigint:14'],['17n**3n','bigint:4913'],['17<3','boolean:false'],['17===17','boolean:true'],['"key" in {key:1}','boolean:true'],
        ['[] instanceof Array','boolean:true'],['+"17"','number:17'],['-17','number:-17'],['~17','number:-18'],['!17','boolean:false'],['void 17','undefined:undefined']];
    for(const [expression,answer] of cases){pieces.push(`var value=eval(${expression});print(typeof value+":"+String(value));`);expected.push(answer);}
    pieces.push('var trace=[];var object={[Symbol.toPrimitive]:function(hint){trace.push(hint);return 23;}};print(eval(object-1));print(trace.join(","));');expected.push('22','number');
    for(const expression of ['1n-1','+1n','1n>>>1n','Symbol()-1']){pieces.push(`try{eval(${expression});}catch(error){print(error.constructor.name);}`);expected.push('TypeError');}
    pieces.push('var n=29;print(eval(n-=3));print(eval(n++));print(eval(++n));');expected.push('26','26','28');
    pieces.push('function result(value){return value-1;}var holder={value:result(37)};print(eval(holder.value));');expected.push('36');
    const depth=512;pieces.push('var alias0=41-1;');for(let index=1;index<depth;index++)pieces.push(`var alias${index}=alias${index-1};`);
    pieces.push(`if(NATIVE_GC)$262.gc();print((0,eval)(alias${depth-1}));`);expected.push('40');
    try{
        const entry=path.join(directory,'source.js');await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC','false'));
        const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
        expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(oracle.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        for(const noGc of [false,true]){
            await fs.writeFile(entry,pieces.join('\n').replaceAll('NATIVE_GC',String(!noGc)));
            const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/eval-nonstring-results.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
