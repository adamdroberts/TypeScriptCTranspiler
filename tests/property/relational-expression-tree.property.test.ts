import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const operators=['<','<=','>','>='];
const values=['undefined','null','true','false','-0','NaN','Infinity','-Infinity','7.5','9007199254740992','7n','9007199254740993n','"2"','"10"','"0x10"','"1.5"','"invalid"','"\\uD83D\\uDE00"','"\\uFFFF"','"\\uD800"','Symbol("input")'];
const oracle=nodeReferenceSync(['node','-e',`const operators=${JSON.stringify(operators)},values=${JSON.stringify(values)};require('node:fs').writeSync(1,JSON.stringify(values.map(left=>values.map(right=>operators.map(op=>{try{return{value:Function('return ('+left+')'+op+'('+right+');')()};}catch(error){return{error:error.constructor.name};}})))));`],{stdout:'pipe',stderr:'pipe',timeout:30_000});
if(oracle.exitCode!==0)throw new Error(oracle.stderr.toString());
const golden=JSON.parse(oracle.stdout.toString()) as {value?:boolean,error?:string}[][][];

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const deep=stress?`function leaf():any{return{[Symbol.toPrimitive](){collect();return false;}};}
 check((${Array.from({length:1024},()=> '~leaf()').join(' < ')})===false,'deep-mixed-relational-tree');`:'';
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${operators.map((op,index)=>`function operation${index}(left:any,right:any):boolean{return left${op}right;}`).join('\n')}
 const operations:any[]=[${operators.map((_,index)=>'operation'+index).join(',')}],values:any[]=[${values.join(',')}];
 const expected:string=${JSON.stringify(golden.flat(2).map(result=>result.error?'E':result.value?'T':'F').join(''))};
 for(let left=0;left<values.length;left++)for(let right=0;right<values.length;right++)for(let operation=0;operation<operations.length;operation++){
  const want=expected.charAt((left*values.length+right)*operations.length+operation);let returned:any,caught:any;
  try{returned=operations[operation](values[left],values[right]);}catch(error){caught=error;}
  check(want==='E'?caught instanceof TypeError:caught===undefined&&returned===(want==='T'),'relational-partition-'+left+'-'+right+'-'+operation);
 }
 check(true<false===false&&'2'<3&&'2'>1&&true>=1&&null<=0,'literal-relational-conversion');
 check('\\uD83D\\uDE00'<'\\uFFFF'&&'\\uD800'<'\\uD83D\\uDE00','utf16-relational-order');
 const actual:string=true<false;check(typeof actual==='boolean'&&actual===false,'actual-relational-result-domain');
 const events:any[]=[],marker={};
 function left():any{events.push('left');return{[Symbol.toPrimitive](hint:any){events.push('left:'+hint);collect();return 1;}};}
 function right():any{events.push('right');return{[Symbol.toPrimitive](hint:any){events.push('right:'+hint);collect();return 2;}};}
 for(let operation=0;operation<operations.length;operation++){
  events.length=0;check(operations[operation](left(),right())===${JSON.stringify([true,true,false,false])}[operation]&&events.join('|')==='left|right|left:number|right:number','ordered-relational-conversion-'+operation);
 }
 let caught:any;events.length=0;
 const abrupt={ [Symbol.toPrimitive](){events.push('abrupt');collect();throw marker;} };
 try{abrupt<right();}catch(error){caught=error;}check(caught===marker&&events.join('|')==='right|abrupt','abrupt-relational-conversion');
 const freshLeft={ [Symbol.toPrimitive](){return BigInt('9007199254740993');} },freshRight={ [Symbol.toPrimitive](){collect();return BigInt('9007199254740994');} };
 check(freshLeft<freshRight,'fresh-converted-bigint-owner');
 ${deep}
 async function suspended():Promise<void>{const left={valueOf(){collect();return 7n;}};check(left<(await Promise.resolve('8')),'saved-relational-operand-through-suspension');}
 suspended();
 `;
}

test('Relational forms share ordered conversion and the retained operation tree',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-relational-expression-tree-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-relational-operand-through-suspension:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/relational-expression-tree.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/relational-expression-tree.js#module'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(`${profile}-${stress}`)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},1_200_000);
