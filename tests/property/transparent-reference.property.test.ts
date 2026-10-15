import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {normalizeAssignmentTarget,unwrapTransparentExpression} from '../../src/emit/binding-tree';
import {parseHostObservation} from '../test262/protocol';

const wrappers=[
 (value:string)=>`(${value})`,(value:string)=>`(${value} as any)`,
 (value:string)=>`(<any>${value})`,(value:string)=>`(${value}!)`,
 (value:string)=>`(${value} satisfies any)`,
];
const operations=['TARGET=11n','TARGET+=2n','TARGET*=3n','TARGET&&=13n','TARGET||=13n','TARGET??=13n','TARGET++','++TARGET','TARGET--','--TARGET'];
function source(javascript=false,normalizedKeys=false):string {
 const pieces=[`export {};const host:any=globalThis;function output(value:any):void{host.print(value);}function collect():void{if(NATIVE_GC)host.$262.gc();}`];
 for(const [wrapper,wrap] of wrappers.entries())for(const [operation,form] of operations.entries()){
  for(const kind of ['binding','property','element']){
   const target=kind==='binding'?'value':kind==='property'?'owner.value':`base()[${normalizedKeys?'String(key)':'key'}]`;
   pieces.push(`{let value:any=7n,stored:any=7n,trace='';const owner={get value(){trace+='get|';return stored;},set value(next:any){trace+='set|';stored=next;}};function base():any{trace+='base|';return owner;}const key:any={toString(){trace+='key|';return 'value';}};const result=${form.replace('TARGET',wrap(target))};collect();output('${wrapper}:${operation}:${kind}:'+typeof result+':'+String(result)+':'+String(${kind==='binding'?'value':'stored'})+':'+trace);}`);
  }
 }
 for(const [wrapper,wrap] of wrappers.entries()){
  pieces.push(`{let trace='';const owner={get value(){trace+='get|';return {valueOf(){trace+='convert|';throw 'conversion';}};},set value(next:any){trace+='set|';}};try{${wrap('owner.value')}++;}catch(error){output('abrupt:'+String(error)+':'+trace);}}`);
  if(javascript)pieces.push(`{const value=7;try{${wrap('value')}++;}catch(error){output('immutable:'+(error instanceof TypeError));}}`);
  if(javascript||wrapper===0)pieces.push(`{let owner:any={value:7};output('delete:'+delete ${wrap('owner.value')}+':'+('value' in owner));}`);
  pieces.push(`{let value:any;[${wrap('value')}]=[17n];output('pattern:'+typeof value+':'+String(value));}`);
 }
 pieces.push(`async function suspended(){let trace='',stored:any=7n;const owner={get value(){trace+='get|';return stored;},set value(next:any){trace+='set|';stored=next;}};function base():any{trace+='base|';return owner;}async function key():Promise<any>{trace+='await|';return {toString(){trace+='key|';return 'value';}};}const result=(base()[${normalizedKeys?'String(await key())':'await key()'}] as any)!++;collect();output('suspended:'+String(result)+':'+String(stored)+':'+trace);}suspended();`);
 let target='owner.value';for(let index=0;index<512;index++)target=wrappers[index%wrappers.length]!(target);
 pieces.push(`{let owner={value:19n};const result=++${target};collect();output('deep:'+String(result)+':'+String(owner.value));}`);
 return pieces.join('\n');
}

test('transparent Reference trees retain original leaf identity and assignment targets',()=>{
 const leaf=ts.factory.createElementAccessExpression(ts.factory.createIdentifier('owner'),ts.factory.createIdentifier('key'));
 const forms=[(n:ts.Expression)=>ts.factory.createParenthesizedExpression(n),(n:ts.Expression)=>ts.factory.createAsExpression(n,ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),(n:ts.Expression)=>ts.factory.createTypeAssertion(ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),n),(n:ts.Expression)=>ts.factory.createNonNullExpression(n),(n:ts.Expression)=>ts.factory.createSatisfiesExpression(n,ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))];
 let state=0x5eed;
 for(let sample=0;sample<32;sample++){
  let tree:ts.Expression=leaf;for(let step=0;step<1+sample*3;step++){state=(Math.imul(state,1664525)+1013904223)>>>0;tree=forms[state%forms.length]!(tree);}
  const targets=new Map<ts.Identifier,ts.Expression>(),binding=normalizeAssignmentTarget(tree,targets);
  expect(unwrapTransparentExpression(tree)).toBe(leaf);expect(binding&&ts.isIdentifier(binding)?targets.get(binding):undefined).toBe(leaf);
 }
});

test('transparent References preserve native values, ordering, completion and suspension',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-transparent-reference-'));
 try{
  for(const javascript of [false,true]){
   const text=source(javascript),erase=(value:string)=>ts.transpileModule(value,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
   // ECMA-262 2026 GetValue caches ToPropertyKey in [[ReferencedName]].
   // Node 26 still repeats conversion on PutValue. The independent reference
   // program explicitly snapshots the known String key for this partition.
   const referenceFile=join(directory,'reference-'+javascript+'.mjs');await writeFile(referenceFile,erase(source(javascript,true).replaceAll('NATIVE_GC','false')));
   const oracle=nodeReferenceSync(['node','-e','const fs=require("node:fs");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");import(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',timeout:60_000});
   expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
   for(const noGc of [false,true]){
    const entry=join(directory,javascript?'main.mjs':'main.ts'),output=join(directory,'program-'+javascript+'-'+noGc),diagnostics:string[]=[];
    const nativeSource=text.replaceAll('NATIVE_GC',String(!noGc));await writeFile(entry,javascript?erase(nativeSource):nativeSource);
    const result=await compile({entry,output,noGc,buildDir:join(directory,'build-'+javascript+'-'+noGc),moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation',scenarioId:'property/transparent-reference#module',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:message=>diagnostics.push(message)});
    expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
    const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
    const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(oracle.stdout.toString());
   }
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
