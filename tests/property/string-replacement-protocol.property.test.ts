import{expect,test}from'bun:test';
import*as fs from'node:fs/promises';
import*as os from'node:os';
import*as path from'node:path';
import{compile}from'../../src/compile';
import{parseHostObservation}from'../test262/protocol';
const script=String.raw`
function encode(value){if(typeof value==='string'){var out=[];for(var i=0;i<value.length;i++)out.push(value.charCodeAt(i));return out.join(',')}return String(value)}
for(var name of ['replace','replaceAll']){
 var method=String.prototype[name],descriptor=Object.getOwnPropertyDescriptor(String.prototype,name);
 print('metadata:'+name+':'+method.name+':'+method.length+':'+descriptor.writable+':'+descriptor.enumerable+':'+descriptor.configurable);
 for(var text of ['','aaa','A😀B😀C'])for(var search of ['','aa','😀','\ud83d','absent'])for(var functional of [false,true]){
  var log=[],receiver={toString:function(){log.push('receiver');return text}},needle={toString:function(){log.push('search');return search}};
  var replacement=function(match,position,source){'use strict';log.push('call:'+(this===undefined)+':'+encode(match)+':'+position+':'+encode(source)+':'+arguments.length);return{toString:function(){log.push('result');return '$&'}}};
  if(!functional)replacement={toString:function(){log.push('replacement');return "$$:$&:$\x60:$':$1:$<x>"}};
  print('literal:'+name+':'+encode(method.call(receiver,needle,replacement))+':'+log.join('|'));
 }
 for(var match of [undefined,false,true])for(var flags of [undefined,null,'','g',{toString:function(){return 'g'}}]){
  var log=[],marker={},receiver={toString:function(){log.push('receiver');return 'a'}},replacement={};
  var carrier={get flags(){log.push('flags');return flags},get [Symbol.match](){log.push('match');return match},get [Symbol.replace](){log.push('replace');return function(r,v){log.push('call:'+(this===carrier)+':'+(r===receiver)+':'+(v===replacement)+':'+arguments.length);return marker}}};
  try{print('protocol:'+name+':'+(method.call(receiver,carrier,replacement)===marker)+':'+log.join('|'))}catch(error){print('protocol:'+name+':'+error.name+':'+log.join('|'))}
 }
 for(var value of [undefined,null,0]){
  var log=[],needle={get [Symbol.replace](){log.push('replace');return value},toString:function(){log.push('search');return 'a'}},receiver={toString:function(){log.push('receiver');return 'a'}};
  try{print('method:'+name+':'+encode(method.call(receiver,needle,'x'))+':'+log.join('|'))}catch(error){print('method:'+name+':'+error.name+':'+log.join('|'))}
 }
 for(var receiver of [null,undefined]){var accessed=false,needle={get [Symbol.replace](){accessed=true;throw{}}};try{method.call(receiver,needle,'x')}catch(error){print('coercible:'+name+':'+error.name+':'+accessed)}}
 for(var stage of ['get','receiver','search','replacement','callback','result']){
  var marker={},log=[],receiver={toString:function(){log.push('receiver');if(stage==='receiver')throw marker;return 'a'}},needle={get [Symbol.replace](){log.push('get');if(stage==='get')throw marker;return undefined},toString:function(){log.push('search');if(stage==='search')throw marker;return 'a'}};
  var replacement=stage==='callback'||stage==='result'?function(){log.push('callback');if(stage==='callback')throw marker;return{toString:function(){log.push('result');throw marker}}}:{toString:function(){log.push('replacement');if(stage==='replacement')throw marker;return 'x'}};
  try{method.call(receiver,needle,replacement)}catch(error){print('abrupt:'+name+':'+stage+':'+(error===marker)+':'+log.join('|'))}
 }
 var original=String.prototype[name];function argument(){String.prototype[name]=function(){return 'changed'};return 'a'}print('lookup:'+name+':'+String.prototype[name].call('aba',argument(),'x'));String.prototype[name]=original;
}
print('string-replacement-protocol-ok');
`;
test('String replacement retains actual symbol protocol and ordered literal match worklist',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-string-replace-protocol-'));
 try{
  const oracle=path.join(temporary,'oracle.cjs'),stdout=oracle+'.stdout';await fs.writeFile(oracle,'globalThis.print=value=>require("node:fs").writeSync(1,String(value)+"\\n");\n'+script);
  const reference=Bun.spawnSync(['node',oracle],{stdout:Bun.file(stdout),stderr:'pipe',timeout:120000});expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});const expected=await fs.readFile(stdout,'utf8');expect(expected.endsWith('string-replacement-protocol-ok\n')).toBe(true);
  const entry=path.join(temporary,'subject.js');await fs.writeFile(entry,script);
  for(const noGc of [false,true]){const output=path.join(temporary,noGc?'no-gc':'gc'),diagnostics:string[]=[];const result=await compile({entry,output,initializationEntries:[entry],noGc,buildDir:output+'-build',test262Observation:{kind:'test262-native-observation',scenarioId:'property/string-replacement-protocol.js#sloppy',setupEntries:[],testEntry:entry,async:false},diagnosticWriter:m=>diagnostics.push(m)});expect({code:result.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'},timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});const observed=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observed.kind).toBe('normal');expect(observed.stdout??'').toBe(expected);}
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);
