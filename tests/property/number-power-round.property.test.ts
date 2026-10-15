import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const compoundOperators=['+=','-=','*=','/=','%=','**=','&=','|=','^=','<<=','>>=','>>>='];
const baseSources=['NaN','-Infinity','-2','-1','-0','0','0.5','1','2','Infinity'];
const exponentSources=['NaN','-Infinity','-3','-2','-0.5','-0','0','0.5','1','2','3','9007199254740991','9007199254740992','Infinity'];
const roundSources=['NaN','-Infinity','Infinity','-0','0','-Number.MIN_VALUE','Number.MIN_VALUE'];
// Neighbours of integral/tie and representability boundaries are generated
// from the binary64 format, independently of any emitter or runtime shape.
for(const sign of [-1,1])for(const exponent of [-1,0,1,10,51,52,53]) {
 const magnitude=2**exponent,ulp=2**(exponent-52);
 for(const offset of [-ulp,0,ulp,0.5-ulp/2,0.5,0.5+ulp])roundSources.push(String(sign*(magnitude+offset)));
}
roundSources.push('0.49999999999999994','0.5','0.5000000000000001','-0.49999999999999994','-0.5','-0.5000000000000001','4503599627370497');

function subject(powerExpected:string[],roundExpected:string[],compoundExpected:string[],profile:boolean,noGc:boolean):string {
 const powers=baseSources.flatMap(base=>exponentSources.map(exponent=>`[${base},${exponent},${powerExpected.shift()}]`));
 const rounds=roundSources.map((input,index)=>`[${input},${roundExpected[index]}]`);
 const compounds=compoundOperators.map((op,index)=>`let scalar${index}:number=2;function scalarRhs${index}():number{scalar${index}=3;return 2;}check((scalar${index}${op}scalarRhs${index}())===${compoundExpected[index]}&&scalar${index}===${compoundExpected[index]},'compound-read-before-rhs-${op}');`);
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function samePower(actual:number,expected:number):boolean{return Object.is(actual,expected)||Number.isFinite(actual)&&Number.isFinite(expected)&&expected!==0&&Math.abs((actual-expected)/expected)<1e-14;}
 const intrinsic=Math.pow;
 function ordinary(base:number,exponent:number):number{return base**exponent;}
 function compound(base:number,exponent:number):number{base**=exponent;return base;}
 const operations=[(base:number,exponent:number)=>Math.pow(base,exponent),(base:number,exponent:number)=>Math['pow'](base,exponent),(base:number,exponent:number)=>intrinsic(base,exponent),ordinary,compound];
 for(const [base,exponent,expected] of [${powers.join(',')}])check(operations.every(operation=>samePower(operation(base,exponent),expected)),'number-exponentiate-domain');
 for(const [input,expected] of [${rounds.join(',')}])check(Object.is(Math.round(input),expected)&&Object.is(Math['round'](input),expected),'round-integral-tie-boundary');
 const events:any[]=[],marker={token:37};
 function operand(label:string,value:any):any{return {valueOf(){events.push(label);collect();return value;}};}
 function second(label:string,value:any):any{events.push('evaluate-'+label);return operand(label,value);}
 check(ordinary(operand('base',2),second('exponent',3))===8&&events.join('|')==='evaluate-exponent|base|exponent','operator-evaluation-before-ordered-conversion');
 events.length=0;check(Math.pow(operand('base',2),second('exponent',3))===8&&events.join('|')==='evaluate-exponent|base|exponent','math-evaluation-before-ordered-conversion');
 events.length=0;check(Math.round(operand('round',0.49999999999999994),(events.push('ignored'),marker))===0&&events.join('|')==='ignored|round','round-ignored-actual-before-conversion');
 events.length=0;let caught:any;try{Math.pow({valueOf(){events.push('throw-base');collect();throw marker;}},operand('exponent',3));}catch(error){caught=error;}
 check(caught===marker&&events.join('|')==='throw-base','numeric-abrupt-identity-and-short-circuit');
 for(const operation of [Math.pow,ordinary]){events.length=0;let mixed=false;try{operation(2n,operand('right',3));}catch(error){mixed=error instanceof TypeError;}check(mixed&&events.join('|')===(operation===Math.pow?'':'right'),'operation-specific-number-numeric-conversion');}
 check(ordinary(2n,3n)===8n,'shared-operator-keeps-bigint-domain');
 const initial=operand('saved-base',2),replacement=operand('replacement',3);let owner:any={value:initial},savedOwner=owner;
 Object.defineProperty(savedOwner,'power',{get(){events.push('get');collect();return this.value;},set(value:any){events.push('set');collect();this.value=value;},configurable:true});
 events.length=0;function rhs():any{events.push('rhs');owner={value:replacement};return operand('rhs-number',3);}
 const assigned=(owner.power**=rhs());check(assigned===8&&savedOwner.value===8&&owner.value===replacement&&events.join('|')==='get|rhs|saved-base|rhs-number|set','compound-retains-reference-and-old-value');
 ${compounds.join('\n')}
 let big:any=2n;function bigRhs():any{big=3n;return 2n;}check((big**=bigRhs())===4n&&big===4n,'bigint-compound-read-before-rhs');
 let retained:any={base:operand('deep-base',2),exponent:operand('deep-exponent',3)};for(let depth=0;depth<2048;depth++)retained={next:retained};collect();for(let depth=0;depth<2048;depth++)retained=retained.next;check(ordinary(retained.base,retained.exponent)===8,'retained-numeric-owner-graph-stress');
 const math=Math,original=math.pow;math.pow=function(...actual:any[]):any{return [this,actual];};
 const changed=Math.pow(marker,undefined,marker);check(changed[0]===math&&changed[1].length===3&&changed[1][0]===marker&&changed[1][1]===undefined&&changed[1][2]===marker,'mutable-math-owner-and-actual-list');
 async function delayed():Promise<any>{return Math.pow(marker,await Promise.resolve(marker));}const pending=delayed();math.pow=()=>undefined;math.pow=original;
 async function suspended():Promise<void>{const value=await pending;collect();check(value[0]===math&&value[1][0]===marker&&value[1][1]===marker,'saved-numeric-callee-through-suspension');}suspended();
 `;
}

test('Number exponentiation and Math.round share prescribed binary64 partitions',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-number-power-round-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const answers=nodeReferenceSync(['node','-e',`const encode=value=>Number.isNaN(value)?'NaN':Object.is(value,-0)?'-0':String(value);require('node:fs').writeSync(1,JSON.stringify({power:[${baseSources.join(',')}].flatMap(base=>[${exponentSources.join(',')}].map(exponent=>encode(Math.pow(base,exponent)))),round:[${roundSources.join(',')}].map(value=>encode(Math.round(value))),compound:[${compoundOperators.map(op=>`(()=>{let value=2;function rhs(){value=3;return 2;}return encode(value${op}rhs());})()`).join(',')}]}));`],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:answers.exitCode,stderr:answers.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expectedValues=JSON.parse(answers.stdout.toString()) as {power:string[];round:string[];compound:string[]};
  const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,erase(subject([...expectedValues.power],expectedValues.round,expectedValues.compound,false,true)));
  const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('saved-numeric-callee-through-suspension:true');
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
   const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject([...expectedValues.power],expectedValues.round,expectedValues.compound,profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/number-power-round.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
