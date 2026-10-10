import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const strings=['',' \t\r\n','\u00a0\ufeff17\u2029','+0017','-0017','-0','0009','0b101','0B101','0o77','0O77','0xff','0XFF','0x'+'f'.repeat(1024)];
const invalid=['+','-','1.0','1e3','Infinity','NaN','1_0','1 0','0x','0b2','0o8','+0xff','-0b1','0xffn','1\0','\u008517','\ud800'];
const widths=[0,1,8,31,32,53,64,127,256];
const integers=['-257','-129','-128','-1','0','1','127','128','255','256','18446744073709551615'];
function subject(expected:{strings:string[],widths:string[][]},profile:boolean,noGc:boolean):string {
 const stringCases=strings.map((text,index)=>`[${JSON.stringify(text)},${expected.strings[index]}n]`);
 const widthCases=widths.flatMap((width,wi)=>integers.map((integer,ii)=>`[${width},${integer}n,${expected.widths[wi*integers.length+ii][0]}n,${expected.widths[wi*integers.length+ii][1]}n]`));
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 function convert(value:number):number{return BigInt(value);}
 const original=BigInt,marker={token:23},events:any[]=[];
 for(const [text,expected] of [${stringCases.join(',')}])check(BigInt(text)===expected&&convert(text)===expected&&original.call(marker,text)===expected,'string-integer-literal');
 for(const text of ${JSON.stringify(invalid)}){let caught:any;try{BigInt(text);}catch(error){caught=error;}check(caught instanceof SyntaxError&&!(0n==text)&&!(1n==text)&&!(0n<text),'invalid-string-integer-literal');}
 for(const value of [null,undefined,Symbol('value')]){let caught:any;try{BigInt(value);}catch(error){caught=error;}check(caught instanceof TypeError,'constructor-rejects-value-domain');}
 for(const value of [NaN,Infinity,-Infinity,1.5]){let caught:any;try{BigInt(value);}catch(error){caught=error;}check(caught instanceof RangeError,'number-to-bigint-integrality');}
 check(BigInt(false)===0n&&BigInt(true)===1n&&BigInt(-0)===0n&&BigInt(9007199254740992)===9007199254740992n&&BigInt(17n)===17n,'constructor-primitive-domain');
 let missing:any;try{BigInt();}catch(error){missing=error;}check(missing instanceof TypeError,'constructor-omitted-actual');
 function primitive(label:string,value:any):any{return {[Symbol.toPrimitive](hint:string){events.push(label+':'+hint);collect();return value;}};}
 check(BigInt(primitive('object','19'),(events.push('ignored'),marker))===19n&&events.join('|')==='ignored|object:number','constructor-actual-effects-before-primitive');
 events.length=0;const ordinary={valueOf(){events.push('valueOf');collect();return marker;},toString(){events.push('toString');collect();return '29';}};
 check(BigInt(ordinary)===29n&&events.join('|')==='valueOf|toString','ordinary-to-primitive-order');
 events.length=0;let abrupt:any;try{BigInt(primitive('throw',marker));}catch(error){abrupt=error;}check(abrupt instanceof TypeError&&events.join('|')==='throw:number','nonprimitive-result-rejected');
 const raw={[Symbol.toPrimitive](){collect();throw marker;}};try{BigInt(raw);}catch(error){abrupt=error;}check(abrupt===marker,'constructor-abrupt-identity');
 for(const [bits,value,signed,unsigned] of [${widthCases.join(',')}])check(BigInt.asIntN(bits,value)===signed&&BigInt['asUintN'](bits,value)===unsigned,'generated-modular-reduction');
 for(const name of ['asIntN','asUintN']){
  const operation=BigInt[name],descriptor=Object.getOwnPropertyDescriptor(BigInt,name);
  check(descriptor.value===operation&&descriptor.writable&&!descriptor.enumerable&&descriptor.configurable&&operation.name===name&&operation.length===2&&!Object.hasOwn(operation,'prototype'),'width-intrinsic-metadata-'+name);
  let constructed=false;try{new operation(8,1n);constructed=true;}catch(error){if(!(error instanceof TypeError))throw error;}check(!constructed,'width-intrinsic-not-constructible-'+name);
  events.length=0;const value=operation.call(marker,primitive('bits',8.9),(events.push('argument'),primitive('bigint','257')),marker);
  check(value===1n&&events.join('|')==='argument|bits:number|bigint:number','width-index-before-bigint-conversion-'+name);
  check(operation(undefined,'17')===0n&&operation(-0.5,true)===0n&&operation(9007199254740991,17n)===17n,'width-index-boundaries-'+name);
  for(const bits of [-1,Infinity,-Infinity,9007199254740992]){events.length=0;let caught:any;try{operation(bits,primitive('never',1n));}catch(error){caught=error;}check(caught instanceof RangeError&&events.length===0,'width-invalid-index-short-circuit-'+name);}
  for(const value of [17,null,undefined,Symbol('bigint')]){let caught:any;try{operation(0,value);}catch(error){caught=error;}check(caught instanceof TypeError,'width-uses-to-bigint-'+name);}
  for(const bits of [1n,Symbol('bits')]){let caught:any;try{operation(bits,1n);}catch(error){caught=error;}check(caught instanceof TypeError,'width-uses-to-index-'+name);}
  let caught:any;try{operation(0,raw);}catch(error){caught=error;}check(caught===marker,'width-converts-value-even-at-zero-'+name);
 }
 for(const operation of [()=>1n/0n,()=>1n%0n,()=>2n**-1n,()=>2n**18446744073709551616n]){let caught:any;try{operation();}catch(error){caught=error;}check(caught instanceof RangeError,'bigint-arithmetic-preserves-error-object');}
 const bigintPrototype=BigInt.prototype,toString=bigintPrototype.toString,valueOf=bigintPrototype.valueOf;
 check(toString.length===0&&toString.name==='toString'&&valueOf.length===0&&valueOf.name==='valueOf'&&bigintPrototype[Symbol.toStringTag]==='BigInt','prototype-intrinsic-metadata');
 check(toString.call(255n,16)==='ff'&&toString.call(Object(255n),undefined)==='255'&&valueOf.call(Object(17n))===17n,'prototype-this-bigint-value');
 for(const receiver of [null,undefined,0,'1',{},Object.create(bigintPrototype)]){let caught:any;try{valueOf.call(receiver);}catch(error){caught=error;}check(caught instanceof TypeError,'prototype-rejects-non-bigint-owner');}
 for(const radix of [NaN,0,1,37,Infinity]){let caught:any;try{toString.call(1n,radix);}catch(error){caught=error;}check(caught instanceof RangeError,'prototype-radix-range');}
 events.length=0;check((255n).toString(primitive('radix',16.9),(events.push('ignored'),marker))==='ff'&&events.join('|')==='ignored|radix:number','prototype-radix-actual-effects-and-conversion');
 let radixAbrupt:any;try{toString.call(1n,raw);}catch(error){radixAbrupt=error;}check(radixAbrupt===marker,'prototype-radix-abrupt-identity');
 bigintPrototype.toString=function(...actual:any[]):any{collect();return [this,actual];};const prototypeChanged=(17n).toString(marker,undefined);check(prototypeChanged[0]===17n&&prototypeChanged[1][0]===marker&&prototypeChanged[1].length===2,'mutable-prototype-callee-and-actual-result');
 async function delayedText():Promise<any>{return (17n).toString(await Promise.resolve(marker));}const pendingText=delayedText();bigintPrototype.toString=toString;
 let constructed=false;try{new BigInt(1);constructed=true;}catch(error){if(!(error instanceof TypeError))throw error;}check(!constructed&&BigInt.length===1&&BigInt.name==='BigInt','constructor-metadata-and-call-only');
 const prototype=Object.getOwnPropertyDescriptor(BigInt,'prototype');check(prototype.value===BigInt.prototype&&!prototype.writable&&!prototype.enumerable&&!prototype.configurable&&BigInt.prototype.constructor===BigInt,'constructor-prototype-link');
 let retained:any={value:primitive('deep','31'),operation:BigInt.asIntN};for(let depth=0;depth<2048;depth++)retained={next:retained};collect();for(let depth=0;depth<2048;depth++)retained=retained.next;check(BigInt(retained.value)===31n&&retained.operation(8,257n)===1n,'retained-bigint-owner-graph-stress');
 BigInt.asIntN=function(...actual:any[]):any{collect();return [this,actual];};const changed=BigInt.asIntN(marker,undefined,marker);check(changed[0]===original&&changed[1].length===3&&changed[1][0]===marker&&changed[1][1]===undefined,'mutable-width-callee-and-actual-result');
 async function delayed():Promise<any>{return BigInt.asIntN(marker,await Promise.resolve(marker));}const pending=delayed();BigInt.asIntN=()=>undefined;
 (globalThis as any).BigInt=function(...actual:any[]):any{return actual[0];};check(convert(marker)===marker&&typeof BigInt==='function','mutable-bigint-global-and-typed-result');
 (globalThis as any).BigInt={asIntN(){return marker;}};check(BigInt.asIntN(8,1n)===marker&&typeof BigInt==='object','mutable-bigint-global-member-owner');(globalThis as any).BigInt=original;
 async function suspended():Promise<void>{const observed=await pending,text=await pendingText;collect();check(text[0]===17n&&text[1][0]===marker&&observed[0]===original&&observed[1][0]===marker&&observed[1][1]===marker,'saved-bigint-callee-through-suspension');}suspended();
 `;
}

test('BigInt conversion and width intrinsics share one actual owner and coercion plan',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-bigint-owner-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const referenceAnswers=Bun.spawnSync(['node','-e',`const texts=${JSON.stringify(strings)},widths=${JSON.stringify(widths)},integers=${JSON.stringify(integers)};require('node:fs').writeSync(1,JSON.stringify({strings:texts.map(text=>String(BigInt(text))),widths:widths.flatMap(bits=>integers.map(text=>[String(BigInt.asIntN(bits,BigInt(text))),String(BigInt.asUintN(bits,BigInt(text)))]))}));`],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:referenceAnswers.exitCode,stderr:referenceAnswers.stderr.toString()}).toEqual({exitCode:0,stderr:''});const answers=JSON.parse(referenceAnswers.stdout.toString());
  const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,erase(subject(answers,false,true)));
  const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('saved-bigint-callee-through-suspension:true');
  for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(answers,profile,noGc);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/bigint-owner.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({typed,profile,noGc,exitCode:0,stderr:'',stdout:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
   expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
