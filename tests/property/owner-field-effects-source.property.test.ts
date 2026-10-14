import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';

const cases=[
 {source:'const owner={value:"17;"};const saved=owner.value;opaque(owner);eval(saved);',known:true,value:'17;'},
 {source:'const owner={value:"19;"};opaque(owner);eval(owner.value);',known:false},
 {source:'const owner={};opaque(owner);owner.value="23;";eval(owner.value);',known:false},
 {source:'const owner={value:"29;"};function read(){return owner.value}const saved=read();opaque(owner);eval(saved);',known:true,value:'29;'},
 {source:'const owner={value:"31;"};function read(){return owner.value}opaque(owner);eval(read());',known:false},
 {source:'const owner={get value(){return "37;"}};const saved=owner.value;opaque(owner);eval(saved);',known:true,value:'37;'},
 {source:'opaque();const owner={value:"41;"};eval(owner.value);',known:true,value:'41;'},
];
test('owner field effects preserve captured, later, newly created and callable source locations',()=>{
 for(const partition of cases){const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:partition.source}]);if(partition.known){expect({source:partition.source,error:graph.error}).toEqual({source:partition.source,error:null});expect(graph.directEvalSources.map(r=>r.source)).toContain(partition.value!);}else expect(graph.error).toContain('direct eval source is not a finite static string expression');}
 const fields=Array.from({length:512},(_,index)=>`key${index}:"43;"`).join(',');
 const reads=Array.from({length:512},(_,index)=>`opaque(owner);const captured${index}=owner.key${index};`).join('\n');
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:`const owner={${fields}};${reads}eval(owner.key0);`}]);expect(graph.error).toContain('direct eval source is not a finite static string expression');
},120000);
test('unfiltered owner mutation origins share one dependency graph at ordinary callable owners',()=>{
 const width=512,definitions=Array.from({length:width},(_,index)=>`function fn${index}(){return "17;"}`).join('\n');
 const effects=Array.from({length:width},()=>`opaque();`).join('\n');
 const reads=Array.from({length:width},(_,index)=>`const captured${index}=fn${index}.name;`).join('\n');
 const source=definitions+'\n'+reads+'\n'+effects+'\neval("19;");';
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);expect(graph.error).toBeNull();expect(graph.directEvalSources.map(entry=>entry.source)).toContain('19;');
},120000);
const source=String.raw`
function opaque(owner:any,index:number):void{
 const receiver:any=owner;receiver['key'+index]='changed'+index;
}
const owner:any={};for(let index=0;index<512;index++)owner['key'+index]='before'+index;
let graph:any=null;
for(let index=0;index<512;index++){
 const before:any=owner['key'+index];opaque(owner,index);
 graph={before,after:owner['key'+index],previous:graph};
}
let valid=true;for(let index=511;index>=0;index--){valid=valid&&graph.before==='before'+index&&graph.after==='changed'+index;graph=graph.previous;}
console.log('effects',valid&&graph===null);
const added:any={};opaque(added,0);added.key1='added';console.log('new-field',added.key0,added.key1);
let trace='';const accessor:any={get value(){trace+='G';return 'original'},set value(v){trace+='S'+v}};
const saved=accessor.value;accessor.value='next';console.log('accessor',saved,trace);
`;
test('owner field effects retain actual mutation and captured values through native execution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-owner-effects-'));
 try{
  const erased=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext}}).outputText,oracle=join(root,'oracle.cjs'),stdout=oracle+'.stdout';await writeFile(oracle,erased);
  const node=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await readFile(stdout,'utf8');expect(expected).toContain('effects true\n');
  for(const typed of [true,false])for(const noGc of [false,true]){
   const entry=join(root,`main-${typed}-${noGc}.${typed?'ts':'js'}`),output=entry+'-native',diagnostics:string[]=[];await writeFile(entry,typed?source:erased);
   const built=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({typed,noGc,code:built.exitCode,diagnostics}).toEqual({typed,noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(expected);
  }
 }finally{await rm(root,{recursive:true,force:true});}
},900000);
