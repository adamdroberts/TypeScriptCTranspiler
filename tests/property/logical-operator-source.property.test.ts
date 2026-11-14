import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

// `a && b` is `a` when `a` is falsy, `a || b` when `a` is truthy and
// `a ?? b` when `a` is neither null nor undefined; otherwise `b`. The source
// a direct eval of the result evaluates must be among the proven ones, and a
// guard `(a) && false` never runs its branch.
const lefts:Record<string,string>={
 text:'"1;"',
 empty:'""',
 null:'null',
 undefined:'undefined',
 boolean:'Math.random()<2',
 zero:'Math.floor(Math.random()*0)',
 equal:'1!==2',
 unequal:'1===2',
 object:'({toString(){return "2;"}})',
};
const operators=['&&','||','??'];
function reference(source:string):string{
 const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:'pipe',stderr:'pipe',timeout:30_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});return node.stdout.toString().trimEnd();
}
function sources(source:string):string[]|null{
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source}]);
 return graph.error===null?graph.directEvalSources.map(entry=>entry.source).sort():null;
}
test('logical operators select the left operand by its own truthiness or nullishness',()=>{
 for(const [leftName,left] of Object.entries(lefts))for(const operator of operators){
  const source=`const v=(${left})${operator}"3;";print(String(v));eval(String(v));`;
  const actual=reference(source),found=sources(source),label={leftName,operator};
  expect({...label,sound:found===null||found.includes(actual)}).toEqual({...label,sound:true});
 }
 // A guard whose && ends in false never runs its branch, whatever the left value.
 for(const [leftName,left] of Object.entries(lefts))
  expect({leftName,found:sources(`var s="4;";if((${left})&&false)s=String(Math.random());eval(s);`)}).toEqual({leftName,found:['4;']});
 // ?? keeps a non-nullish literal and replaces a nullish one.
 expect(sources('eval("1;"??"3;");')).toContain('1;');
 expect(sources('eval(null??"3;");')).toEqual(['3;']);
 // One stress: a 64-deep chain of comparisons ending in false.
 const chain=Array.from({length:64},(_,index)=>`${index}!==${index+1}`).join('&&');
 expect(sources(`var s="4;";if(${chain}&&false)s=String(Math.random());eval(s);`)).toEqual(['4;']);
},300_000);
