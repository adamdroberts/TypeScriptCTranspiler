import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
const subject=String.raw`
import fs from 'node:fs';import * as namespace from 'node:fs';
import promises from 'node:fs/promises';import * as promiseNamespace from 'node:fs/promises';
const root='ROOT',file=root+'/data';
fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(root,{recursive:true});
const ordinary:any=fs,asyncOwner:any=promises;
console.log('identity',namespace.default===fs,fs.promises===promises,promiseNamespace.default===promises,namespace.readFileSync===fs.readFileSync);
console.log('constants',fs.constants===promises.constants,namespace.constants===fs.constants,Object.getPrototypeOf(fs.constants)===null,Reflect.set(fs.constants,'F_OK',17),fs.constants.F_OK);
const write:any=ordinary.writeFileSync,read:any=ordinary.readFileSync;
let trace='';function mark(label:string,value:any):any{trace+=label;return value;}
const actuals:any[]=[mark('P',file),mark('D','alpha'),mark('O',{encoding:'utf8',mode:384}),mark('X',17),mark('Y',{})];
write(...actuals);console.log('actuals',trace,read(file,'utf8'));
const original:any=ordinary.readFileSync;
ordinary.readFileSync=(_path:any):any=>'replacement';console.log('lookup',fs.readFileSync(file),namespace.readFileSync(file,'utf8'));
ordinary.readFileSync=original;
const entries:any=ordinary.readdirSync(root,{encoding:'utf8'});console.log('array',entries[0],Object.keys(entries).join('|'));
const bytes:any=ordinary.readFileSync(file,{encoding:null});console.log('bytes',Buffer.isBuffer(bytes),bytes.toString('utf8'));
const descriptor:any=Object.getOwnPropertyDescriptor(ordinary,'writeFileSync');console.log('descriptor',descriptor.writable,descriptor.enumerable,descriptor.configurable,write.name,write.length);
let graph:any=ordinary;for(let depth=0;depth<256;depth++)graph={owner:graph};for(let depth=0;depth<256;depth++)graph=graph.owner;console.log('retained',graph.readFileSync(file,'utf8'));
async function run():Promise<void>{
 const saved:any=asyncOwner.appendFile;await asyncOwner.writeFile(file,'beta',{encoding:'utf8'});
 asyncOwner.appendFile=async(_path:any,_data:any):Promise<void>=>{trace+='R';};await promises.appendFile(file,'ignored');
 asyncOwner.appendFile=saved;await saved(file,'gamma',{encoding:'utf8'});
 const result:any=await promiseNamespace.readFile(file,{encoding:'utf8'});console.log('await',result,trace);
 const array:any=await asyncOwner.readdir(root,{encoding:'buffer'});console.log('owned arrays',Buffer.isBuffer(array[0]),array[0].toString());
 const stat:any=await asyncOwner.stat(file);console.log('stat',stat.isFile(),stat.size);
 const handle:any=await asyncOwner.open(file,'r');const borrowedStat:any=handle.stat;const handleStats:any=await borrowedStat.call(handle);console.log('handle stat',handleStats.isFile(),handleStats.size);await handle.close();
 const marker:any={};const options:any={get encoding(){throw marker;}};let caught:any;try{await asyncOwner.writeFile(file,'unwritten',options);}catch(error){caught=error;}console.log('reject',caught===marker);
 console.log('final',read(file,'utf8'));
 for(const asynchronous of [false,true])for(const append of [false,true])for(const flush of [false,true]){
  let gets='';const name=append?(asynchronous?'appendFile':'appendFileSync'):(asynchronous?'writeFile':'writeFileSync');
  const options:any=new Proxy({encoding:'utf8',mode:384,flag:append?'a':'w',flush,signal:undefined},{get(target:any,key:any,receiver:any):any{gets+=(gets?'|':'')+String(key);return Reflect.get(target,key,receiver);}});
  const method:any=(asynchronous?asyncOwner:ordinary)[name];await method(file,'part',options);console.log('options',asynchronous,append,flush,gets);
 }
 for(const flag of ['w+','a+','as','wx+','ax+','rs+']){
  if(flag.indexOf('x')>=0)fs.rmSync(file,{force:true});else write(file,'before','utf8');
  const method:any=ordinary.writeFileSync;method(file,'data',{encoding:'utf8',flag});console.log('flags',flag,read(file,'utf8'));
 }
 fs.rmSync(root,{recursive:true,force:true});
}
run();
`;
test('filesystem export owners preserve ordinary lookup, complete actual Lists and retained native results',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-fs-export-owner-'));
 try{
  const source=subject.replace('ROOT',join(root,'work')),erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText,oracle=join(root,'oracle.mjs'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('await betagamma PDOXYR\n');expect(expected).toContain('reject true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'mjs'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:result.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);
