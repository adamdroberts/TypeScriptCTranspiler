import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram,resolvePackageRoot} from '../../src/program';
import {sourceExpressionTexts} from '../../src/source-value-flow';
import {compile} from '../../src/compile';
import {arrayIteratorSourceInput} from '../e2e/generated-cases';

async function facts(entry:string,source:string):Promise<readonly string[]|null>{
 await writeFile(entry,source+'\nconsole.log(query);');
 const built=buildProgram({entry,packageRoot:resolvePackageRoot()}),pending:ts.Node[]=[built.entrySourceFile];let expression!:ts.Expression;
 while(pending.length){const node=pending.pop()!;if(ts.isCallExpression(node)&&node.getText().startsWith('console.log'))expression=node.arguments[0]!;node.forEachChild(child=>{pending.push(child)});}
 return sourceExpressionTexts(built.program,[expression],{roots:[entry]}).get(expression)??null;
}
const partitions:{source:string;finite:boolean}[]=[];
for(const method of ['keys','values','entries'])for(const receiver of ['["17;","19;"]','{0:"23;",2:"29;",length:3}','"ab"','{length:0}']){
 const select=method==='entries'?'item[1]':'item';
 partitions.push({source:`let query='empty';for(const item of Array.prototype.${method}.call(${receiver}))query=String(${select});`,finite:method!=='keys'||receiver!=='{0:"23;",2:"29;",length:3}'});
}
partitions.push(...[
 `let query='17;';const owner={get length(){query='bad';return 1},get 0(){query='bad';return 'x'}};Array.prototype.entries.call(owner);`,
 `let query='17;';const owner={get 0(){query='bad';return 'x'},length:1};for(const key of Array.prototype.keys.call(owner)){};`,
 `let query='17;';const owner={get 0(){query='31;';return 'x'},length:1};for(const entry of Array.prototype.entries.call(owner)){};`,
 `let query='empty';const owner=['17;'];const iterator=owner.entries();owner[0]='37;';for(const entry of iterator)query=entry[1];`,
 `let query='empty';const iterator=['17;'].entries();iterator.next=function(){return {done:false,value:[0,'41;']}};for(const entry of iterator){query=entry[1];break}`,
 `const query=Array.prototype.entries.name+':'+Array.prototype.keys.length;`,
 `let query='normal';try{new Array.prototype.entries}catch(error){query=error instanceof TypeError?'type':'other'}`,
 `let query='normal';try{Array.prototype.entries.call(null)}catch(error){query=error instanceof TypeError?'type':'other'}`,
 `let query='empty';const prototype={0:'43;'},owner=Object.create(prototype);owner.length=1;for(const entry of Array.prototype.entries.call(owner))query=entry[1];`,
].map(source=>({source,finite:true})));
test('Array iterator source records contain independent indexed, owner and effect observations',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-array-iterator-source-'));
 try{for(const[index,{source,finite}]of partitions.entries()){
  const proof=await facts(join(root,index+'.mjs'),source),node=Bun.spawnSync(['node','-e',source+'require("node:fs").writeSync(1,String(query))'],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  // Sparse key indices use the complete Number domain, so String projection
  // remains conservatively unknown instead of enumerating logical holes.
  if(!finite){expect(proof).toBeNull();continue;}
  expect(proof).not.toBeNull();if(proof===null)throw new Error('Missing finite source partition: '+source);
  expect({source,containsActual:proof.includes(node.stdout.toString())}).toEqual({source,containsActual:true});
 }
 expect(await facts(join(root,'opaque.mjs'),`let query='empty';for(const entry of Array.prototype.entries.call(opaque))query=entry[1];`)).toBeNull();
 const failure=`let query='17;';const owner={get length(){throw 'length'},get 0(){query='wrong';return 'value'}};try{for(const entry of Array.prototype.entries.call(owner)){} }catch(error){query=String(error)}`;
 const abrupt=await facts(join(root,'abrupt.mjs'),failure);if(abrupt!==null)expect(abrupt).toContain('length');
 }finally{await rm(root,{recursive:true,force:true})}
});

test('Array iterator-derived eval sources execute through one retained alias graph',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-array-iterator-source-native-'));
 try{for(const noGc of [false,true]){
  const source=arrayIteratorSourceInput(noGc?3:512),entry=join(root,'main-'+noGc+'.mts'),output=entry+'-program',oracle=join(root,'reference-'+noGc+'.mjs');await writeFile(entry,source);await writeFile(oracle,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText);
  const node=Bun.spawnSync(['node',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],compiled=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:m=>diagnostics.push(m)});expect({code:compiled.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }}finally{await rm(root,{recursive:true,force:true})}
},900000);
