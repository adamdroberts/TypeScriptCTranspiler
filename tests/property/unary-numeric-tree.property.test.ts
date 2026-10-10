import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const operators=['+','-','~'];
const values=['undefined','null','true','false','0','-0','NaN','Infinity','-Infinity','5e-324','"0b11"','"  "','"nonumeric"','0n','-7n','Symbol("input")'];
const oracle=Bun.spawnSync(['node','-e',`const operators=${JSON.stringify(operators)},values=${JSON.stringify(values)};function literal(value){return typeof value==='bigint'?String(value)+'n':Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value);}require('node:fs').writeSync(1,JSON.stringify(values.map(value=>operators.map(op=>{try{return{value:literal(Function('return '+op+'('+value+');')())};}catch(error){return{error:error.constructor.name};}}))));`],{stdout:'pipe',stderr:'pipe',timeout:30_000});
if(oracle.exitCode!==0)throw new Error(oracle.stderr.toString());
const golden=JSON.parse(oracle.stdout.toString()) as {value?:string,error?:string}[][];

function subject(profile:boolean,noGc:boolean):string {
 const tree=Array.from({length:1024},()=>'-leaf()').join(' + ');
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${operators.map((op,index)=>`function operation${index}(value:any):any{return ${op}value;}`).join('\n')}
 const operations:any[]=[operation0,operation1,operation2];
 const rows:any[]=[${values.map((expression,index)=>`[${expression},[${golden[index]!.map(result=>result.error?'{error:TypeError}':`{value:${result.value}}`).join(',')}]]`).join(',')}];
 for(let rowIndex=0;rowIndex<rows.length;rowIndex++)for(let operation=0;operation<operations.length;operation++){
  const row=rows[rowIndex],expected=row[1][operation];let actual:any,caught:any;
  try{actual=operations[operation](row[0]);}catch(error){caught=error;}
  check(expected.error?caught instanceof expected.error:caught===undefined&&Object.is(actual,expected.value),'primitive-unary-'+rowIndex+'-'+operation);
  const events:any[]=[],wrapped={ [Symbol.toPrimitive](hint:any){events.push(hint);collect();return row[0];}};actual=undefined;caught=undefined;
  try{actual=operations[operation](wrapped);}catch(error){caught=error;}
  check(events.join('|')==='number'&&(expected.error?caught instanceof expected.error:caught===undefined&&Object.is(actual,expected.value)),'wrapped-unary-'+rowIndex+'-'+operation);
 }
 check(-true===-1&&Object.is(-false,-0)&&-'0b11'===-3&&+false===0&&~true===-2,'literal-unary-conversion');
 const actual:number=operation1(7n);check(typeof actual==='bigint'&&actual===-7n,'actual-unary-result');
 const events:any[]=[],marker={};
 const fallback={valueOf(){events.push('valueOf');collect();return {};},toString(){events.push('toString');return '6';}};
 check(-fallback===-6&&events.join('|')==='valueOf|toString','ordinary-unary-primitive-fallback');
 let caught:any;try{-{[Symbol.toPrimitive](){throw marker;}};}catch(error){caught=error;}check(caught===marker,'abrupt-unary-conversion');
 caught=undefined;try{+{[Symbol.toPrimitive](){collect();return 1n;}};}catch(error){caught=error;}check(caught instanceof TypeError,'unary-plus-bigint-conversion-rejection');
 events.length=0;
 function left():any{events.push('left');return{[Symbol.toPrimitive](hint:any){events.push('left:'+hint);collect();return false;}};}
 function right():any{events.push('right');return{[Symbol.toPrimitive](hint:any){events.push('right:'+hint);return false;}};}
 check(Object.is(-left()+-right(),-0)&&events.join('|')==='left|left:number|right|right:number','mixed-tree-evaluation-order');
 function leaf():any{return{valueOf(){collect();return false;}};}
 const deep:any=${tree};check(Object.is(deep,-0),'deep-retained-prefix-binary-tree');
 const wrapped={ [Symbol.toPrimitive](hint:any){collect();if(hint!=='number')throw 'hint';return 7n;}};
 async function delayed():Promise<any>{return -(await Promise.resolve(wrapped));}
 async function observe():Promise<void>{const value=await delayed();collect();check(value===-7n,'saved-unary-operand-through-suspension');}observe();
 `;
}

test('Unary numeric forms share actual conversion and the retained numeric tree',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-unary-numeric-tree-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const entry=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(entry,erase(subject(profile,true)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-unary-operand-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/unary-numeric-tree.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
