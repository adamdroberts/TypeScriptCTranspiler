import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const token=(value:number):string=>Object.is(value,-0)?'-0':String(value);
function numericCases():number[][] {
 const cases:number[][]=[[],[-0],[-0,-0],[0,-0],[1,-1],[NaN,Infinity],[Infinity,-Infinity],[Infinity,1],[-Infinity,-0],
  [1e308,1e308,-1e308,-1e308,1],[1e30,0.1,-1e30],[0.1,0.1,0.1],
  [Number.MAX_VALUE,2**970],[Number.MAX_VALUE,2**970,-Number.MIN_VALUE],
  [Number.MIN_VALUE,Number.MIN_VALUE,-Number.MIN_VALUE],[2**-1022,-(2**-1022),Number.MIN_VALUE],
  [1,2**-53],[1,2**-53,Number.MIN_VALUE],[1,3*2**-53],[2**53,1],[2**53,3]];
 let seed=0x17349a2b;const view=new DataView(new ArrayBuffer(8));
 const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let iteration=0;iteration<96;iteration++) {
  const values:number[]=[];const length=1+(random()%24);
  for(let index=0;index<length;index++) {
   view.setUint32(0,random());view.setUint32(4,random());const value=view.getFloat64(0);
   if(Number.isFinite(value))values.push(value);
  }
  if(iteration%2===0)values.push(...values.map(value=>-value),Number.MIN_VALUE);
  cases.push(values,values.slice().reverse());
 }
 return cases;
}
function subject(cases:number[][],answers:string[],profile:boolean,noGc:boolean):string {
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const cases=[${cases.map(values=>'['+values.map(token).join(',')+']').join(',')}],expected=[${answers.join(',')}];
 const sum=Math.sumPrecise,math=Math,marker={token:31},events:any[]=[];
 for(let index=0;index<cases.length;index++)check(Object.is(sum(cases[index]),expected[index]),'exact-generated-sum');
 function iterator(values:any[],mode:string='normal'):any {
  let index=0;const owner={
   get next(){events.push('get-next');collect();return function(){events.push('next');collect();if(mode==='next')throw marker;if(mode==='result')return 1;return {
    get done(){events.push('done');collect();if(mode==='done')throw marker;return index===values.length;},
    get value(){events.push('value');collect();if(mode==='value')throw marker;return values[index++];}
   };};},
   get return(){events.push('get-return');collect();if(mode==='return-get')throw marker;return function(){events.push('return');collect();if(mode==='return-call')throw marker;return mode==='return-result'?1:{};};}
  };
  const iterable={get [Symbol.iterator](){events.push('get-iterator');collect();return function(){events.push('iterator');check(this===iterable,'iterator-receiver');return owner;};}};
  return iterable;
 }
 events.length=0;check(sum.call(marker,iterator([1,2]),(events.push('ignored'),marker))===3&&events.join('|')==='ignored|get-iterator|iterator|get-next|next|done|value|next|done|value|next|done','ordinary-iterator-and-actual-order');
 for(const mode of ['next','done','value','result']){events.length=0;let caught:any;try{sum(iterator([1],mode));}catch(error){caught=error;}check((mode==='result'?caught instanceof TypeError:caught===marker)&&!events.includes('get-return'),'step-abrupt-does-not-close-'+mode);}
 for(const mode of ['normal','return-get','return-call','return-result']){events.length=0;let caught:any;try{sum(iterator([1,{}],mode));}catch(error){caught=error;}check(caught instanceof TypeError&&events.includes('get-return')&&(mode==='return-get'||events.includes('return')),'consumer-type-error-closes-and-wins-'+mode);}
 const coercible={valueOf(){throw marker;},toString(){throw marker;}};
 for(const value of [undefined,null,true,'1',1n,Symbol('number'),coercible,Object(1)]){let caught:any;try{sum([value]);}catch(error){caught=error;}check(caught instanceof TypeError,'number-only-item-domain');}
 for(const value of [undefined,null,1,true,{},'1']){let caught:any;try{sum(value);}catch(error){caught=error;}check(caught instanceof TypeError,'iterable-admission-domain');}
 for(const prefix of [NaN,Infinity,-Infinity]){events.length=0;let caught:any;try{sum(iterator([prefix,{},1]));}catch(error){caught=error;}check(caught instanceof TypeError&&events.includes('return'),'continues-validation-after-special-sum');}
 events.length=0;let late:any;try{sum(iterator([NaN],'next'));}catch(error){late=error;}check(late===marker&&!events.includes('return'),'special-sum-preserves-late-step-abrupt');
 const replaced=[4,5];replaced[Symbol.iterator]=function*(){collect();yield 1e30;yield 0.1;yield -1e30;};check(sum(replaced)===0.1,'array-iterator-replacement');
 let owner:any={operation:sum,items:iterator([1e308,1,-1e308])};for(let depth=0;depth<2048;depth++)owner={next:owner};collect();for(let depth=0;depth<2048;depth++)owner=owner.next;check(owner.operation(owner.items)===1,'retained-iterator-owner-graph-stress');
 const descriptor=Object.getOwnPropertyDescriptor(math,'sumPrecise');check(descriptor.value===sum&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable&&sum.name==='sumPrecise'&&sum.length===1&&!Object.hasOwn(sum,'prototype'),'intrinsic-metadata');
 let constructed:any;try{new sum([]);}catch(error){constructed=error;}check(constructed instanceof TypeError,'intrinsic-call-only');
 function typed(items:number[]):number{return Math.sumPrecise(items);}
 math.sumPrecise=function(...actual:any[]):any{collect();return [this,actual];};const changed=typed(marker);check(changed[0]===math&&changed[1][0]===marker,'mutable-callee-and-typed-actual-result');
 async function delayed():Promise<any>{return Math.sumPrecise(await Promise.resolve(marker),(events.push('suspended-ignored'),marker));}const pending=delayed();math.sumPrecise=sum;
 async function observe():Promise<void>{const value=await pending;collect();check(value[0]===math&&value[1][0]===marker&&value[1][1]===marker,'saved-callee-through-suspension');}observe();
 `;
}

test('Math.sumPrecise uses one iterator and one exact accumulator for arbitrary actual inputs',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-sum-precise-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try {
  const cases=numericCases();const oracle=Bun.spawnSync(['python3','-c',`import sys,json,math
from fractions import Fraction
def sum_precise(tokens):
 values=[float(value) for value in tokens]
 if any(math.isnan(value) for value in values): return 'NaN'
 positive=any(value==math.inf for value in values); negative=any(value==-math.inf for value in values)
 if positive and negative: return 'NaN'
 if positive: return 'Infinity'
 if negative: return '-Infinity'
 if all(value==0 and math.copysign(1,value)<0 for value in values): return '-0'
 exact=sum((Fraction.from_float(value) for value in values),Fraction())
 try: result=float(exact)
 except OverflowError: return '-Infinity' if exact<0 else 'Infinity'
 return repr(result)
print(json.dumps([sum_precise(values) for values in json.load(sys.stdin)]))`],{stdin:Buffer.from(JSON.stringify(cases.map(values=>values.map(token)))),stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});const answers:string[]=JSON.parse(oracle.stdout.toString());
  const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,erase(subject(cases,answers,false,true)));
  // JavaScriptCore independently checks iteration, metadata and exceptions;
  // Python exact rationals independently supply the numerical expectations.
  const reference=Bun.spawnSync([process.execPath,'-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('saved-callee-through-suspension:true');
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]) {
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(cases,answers,profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/math-sum-precise.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
  }
 } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
