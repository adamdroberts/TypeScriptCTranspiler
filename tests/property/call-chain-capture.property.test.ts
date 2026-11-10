import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A value returned through a chain of calls keeps the capture constraints of
 * every activation it passes, and only constraints of one activation can
 * subsume each other. Chains of direct calls, method calls, aliased callees,
 * call/apply, arrows, conditional forwarding and calls that read the callee
 * from a binding written before the call each forward a literal to an eval;
 * the graph must fail closed or contain every source Node evaluates, and each
 * chain must be finite. A 128-deep direct chain is the depth stress: before
 * the constraints were compared per activation it took minutes, and it must
 * stay within its budget under both host models. */

function chain(depth:number,link:(index:number)=>string,base:string):string {
 const lines=[base];for(let index=1;index<depth;index++)lines.push(link(index));
 return lines.join('\n');
}
const depth=6;
const shapes:Record<string,string>={
 direct:chain(depth,index=>`function f${index}(){return f${index-1}()}`,'function f0(){return "1;"}')+`\nobserve(f${depth-1}());`,
 method:chain(depth,index=>`o.f${index}=function(){return this.f${index-1}()};`,'var o={f0(){return "2;"}};')+`\nobserve(o.f${depth-1}());`,
 aliased:chain(depth,index=>`var g${index}=function(){return g${index-1}()};`,'var g0=function(){return "3;"};')+`\nvar alias=g${depth-1};observe(alias());`,
 callApply:chain(depth,index=>`function f${index}(){return ${index%2?`f${index-1}.call(null)`:`f${index-1}.apply(null,[])`}}`,'function f0(){return "4;"}')+`\nobserve(f${depth-1}());`,
 arrows:chain(depth,index=>`const a${index}=()=>a${index-1}();`,'const a0=()=>"5;";')+`\nobserve(a${depth-1}());`,
 conditional:chain(depth,index=>`function f${index}(n){return n>${index}?"6;":f${index-1}(n)}`,'function f0(n){return "7;"}')+`\nobserve(f${depth-1}(3));`,
 rebound:chain(depth,index=>`function f${index}(){return f${index-1}()}`,'var f0=function(){return "8;"};')+`\nf0=function(){return "9;"};observe(f${depth-1}());`,
 argument:chain(depth,index=>`function f${index}(v){return f${index-1}(v)}`,'function f0(v){return v}')+`\nobserve(f${depth-1}("10;"));`,
};

test('values forwarded through call chains reach their evals exactly',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]!.replaceAll('observe(','eval(')}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 expect(results.filter(result=>result.error!==null).map(result=>result.name)).toEqual([]);
},120_000);

test('a 128-deep call chain stays within its analysis budget',()=>{
 const source=chain(128,index=>`function f${index}(){return f${index-1}()}`,'function f0(){return "11;"}')+'\neval(f127());\n';
 for(const host of ['open','test262'] as const){
  const started=performance.now();
  const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source}],[],host);
  expect({host,error:graph.error,sources:graph.directEvalSources.map(record=>record.source)}).toEqual({host,error:null,sources:['11;']});
  expect(performance.now()-started).toBeLessThan(60_000);
 }
},300_000);
