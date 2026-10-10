import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const forms=['value++','++value','value--','--value'];
const inputs=[
 {type:'string',expression:'" 0b11 "'}, {type:'string',expression:'"invalid"'},
 {type:'boolean',expression:'true'}, {type:'boolean',expression:'false'},
 {type:'number',expression:'-0'}, {type:'number',expression:'NaN'},
 {type:'number',expression:'Infinity'}, {type:'number',expression:'9007199254740992'},
 {type:'bigint',expression:'7n'}, {type:'null',expression:'null'},
 {type:'undefined',expression:'undefined'}, {type:'symbol',expression:'Symbol("input")'},
];
const oracle=Bun.spawnSync(['node','-e',`const inputs=${JSON.stringify(inputs)},forms=${JSON.stringify(forms)};function literal(value){return typeof value==='bigint'?String(value)+'n':Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value);}require('node:fs').writeSync(1,JSON.stringify(inputs.map(input=>forms.map(form=>{try{const [returned,stored]=Function('let value='+input.expression+';const returned='+form+';return[returned,value];')();return{returned:literal(returned),stored:literal(stored)};}catch(error){return{error:error.constructor.name};}}))));`],{stdout:'pipe',stderr:'pipe',timeout:30_000});
if(oracle.exitCode!==0)throw new Error(oracle.stderr.toString());
const golden=JSON.parse(oracle.stdout.toString()) as {returned?:string,stored?:string,error?:string}[][];

function subject(profile:boolean,noGc:boolean,stressInput:boolean):string {
 const operations=forms.map((form,index)=>`function binding${index}(value:any):any{const read=()=>value;let returned:any,error:any;try{returned=${form};}catch(reason){error=reason;}collect();return{returned,error,stored:read()};}
 function property${index}(owner:any):any{const alias=owner,read=()=>alias.value;let returned:any,error:any;try{returned=${form.replace('value','owner.value')};}catch(reason){error=reason;}collect();return{returned,error,stored:read()};}`).join('\n');
 const aliases=stressInput?Array.from({length:2048},(_,index)=>`const retained${index}:string=${index?'retained'+(index-1):'stress'};`).join('\n'):'const retained:string=stress;';
 return `// @ts-nocheck
 export {};
 const host=globalThis,collectHook=${profile&&!noGc?'host.$262.gc':'undefined'};
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'collectHook();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${operations}
 const bindings:any[]=[${forms.map((_,index)=>'binding'+index).join(',')}],properties:any[]=[${forms.map((_,index)=>'property'+index).join(',')}];
 const rows:any[]=[${inputs.map((input,index)=>`[${input.expression},[${golden[index]!.map(result=>result.error?'{error:TypeError}':`{returned:${result.returned},stored:${result.stored}}`).join(',')}]]`).join(',')}];
 function verify(actual:any,expected:any,original:any,label:string):void{check(expected.error?actual.error instanceof expected.error&&Object.is(actual.stored,original):actual.error===undefined&&Object.is(actual.returned,expected.returned)&&Object.is(actual.stored,expected.stored)&&typeof actual.stored===typeof expected.stored,label);}
 for(let row=0;row<rows.length;row++)for(let operation=0;operation<bindings.length;operation++){
  const original=rows[row][0],expected=rows[row][1][operation];
  verify(bindings[operation](original),expected,original,'binding-write-'+row+'-'+operation);
  verify(properties[operation]({value:original}),expected,original,'property-write-'+row+'-'+operation);
  const hints:any[]=[],wrapped={ [Symbol.toPrimitive](hint:any){hints.push(hint);collect();return original;} };
  verify(bindings[operation](wrapped),expected,wrapped,'wrapped-binding-write-'+row+'-'+operation);check(hints.join('|')==='number','update-conversion-hint-'+row+'-'+operation);
 }
 let literalString:string='2';const literalRead=()=>literalString,literalBefore=literalString++;collect();check(literalBefore===2&&literalRead()===3&&typeof literalString==='number','literal-string-write-domain');
 let literalBoolean:boolean=true;const booleanBefore=literalBoolean--;check(booleanBefore===1&&literalBoolean===0&&typeof literalBoolean==='number','literal-boolean-write-domain');
 let signed:number=-0;const signedBefore=signed++;check(Object.is(signedBefore,-0)&&signed===1,'literal-signed-number-write');
 const literalOwner:{value:string}={value:'2'};check(++literalOwner.value===3&&literalOwner.value===3&&typeof literalOwner.value==='number','literal-property-write-domain');
 const direct:string=-7n;check(direct===-7n&&typeof direct==='bigint','direct-numeric-result-domain');
 let top:string='2';const topRead=()=>top;const topBefore=top++;collect();check(topBefore===2&&topRead()===3&&typeof top==='number','module-write-domain');
 class Holder {value:string='2';advance():any{return this.value++;}}
 const instance=new Holder();check(instance.advance()===2&&instance.value===3&&typeof instance.value==='number','native-field-write-domain');
 let compound:string='6';const compoundRead=()=>compound;check((compound*=2)===12&&compoundRead()===12&&typeof compound==='number','compound-write-domain');
 let bigintCompound:number=7n;check((bigintCompound+=1n)===8n&&typeof bigintCompound==='bigint','compound-actual-bigint-domain');
 const events:any[]=[],marker={};let owner:any={value:{[Symbol.toPrimitive](hint:any){events.push(hint);collect();return 7n;}}};
 function key():string{events.push('key');collect();return 'value';}
 const old=owner[key()]++;check(old===7n&&owner.value===8n&&events.join('|')==='key|number','saved-property-reference-and-conversion');
 const abrupt={ [Symbol.toPrimitive](){collect();throw marker;} };let unchanged:string=abrupt,caught:any;
 try{unchanged++;}catch(error){caught=error;}check(caught===marker&&unchanged===abrupt,'abrupt-update-preserves-slot');
 const numericOwner={ [Symbol.toPrimitive](hint:any){events.push(hint);collect();return 7n;} };let stress:string=numericOwner;const before=stress++;
 ${aliases}
 const read=()=>${stressInput?'retained2047':'retained'};collect();check(before===7n&&read()===8n&&typeof read()==='bigint','actual-write-dependency-graph');
 async function suspended():Promise<void>{await Promise.resolve();collect();check(read()===8n&&topRead()===3,'captured-write-domain-through-suspension');}
 suspended();
 `;
}

test('Numeric writes preserve the actual value domain through the canonical dependency graph',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-numeric-write-storage-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stressInput:false}))));
  plans.push({typed:true,profile:true,noGc:false,stressInput:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stressInput}`))){
   const [profile,stressInput]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stressInput!)));
   const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('captured-write-domain-through-suspension:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stressInput} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stressInput}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stressInput);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/numeric-write-storage.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stressInput,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stressInput,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal',scenarioId:'property/numeric-write-storage.js#module'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected.get(`${profile}-${stressInput}`)!);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
