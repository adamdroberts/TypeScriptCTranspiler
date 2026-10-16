import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

test('abstract allocation identities retain both SameValue outcomes without inventing coercion effects',()=>{
 for(const allocation of ['Symbol("fresh")','{}']){
  for(const operands of ['first,second','first,first']){
   const setup='function fresh(){return '+allocation+';}const first=fresh(),second=fresh();',source=setup+'print(eval(Object.is('+operands+')?"17;":"19;"));';
   const code='const fs=require("node:fs"),vm=require("node:vm");new vm.Script('+JSON.stringify(source)+').runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});';
   const node=nodeReferenceSync(['node','-e',code],{stdout:'pipe',stderr:'pipe'});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(node.stdout.toString()).toBe(operands==='first,first'?'17\n':'19\n');
   const result=graph([{path:'subject.js',source}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain(node.stdout.toString().trimEnd()+';');
  }
  const unknown='function fresh(){return '+allocation+';}let body="17;";if(!Object.is(fresh(),fresh()))body=String(Math.random());eval(body);';
  expect(graph([{path:'subject.js',source:unknown}]).error).toContain('direct eval source is not a finite static string expression');
 }
 for(const [call,expected]of [['Object.is()', '17;'],['Object.is(undefined)', '17;'],['Reflect.apply(Object.is,undefined,[undefined,null,()=>{throw 0;}])','19;']] as const){
  const result=graph([{path:'subject.js',source:'eval('+call+'?"17;":"19;");'}]);expect(result.error).toBeNull();expect(result.directEvalSources.map(value=>value.source)).toContain(expected);
 }
});
