import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const token=(value:number):string=>Object.is(value,-0)?'-0':String(value);
function inputs():number[] {
 const values=[NaN,Infinity,-Infinity,0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,1.0004882812500002];
 const view=new DataView(new ArrayBuffer(8));
 function neighbour(value:number,up:boolean):number{view.setFloat64(0,value);view.setBigUint64(0,view.getBigUint64(0)+(up?1n:-1n));return view.getFloat64(0);}
 function around(value:number):void{for(const adjacent of [neighbour(value,false),value,neighbour(value,true)])values.push(adjacent,-adjacent);}
 for(const [precision,minimum,maximum] of [[11,-14,15],[24,-126,127]]) {
  for(const exponent of [minimum,minimum+1,-1,0,maximum-1,maximum])for(const low of [0,1,2,3,2**(precision-1)-2]) {
   const quantum=2**(exponent-precision+1);around(2**exponent+(low+0.5)*quantum);
  }
  const quantum=2**(minimum-precision+1);
  for(const low of [0,1,2,3,2**(precision-1)-2,2**(precision-1)-1])around((low+0.5)*quantum);
  around((2-2**(1-precision))*2**maximum+2**(maximum-precision));
 }
 let seed=0x341791ab;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let index=0;index<96;index++){view.setUint32(0,random());view.setUint32(4,random());values.push(view.getFloat64(0));}
 return values;
}
function subject(values:number[],answers:string[][],profile:boolean,noGc:boolean):string {
 const rows=values.map((value,index)=>`[${token(value)},${answers[index].join(',')}]`);
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const operations=[Math.f16round,Math.fround],marker={token:47},events:any[]=[];
 for(const [value,half,single] of [${rows.join(',')}])check(Object.is(Math.f16round(value),half)&&Object.is(Math.fround(value),single)&&Object.is(operations[0].call(marker,value),half)&&Object.is(operations[1].call(marker,value),single),'generated-one-round-format-conversion');
 const primitives=[[undefined,NaN],[null,0],[true,1],[false,0],['',0],['1',1],['-0',-0],['Infinity',Infinity]];
 for(const operation of operations){
  for(const [value,expected] of primitives)check(Object.is(operation(value),expected),'shared-to-number-primitive-partitions');
  for(const value of [1n,Symbol('number'),Object(1n)]){let caught:any;try{operation(value);}catch(error){caught=error;}check(caught instanceof TypeError,'shared-to-number-rejects-nonnumeric-domain');}
  check(Number.isNaN(operation()),'omitted-actual-to-number');
  let caught:any;try{operation({valueOf(){collect();throw marker;}});}catch(error){caught=error;}check(caught===marker,'to-number-abrupt-identity');
 }
 const converted={[Symbol.toPrimitive](hint:string){events.push(hint);collect();return '1.0004882812500002';}};
 events.length=0;check(Math.f16round(converted,(events.push('ignored'),marker))===1.0009765625&&events.join('|')==='ignored|number','actual-effects-before-one-round-conversion');
 const original=Math.f16round;let owner:any={operation:original,input:converted};for(let depth=0;depth<2048;depth++)owner={next:owner};collect();for(let depth=0;depth<2048;depth++)owner=owner.next;check(owner.operation(owner.input)===1.0009765625,'retained-rounding-owner-graph-stress');
 function typed(value:number):number{return Math.f16round(value);}check(typed(converted)===1.0009765625,'typed-formal-consumes-actual-value');
 async function delayed():Promise<any>{return Math.f16round(await Promise.resolve(converted));}const pending=delayed();Math.f16round=()=>({token:marker});check(typed(1).token===marker,'mutable-format-callee-and-actual-result');Math.f16round=original;
 const factories=[()=>({nested:[{value:marker}]}),function(){return {nested:[{value:marker}]};},function(){try{return {nested:[{value:marker}]};}finally{collect();}},function(){for(const value of [marker])return {nested:[{value}]};}];
 for(const factory of factories){const result=factory();collect();check(result.nested[0].value===marker,'ordinary-aggregate-return-result');}
 async function observe():Promise<void>{const value=await pending;const arrow=await(async()=>({nested:[{value:marker}]}))();const block=await(async()=>{await Promise.resolve(marker);return {nested:[{value:marker}]};})();collect();check(arrow.nested[0].value===marker&&block.nested[0].value===marker,'async-ordinary-aggregate-return-result');check(value===1.0009765625,'saved-rounding-callee-through-suspension');}observe();
 `;
}

test('Binary formats share direct exact significand rounding without a binary32 intermediate',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-binary-formats-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const values=inputs();const oracle=Bun.spawnSync(['python3','-c',`import sys,json,math,struct
def converted(text,format):
 value=float(text)
 try: result=struct.unpack('>'+format,struct.pack('>'+format,value))[0]
 except OverflowError: result=math.copysign(math.inf,value)
 if math.isnan(result): return 'NaN'
 if math.isinf(result): return '-Infinity' if result<0 else 'Infinity'
 if result==0 and math.copysign(1,result)<0: return '-0'
 return repr(result)
print(json.dumps([[converted(value,'e'),converted(value,'f')] for value in json.load(sys.stdin)]))`],{stdin:Buffer.from(JSON.stringify(values.map(token))),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});const answers:string[][]=JSON.parse(oracle.stdout.toString());
  const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,erase(subject(values,answers,false,true)));
  const reference=Bun.spawnSync([process.execPath,'-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('saved-rounding-callee-through-suspension:true');
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]) {
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(values,answers,profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/number-binary-formats.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
