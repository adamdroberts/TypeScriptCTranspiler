import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const dividends=['NaN','Infinity','-Infinity','0','-0','4','-4','5e-324','-5e-324','9007199254740993','9223372036854775808','1.7976931348623157e308'];
const divisors=['NaN','Infinity','-Infinity','0','-0','2','-2','3','5e-324'];
const pairs=dividends.flatMap(left=>divisors.map(right=>({left,right})));
const arithmetic=['(9007199254740992 + 1) - 9007199254740992','(9007199254740992 + 1) % 3','(9223372036854775808 - 1) % 3','(-0) * 7','(-4) * 0','(9007199254740991 + 2) - 9007199254740991'];
const literalOracle=nodeReferenceSync(['node','-e',`const pairs=${JSON.stringify(pairs)},arithmetic=${JSON.stringify(arithmetic)};function literal(value){return Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value);}require("node:fs").writeSync(1,JSON.stringify({remainders:pairs.map(({left,right})=>literal(Function('return ('+left+') % ('+right+');')())),arithmetic:arithmetic.map(source=>literal(Function('return '+source+';')()))}));`],{stdout:'pipe',stderr:'pipe',timeout:30_000});
if(literalOracle.exitCode!==0)throw new Error(literalOracle.stderr.toString());
const golden=JSON.parse(literalOracle.stdout.toString()) as {remainders:string[],arithmetic:string[]};

function subject(profile:boolean,noGc:boolean):string {
 let aliases='let retained0:number=-0;';for(let depth=1;depth<=1024;depth++)aliases+=`const retained${depth}:number=retained${depth-1};`;
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 function typed(left:number,right:number):number{return left%right;}
 function boxed(left:any,right:any):any{return left%right;}
 function compound(left:number,right:number):number{left%=right;return left;}
 ${pairs.map(({left,right},index)=>`check(Object.is((${left})%(${right}),${golden.remainders[index]})&&Object.is(typed(${left},${right}),${golden.remainders[index]})&&Object.is(boxed(${left},${right}),${golden.remainders[index]})&&Object.is(compound(${left},${right}),${golden.remainders[index]}),'remainder-${index}');`).join('\n')}
 ${arithmetic.map((expression,index)=>`check(Object.is(${expression},${golden.arithmetic[index]}),'binary64-intermediate-${index}');`).join('\n')}
 ${dividends.map((value,index)=>`{let value:number=${value};const getter=()=>value;collect();check(Object.is(value,${value})&&Object.is(getter(),${value}),'source-storage-${index}');}`).join('\n')}
 let zero:number=-0;check(Object.is(zero,-0)&&1/zero===-Infinity,'stored-negative-zero');
 let counter:number=9007199254740992;const old=counter++;check(old===9007199254740992&&counter===old,'rounded-update');counter+=1;check(counter===old,'rounded-compound-storage');
 const events:any[]=[],marker={};
 function left():any{events.push('left');return{[Symbol.toPrimitive](hint:any):any{events.push('left:'+hint);collect();return -4;}};}
 function right():any{events.push('right');return{[Symbol.toPrimitive](hint:any):any{events.push('right:'+hint);return 2;}};}
 check(Object.is(left()%right(),-0)&&events.join('|')==='left|right|left:number|right:number','ordered-remainder-conversion');
 let caught:any;try{boxed({[Symbol.toPrimitive](){throw marker;}},0);}catch(error){caught=error;}check(caught===marker,'abrupt-remainder-conversion');
 caught=undefined;try{boxed(1,1n);}catch(error){caught=error;}check(caught instanceof TypeError&&(-4n)%2n===0n,'numeric-kind-separation');
 const set=new Set([NaN,-0,Infinity,9223372036854775808]);check(set.has(NaN)&&set.has(0)&&set.has(Infinity)&&set.has(9223372036854775808),'numeric-collection-inputs');
 ${aliases}
 function captured():number{return retained1024;}
 async function observe():Promise<void>{const value:number=await Promise.resolve(captured());collect();check(Object.is(value,-0)&&Object.is(captured(),-0),'deep-retained-number-dependency-graph');}
 observe();
 `;
}

test('Source Numbers retain binary64 storage, intermediates and canonical remainder semantics',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-number-storage-remainder-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const entry=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(entry,erase(subject(profile,true)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-retained-number-dependency-graph:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/number-storage-remainder.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
