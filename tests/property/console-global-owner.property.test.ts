import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,collect:boolean):string{return `
import originalConsole,{log as importedLog,error as importedError,warn as importedWarn,info as importedInfo} from 'node:console';
import * as consoleModule from 'node:console';
import {URL as ImportedURL} from 'node:url';
function check(value,label){if(!value)throw label;importedLog(label+':true')}
function throwsType(action){try{action()}catch(error){return error instanceof TypeError}return false}
check(originalConsole===console&&consoleModule.default===console,'original-console-identity');
for(const [name,method] of [['log',importedLog],['error',importedError],['warn',importedWarn],['info',importedInfo]]){
 const descriptor=Object.getOwnPropertyDescriptor(console,name);
 check(consoleModule[name]===method&&console[name]===method&&method.name===name&&method.length===0,'member-identity-'+name);
 check(descriptor.writable&&descriptor.enumerable&&descriptor.configurable,'member-descriptor-'+name);
 check(method.toString()==='function () { [native code] }'&&throwsType(()=>Reflect.construct(method,[])),'bound-callable-'+name);
}
const globalDescriptor=Object.getOwnPropertyDescriptor(globalThis,'console');
check(globalDescriptor.writable&&globalDescriptor.configurable&&!globalDescriptor.enumerable,'global-console-descriptor');
check(Object.getPrototypeOf(console)!==Object.prototype&&Object.getPrototypeOf(Object.getPrototypeOf(console))===Object.prototype&&Reflect.ownKeys(Object.getPrototypeOf(console)).length===0,'console-prototype');
Reflect.apply(importedLog,null,['borrowed:',true,3]);
let order='';const replacement=function(...args){order+='r';importedLog('replacement:',...args)};
Object.defineProperty(console,'log',{get(){order+='g';return importedLog},configurable:true});
async function argument(){order+='a';await Promise.resolve();Object.defineProperty(console,'log',{value:replacement,writable:true,configurable:true});order+='b';return 'retained argument'}
console.log('retained:',await argument());
check(order==='gab'&&consoleModule.log===importedLog,'callee-retained-through-await');
console.log('replacement call');
Object.defineProperty(console,'log',{value:importedLog,writable:true,enumerable:true,configurable:true});
globalThis.console={log:replacement};check(originalConsole!==console&&consoleModule.log===importedLog,'original-exports-survive-global-replacement');globalThis.console=originalConsole;
console.log('awaited:',ImportedURL.canParse(await Promise.resolve('https://example.com/')));
console.log();console.log('single %% %s');console.log('format %% %s %d %i %f %q','text',null,'3.5junk','3.5junk');
for(const value of [undefined,null,true,false,-0,NaN,Infinity,1n,Symbol('x'),'3.5junk']){
 console.log('value:',value);console.log('%s|%d|%i|%f',value,value,value,value);
}
for(const value of [[],[1,'text',null],{x:1,y:['text']},{get x(){throw 'inspected getter invoked'}}])console.log('inspect: %s|%o|%O',value,value,value);
console.log('%cstyle %s',{toString(){throw 'ignored style coerced'}},'ok');
let coercion='';const number={valueOf(){coercion+='v';return 3},toString(){coercion+='s';return '4'}};
console.log('%d %i %f',number,number,number);check(coercion==='vss','format-conversion-order');
console.error('stderr:',true);console.warn('warning %d',5);console.info('information:',false);
console.log('surrogate:'+String.fromCharCode(0xd800));
let chain={previous:null,owner:originalConsole,method:importedLog};for(let index=0;index<4096;index++)chain={previous:chain,owner:originalConsole,method:importedLog};
${collect?'$262.gc();':''}
let count=0,valid=true;for(let node=chain;node;node=node.previous){valid=valid&&node.owner===originalConsole&&node.method===importedLog;count++}
check(valid&&count===4097,'deep-retained-owner-graph');
const args=[];for(let index=0;index<4096;index++)args.push(index%10);const saved=originalConsole.log;await Promise.resolve();Reflect.apply(saved,chain.owner,args);
`}

test('console host owners retain References and arbitrary actual Lists',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-console-owner-'));
 try{
  const oracle=path.join(temporary,'reference.mjs');await fs.writeFile(oracle,subject(false,false));
  const reference=Bun.spawnSync(['node','-e','process.stdout._handle?.setBlocking(true);process.stderr._handle?.setBlocking(true);import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120_000});
  expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:'stderr: true\nwarning 5\n'});
  for(const mode of ['typed','javascript'])for(const noGc of [false,true])for(const profile of [false,true]){
   const directory=path.join(temporary,`${mode}-${noGc}-${profile}`);await fs.mkdir(directory);
   const entry=path.join(directory,mode==='typed'?'main.ts':'main.mjs');await fs.writeFile(entry,(mode==='typed'?'// @ts-nocheck\n':'')+subject(profile,profile&&!noGc));
   const output=path.join(directory,'program'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'console-global-owner.mjs#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({mode,noGc,profile,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({mode,noGc,profile,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({mode,noGc,profile,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({mode,noGc,profile,exitCode:0,stderr:reference.stderr.toString()});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe('normal');
   expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900_000);
