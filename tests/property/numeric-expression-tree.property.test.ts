import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const operators=['&','|','^','<<','>>','>>>'];
const values=['NaN','Infinity','-Infinity','0','-0','5e-324','-3.5','2147483648','-2147483649','4294967297','9223372036854775808','1.7976931348623157e308'];
const shifts=['NaN','Infinity','-1','0','1','31','32','33','4294967297','3.5'];
const pairs=values.flatMap(left=>shifts.map(right=>({left,right})));
const oracle=nodeReferenceSync(['node','-e',`const operators=${JSON.stringify(operators)},pairs=${JSON.stringify(pairs)};require('node:fs').writeSync(1,JSON.stringify(pairs.map(({left,right})=>operators.map(op=>Function('return ('+left+')'+op+'('+right+');')()))));`],{stdout:'pipe',stderr:'pipe',timeout:30_000});
if(oracle.exitCode!==0)throw new Error(oracle.stderr.toString());
const golden=JSON.parse(oracle.stdout.toString()) as number[][];

function subject(profile:boolean,noGc:boolean):string {
 const expressions=['4294967297|0','4294967297>>>0','1>>>-1','~4294967297','1<<32','1<<33','-1>>33','~(1e309)','~(~4294967297)'];
 const tree='0n'+Array.from({length:2048},(_,index)=>' ^ '+((index*17)&255)+'n').join('');
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${operators.map((op,index)=>`function typed${index}(left:number,right:number):number{return left${op}right;}function compound${index}(left:number,right:number):number{left${op}=right;return left;}`).join('\n')}
 function complement(value:number):number{return ~value;}
 const typed:any[]=[${operators.map((_,index)=>'typed'+index).join(',')}],compounds:any[]=[${operators.map((_,index)=>'compound'+index).join(',')}];
 const rows:any[]=[${pairs.map(({left,right},index)=>`[${left},${right},${JSON.stringify(golden[index])}]`).join(',')}];
 for(let index=0;index<rows.length;index++){const row=rows[index];for(let operation=0;operation<typed.length;operation++)check(Object.is(typed[operation](row[0],row[1]),row[2][operation])&&Object.is(compounds[operation](row[0],row[1]),row[2][operation]),'numeric-bitwise-'+index+'-'+operation);}
 ${expressions.map((expression,index)=>`check(Object.is(${expression},${[1,1,0,-2,1,2,-1,-1,1][index]}),'literal-bitwise-${index}');`).join('\n')}
 check(complement(4294967297)===-2&&complement(Infinity)===-1&&complement(-0)===-1,'complement-conversion');
 check(typed[0](5n,3n)===1n&&typed[1](-6n,3n)===-5n&&typed[2](-6n,3n)===-7n&&typed[3](8n,-1n)===4n&&typed[4](-8n,-1n)===-16n&&~(-6n)===5n,'actual-bigint-results');
 let caught:any;try{typed[5](1n,1n);}catch(error){caught=error;}check(caught instanceof TypeError,'bigint-unsigned-shift-rejection');
 const actual:number=typed0(5n,3n);check(typeof actual==='bigint'&&actual===1n,'typed-actual-numeric-result');
 const events:any[]=[],marker={};
 function left():any{events.push('left');return{[Symbol.toPrimitive](hint:any):any{events.push('left:'+hint);collect();return 4294967297;}};}
 function right():any{events.push('right');return{[Symbol.toPrimitive](hint:any):any{events.push('right:'+hint);return 33;}};}
 check((left()<<right())===2&&events.join('|')==='left|right|left:number|right:number','ordered-bitwise-conversion');
 caught=undefined;try{typed0({[Symbol.toPrimitive](){throw marker;}},0);}catch(error){caught=error;}check(caught===marker,'abrupt-bitwise-conversion');
 events.length=0;caught=undefined;try{({[Symbol.toPrimitive](hint:any){events.push('left:'+hint);return 1n;}}|{[Symbol.toPrimitive](hint:any){events.push('right:'+hint);return 1;}});}catch(error){caught=error;}check(caught instanceof TypeError&&events.join('|')==='left:number|right:number','conversion-before-numeric-kind-separation');
 check(('prefix:'+({[Symbol.toPrimitive](hint:any){return hint;}}))==='prefix:default'&&('6'-1)===5&&('6'*2)===12&&('6'/2)===3&&('6'%4)===2&&('2'**3)===8,'numeric-tree-operation-partitions');
 const deep:any=${tree};collect();check(deep===0n,'deep-numeric-expression-tree');
 events.length=0;let stored:any;
 const owner={get value(){events.push('get');collect();return 4294967297;},set value(value:any){events.push('set');stored=value;}};
 async function suspended():Promise<any>{owner.value<<=await Promise.resolve(33);return stored;}
 async function observe():Promise<void>{const value=await suspended();collect();check(value===2&&stored===2&&events.join('|')==='get|set','saved-compound-reference-through-suspension');}observe();
 `;
}

test('Numeric expression trees share ordered value kernels and portable bitwise semantics',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-numeric-expression-tree-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const expected=new Map<boolean,string[]>();
  for(const profile of [false,true]){
   const entry=path.join(temporary,`reference-${profile}.mjs`);await fs.writeFile(entry,erase(subject(profile,true)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('saved-compound-reference-through-suspension:true');expected.set(profile,lines);
  }
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/numeric-expression-tree.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(profile)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},1_200_000);
