import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph as graph} from '../test262/native-host';

const calls=['JSON.rawJSON(text)','JSON.rawJSON.call(null,text)','JSON.rawJSON.bind(null)(text)','Reflect.apply(JSON.rawJSON,null,[text])'];
test('raw JSON source owners retain validated text through ordinary calls',()=>{
 for(const text of ['0','17','1e2','9007199254740993123456789','"23;"','true','null'])for(const call of calls){
  const source=`const text=${JSON.stringify(text)};const raw=${call};eval(JSON.stringify(raw));`;
  const result=graph([{path:'main.js',source}]);
  expect({source,error:result.error}).toEqual({source,error:null});
  const oracle=Bun.spawnSync(['node','-e','require("node:fs").writeSync(1,JSON.stringify(JSON.rawJSON(process.argv[1])));','--',text],{stdout:'pipe',stderr:'pipe'});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(result.directEvalSources.map(entry=>entry.source)).toEqual([oracle.stdout.toString()]);
 }
 for(const source of [
  'eval(JSON.stringify(JSON.rawJSON("1\\n")));',
  'eval(JSON.stringify(JSON.rawJSON("[]")));',
  'eval(JSON.stringify(JSON.rawJSON("01")));',
  'eval(JSON.stringify(JSON.rawJSON(Symbol())));',
 ]){const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources).toEqual([]);}
 for(const [source,expected] of [
  ['const raw=JSON.rawJSON("31");eval(raw.rawJSON);','31'],
  ['eval(JSON.stringify(0,function(){return JSON.rawJSON("37")}));','37'],
  ['eval(JSON.stringify({toJSON(){return JSON.rawJSON("41")}}));','41'],
  ['try{JSON.rawJSON({toString(){throw "43;"}})}catch(body){eval(body)}','43;'],
  ['let body="47;";JSON.rawJSON({toString(){body="53;";return "1"}});eval(body);','53;'],
  ['const raw=JSON.rawJSON("59");raw.rawJSON="61";eval(JSON.stringify(raw));','59'],
 ] as const){const result=graph([{path:'main.js',source}]);expect({source,error:result.error}).toEqual({source,error:null});expect(result.directEvalSources.some(entry=>entry.source===expected)).toBe(true);}
 for(const source of [
  'eval(JSON.stringify(JSON.rawJSON(opaque())));',
  'eval(JSON.stringify({rawJSON:"67"}));',
  'eval(JSON.stringify(new Proxy(JSON.rawJSON("71"),{})));',
  'const value={body:"73;"};JSON.rawJSON({toString(){opaque(value);return "1"}});eval(value.body);',
 ])expect({source,error:graph([{path:'main.js',source}]).error}).toMatchObject({error:expect.stringContaining('direct eval source is not a finite static string expression')});
});
