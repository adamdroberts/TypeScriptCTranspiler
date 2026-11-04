import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Annex B escape/unescape, the String.prototype HTML methods and the
 * Object.prototype.__proto__ accessor, compared against Node on generated
 * UTF-16 inputs. One generator covers every escape branch (kept units, %XX,
 * %uXXXX, lone surrogates), every unescape branch (%u with and without four
 * hex digits, %XX, trailing %) and attribute quoting. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const alphabet=['%','u','U','0','9','a','f','A','F','g','"','&',' ','@','*','_','+','-','.','/','\\','<','>','=','\u00e9','\u00ff','\u0100','\u4e2d','\ud83d','\ude00','\uffff'];
function generatedString(random:()=>number,maxLength:number):string{
 const length=Math.floor(random()*(maxLength+1));
 let text='';
 for(let index=0;index<length;index++){
  const roll=random();
  if(roll<0.75)text+=alphabet[Math.floor(random()*alphabet.length)]!;
  else if(roll<0.9)text+=String.fromCharCode(Math.floor(random()*256));
  else text+=String.fromCharCode(Math.floor(random()*65536));
 }
 return text;
}
const htmlMethods=['anchor','big','blink','bold','fixed','fontcolor','fontsize','italics','link','small','strike','sub','sup'] as const;

function agreementProgram(strings:readonly string[]):string{
 return `const inputs=${JSON.stringify(strings)};
const methods=${JSON.stringify(htmlMethods)};
const units=text=>Array.from(text,c=>c.charCodeAt(0).toString(16)).join(' ');
for(const input of inputs){
 console.log('escape',units(escape(input)));
 console.log('unescape',units(unescape(input)));
 console.log('roundtrip',unescape(escape(input))===input);
 for(const method of methods)console.log(method,units(String.prototype[method].call(input,input)));
 console.log('boxed',units(''.anchor({toString(){return input;}})));
}
`;
}

function descriptorProgram():string{
 return `const desc=Object.getOwnPropertyDescriptor(Object.prototype,'__proto__');
console.log(typeof desc.get,typeof desc.set,desc.enumerable,desc.configurable,'value' in desc);
console.log(Object.prototype.hasOwnProperty('__proto__'),({}).hasOwnProperty('__proto__'));
console.log(Object.create(null).__proto__,({}).__proto__===Object.prototype,[].__proto__===Array.prototype,(()=>{}).__proto__===Function.prototype);
console.log('s'.__proto__===String.prototype,(1).__proto__===Number.prototype,true.__proto__===Boolean.prototype,Symbol().__proto__===Symbol.prototype);
try{desc.get.call(undefined);console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
try{desc.set.call(null,{});console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
console.log(desc.set.call(1,{}),desc.set.call({},1));
const frozen=Object.preventExtensions({});
try{frozen.__proto__={};console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
try{desc.set.call(frozen,{});console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
const child={};const parent={marker:17};child.__proto__=parent;console.log(child.marker,Object.getPrototypeOf(child)===parent);
child.__proto__=null;console.log(Object.getPrototypeOf(child),child.__proto__);
const proxied=new Proxy({},{getPrototypeOf(){return Array.prototype;}});console.log(proxied.__proto__===Array.prototype);
for(const [owner,name] of [[Symbol,'for'],[Symbol,'keyFor'],[AggregateError,'prototype'],[Error,'prototype'],[TypeError,'prototype'],[globalThis,'escape'],[globalThis,'unescape'],[String.prototype,'anchor'],[String.prototype,'sup']]){
 const d=Object.getOwnPropertyDescriptor(owner,name);console.log(name,d.writable,d.enumerable,d.configurable,typeof d.value);
}
console.log(escape.length,unescape.length,escape.name,unescape.name,String.prototype.anchor.length,String.prototype.big.length,String.prototype.fontcolor.name);
try{String.prototype.big.call(null);console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
try{String.prototype.anchor.call(undefined,{toString(){console.log('attribute converted first');return 'x';}});console.log('no throw');}catch(e){console.log(e instanceof TypeError);}
console.log(String.prototype.anchor.call({toString(){console.log('receiver');return 'r';}},{toString(){console.log('attribute');return 'a';}}));
`;
}

function stressProgram(length:number):string{
 return `const text=Array.from({length:${length}},(_,index)=>String.fromCharCode((index*7919)%65536)).join('');
const escaped=escape(text);console.log(escaped.length,unescape(escaped)===text);
const quoted='"'.repeat(${length});
console.log(text.anchor(quoted).length,text.big().length,text.link(text).length);
`;
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-annexb-'));
 try{
  const entry=join(root,'main.mjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  for(const noGc of [false,true]){
   const diagnostics:string[]=[],output=join(root,`program-${noGc}`);
   const built=await compile({entry,output,buildDir:join(root,`build-${noGc}`),noGc,diagnosticWriter:x=>diagnostics.push(x)});
   expect({name,noGc,code:built.exitCode,diagnostics}).toEqual({name,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
   expect({name,noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,noGc,code:0,stderr:'',stdout:node.stdout.toString()});
  }
 }finally{await rm(root,{recursive:true,force:true});}
}

test('escape, unescape and the HTML methods match Node on generated UTF-16 inputs',async()=>{
 const random=rng(0x5eed);
 const strings=['','%','%u','%u12','%u123','%u1234','%uZZZZ','%4','%41','%zz','%%41','"','a"b"','%u0022'];
 for(let index=0;index<300;index++)strings.push(generatedString(random,40));
 await compare('generated',agreementProgram(strings));
});

test('__proto__ accessor and Annex B descriptors match Node',async()=>{
 await compare('descriptors',descriptorProgram());
});

test('one long input exercises escape, unescape and attribute quoting',async()=>{
 await compare('stress',stressProgram(200000));
});
