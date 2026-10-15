import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean):string {
 const members:string[]=[],probes:string[]=[];
 for(const kind of ['method','accessor'])for(const spelling of ['plain','with_$','unicode_λ','']) {
  const key=JSON.stringify(`${kind}_${spelling}`);
  members.push(kind==='method'?`${key}(value:number):any{return [this,value,arguments.length];}`
   :`get ${key}():any{return this.value;}set ${key}(value:number){this.value=value;}`);
  probes.push(`memberPartition(${key},${JSON.stringify(kind)});`);
 }
 return `// @ts-nocheck
 export {};
 function emit(value:any):void{${profile?'(globalThis as any).print':'console.log'}(value);}
 function check(value:boolean,label:string):void{if(!value)throw label;emit(label+':true');}
 function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
 const marker={token:19},symbol=Symbol('member');let state=7;
 class MethodOwner {
  value:any=17;
  echo(value:number):number{collect();return value;}
  activation(value:number=marker,...rest:number[]):any{collect();const arrow=()=>[this,arguments,value,rest];return arrow;}
  patterns({value}:{value:number}={value:marker},[first,second=marker]:number[]=[marker]):any{collect();return [value,first,second,arguments.length];}
  later(value:number=next,next:number=marker):any{return [value,next];}
  body(value:number=marker,read:()=>any=()=>value):any{var value=23;return [read(),value];}
  generic<T>(value:T):T{return value;}
  numeric(value:number):number{return Math.sqrt(value);}
  async numericLater(value:number):Promise<any>{return Math.sqrt(await Promise.resolve(value));}
  shared():any{return state++;}
  identity():any{return this;}
  get current():any{collect();return this.value;}
  set current(value:number){collect();this.value=value;}
  [Symbol.iterator]():any{return this;}
  *values(value:number):any{yield [this,value];return value;}
  async delayed(value:number):Promise<any>{const owner=this;await Promise.resolve();collect();return [owner,value];}
  ${members.join('\n')}
 }
 class DerivedOwner extends MethodOwner { tag:any=29; }
 const owner=new MethodOwner(),peer=new MethodOwner(),derived=new DerivedOwner(),receiver={value:31};
 check(!Object.hasOwn(owner,'echo')&&owner.echo===peer.echo&&owner.echo===MethodOwner.prototype.echo&&Object.getPrototypeOf(owner)===MethodOwner.prototype,'one-prototype-member-owner');
 check(Object.getPrototypeOf(derived)===DerivedOwner.prototype&&Object.getPrototypeOf(DerivedOwner.prototype)===MethodOwner.prototype&&derived.identity()===derived&&!Object.hasOwn(derived,'identity'),'inherited-prototype-receiver');
 for(const value of ['actual',marker,symbol,null,undefined])check(owner.echo(value)===value&&owner.generic(value)===value,'actual-formal-and-result-'+typeof value);
 const saved=owner.activation,arrow=saved.call(receiver,undefined,marker,undefined),activation=arrow();
 check(activation[0]===receiver&&activation[1].length===3&&activation[1][0]===undefined&&activation[2]===marker&&activation[3].length===2&&activation[3][0]===marker&&activation[3][1]===undefined,'actual-list-default-rest-and-arrow');
 const pattern=owner.patterns();check(pattern[0]===marker&&pattern[1]===marker&&pattern[2]===marker&&pattern[3]===0,'binding-tree-defaults-and-actual-arguments');
 let tdz=false;try{owner.later();}catch(error){tdz=error instanceof ReferenceError;}check(tdz,'later-formal-tdz');
 const body=owner.body();check(body[0]===marker&&body[1]===23,'separate-parameter-body-environments');
 check(owner.shared()===7&&peer.shared()===8,'retained-outer-source-cell');
 const methodDescriptor=Object.getOwnPropertyDescriptor(MethodOwner.prototype,'activation');
 check(methodDescriptor.value===saved&&methodDescriptor.writable&&!methodDescriptor.enumerable&&methodDescriptor.configurable&&saved.length===0&&saved.name==='activation'&&!Object.hasOwn(saved,'prototype'),'ordinary-method-metadata');
 let constructible=false;try{new saved();constructible=true;}catch(error){if(!(error instanceof TypeError))throw error;}check(!constructible,'method-not-constructible');
 check(owner.identity.call(undefined)===undefined,'class-member-strict-this');
 const descriptor=Object.getOwnPropertyDescriptor(MethodOwner.prototype,'current');
 check(descriptor.get.call(receiver)===31&&!descriptor.enumerable&&descriptor.configurable&&descriptor.get.name==='get current'&&descriptor.set.name==='set current','accessor-descriptor-and-receiver');
 descriptor.set.call(receiver,marker);check(receiver.value===marker&&owner.value===17,'borrowed-setter-actual-value');
 owner.current=marker;check(owner.current===marker&&Object.getOwnPropertyDescriptor(owner,'value').value===marker,'native-field-owner-and-shared-accessor');
 Reflect.set(owner,'current',symbol,receiver);check(receiver.value===symbol&&owner.value===marker,'reflective-setter-receiver');
 check(owner[Symbol.iterator]===MethodOwner.prototype[Symbol.iterator]&&owner[Symbol.iterator].call(receiver)===receiver&&owner[Symbol.iterator].name==='[Symbol.iterator]','symbol-member-owner');
 function memberPartition(key:string,kind:string):void{const item=Object.getOwnPropertyDescriptor(MethodOwner.prototype,key);if(kind==='method'){const value=item.value.call(receiver,marker,undefined);check(value[0]===receiver&&value[1]===marker&&value[2]===2&&!item.enumerable,'generated-method-key-'+key);}else{item.set.call(receiver,marker);check(item.get.call(receiver)===marker&&!item.enumerable,'generated-accessor-key-'+key);}}
 ${probes.join('\n')}
 const generator=owner.values(marker),step=generator.next();check(step.value[0]===owner&&step.value[1]===marker&&generator.next().value===marker,'generator-member-activation');
 const mathEvents:any[]=[];
 function operand(label:string,value:any):any{return {valueOf(){mathEvents.push(label);collect();return value;}};}
 check(owner.numeric('81')===9,'ordinary-numeric-consumer');
 const power=Math.pow(operand('first',2),(mathEvents.push('argument'),operand('second',3)));
 check(power===8&&mathEvents.join('|')==='argument|first|second','numeric-consumer-conversion-order');
 mathEvents.length=0;check(Math.sqrt(operand('coerce',9),(mathEvents.push('ignored'),marker))===3&&mathEvents.join('|')==='ignored|coerce','ignored-numeric-actual-effects-before-conversion');
 for(const name of ['min','max','hypot']){let caught:any;try{Math[name](name==='hypot'?Infinity:NaN,{valueOf(){collect();throw marker;}});}catch(error){caught=error;}check(caught===marker,'numeric-consumer-completes-conversion-'+name);}
 check(Object.is(Math.min(0,-0),-0)&&Object.is(Math.min(-0,0),-0)&&Object.is(Math.max(0,-0),0)&&Object.is(Math.max(-0,0),0),'numeric-consumer-signed-zero');
 const math=Math,originalSqrt=math.sqrt;math.sqrt=function(...actual:any[]):any{return [this,actual];};
 const numeric=owner.numeric(marker);check(numeric[0]===math&&numeric[1][0]===marker,'mutable-numeric-callee-and-actual-result');
 const pendingNumeric=owner.numericLater(marker);math.sqrt=()=>undefined;
 (globalThis as any).Math=()=>undefined;check(typeof Math==='function','mutable-numeric-global-typeof');
 (globalThis as any).Math={sqrt(){return marker;},PI:marker};check(owner.numeric(81)===marker&&Math.PI===marker,'mutable-numeric-global-reference');
 (globalThis as any).Math=math;math.sqrt=originalSqrt;
 let retained:any={owner,callee:saved};for(let depth=0;depth<2048;depth++)retained={next:retained};collect();for(let depth=0;depth<2048;depth++)retained=retained.next;check(retained.owner===owner&&retained.callee===saved&&retained.callee.call(owner)()[2]===marker,'retained-member-owner-graph-stress');
 const original=owner.echo;MethodOwner.prototype.echo=function(...actual:any[]):any{collect();return [this,actual];};
 const changed=peer.echo(marker,undefined);check(changed[0]===peer&&changed[1].length===2&&changed[1][0]===marker&&original.call(receiver,marker)===marker,'mutable-prototype-callee-and-saved-owner');
 async function suspended():Promise<void>{const pending=owner.delayed(marker);const method=owner.activation,first=owner.value;await Promise.resolve();const delayed=await pending,numeric=await pendingNumeric;check(delayed[0]===owner&&delayed[1]===marker&&method.call(owner,first)()[2]===marker&&numeric[0]===math&&numeric[1][0]===marker,'retained-members-through-suspension');}suspended();
 `;
}

test('source class members share one prototype descriptor plan and ordinary activation',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-class-instance-owner-'));
 const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
 try {
  {
   const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,erase(subject(false,true),ts.ModuleKind.ESNext));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('retained-members-through-suspension:true');
   for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
    const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
    const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
    await fs.writeFile(entry,typed?subject(profile,noGc):erase(subject(profile,noGc),ts.ModuleKind.ESNext));
    const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
     ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/class-instance-owner.js#strict',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
    expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
    const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
    expect({exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.exitCode?native.stdout.toString():''}).toEqual({exitCode:0,stderr:'',stdout:''});
    const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
    expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
   }
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
