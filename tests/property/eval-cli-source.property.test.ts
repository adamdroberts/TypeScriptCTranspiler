import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

test('CLI and native host close one eval source graph with retained environments',async()=>{
 const partitions=[false,true].flatMap(strict=>['direct','indirect'].map(kind=>{
  const invoke=kind==='direct'?'eval(source)':'(0,eval)(source)';
  const body=kind==='direct'?'local += 3; local;':'globalThis.evalCliCell += 3; evalCliCell;';
  return `{function partition(source){${strict?'"use strict";':''}let local=7;return ${invoke};}
    globalThis.evalCliCell=7;check(partition(${JSON.stringify(body)})===10,${JSON.stringify(kind+'-'+strict)});}`;
 })).join('\n');
 const utf16=[0xd800,0xd801,0xfffd].map(unit=>`check(eval(${JSON.stringify("'"+String.fromCharCode(unit)+"';")}).charCodeAt(0)===${unit},"source-utf16-${unit}");`).join('\n');
 const source=`function check(value,label){console.log(label+':'+value);if(!value)throw new Error(label)}
 ${partitions}
 ${utf16}
 function closure(){let local=13;const read=eval('()=>local');local=17;return read}
 check(closure()()===17,'live-eval-closure');
 function strictVars(){'use strict';check(eval('')===undefined&&eval('var hidden=1;')===undefined,'empty-completion-strictness');return typeof hidden}
 function sloppyVars(){eval('var visible=19;');return visible}
 check(strictVars()==='undefined'&&sloppyVars()===19,'var-strictness');
 class Owner {#value=23;read(){return eval('this.#value')}retain(){return eval('(receiver)=>receiver.#value')}}
 const owner=new Owner();check(owner.read()===23&&owner.retain()(owner)===23,'private-environment');
 const intrinsic=eval;check(intrinsic===globalThis.eval&&intrinsic.name==='eval'&&intrinsic.length===1,'eval-identity');
 check(intrinsic({value:29}).value===29&&eval(31)===31&&eval()===undefined,'non-string-preservation');
 let rejected=false;try{new intrinsic('1')}catch(error){rejected=error instanceof TypeError}check(rejected,'eval-not-constructor');
 function nested(){let local=37;return eval('eval("local + 4;");')}
 check(nested()===41,'nested-eval-source');
 check(Function('return eval("43;");')()===43,'function-to-eval-source');
 check(eval('Function("return 47;")();')===47,'eval-to-function-source');
 let syntax=false;try{eval('let = ;')}catch(error){syntax=error instanceof SyntaxError}check(syntax,'invalid-source-runtime-syntax');
 let saved=eval;globalThis.eval=function replacement(value){return value+1};
 check(eval(52)===53&&saved('59;')===59,'mutable-eval-property');globalThis.eval=saved;
 const owners=[],reads=[];for(let index=0;index<4096;index++){class Fresh {#value=index;retain(){return eval('(receiver)=>receiver.#value')}}const value=new Fresh();owners.push(value);reads.push(value.retain());}
 let sum=0;for(let index=0;index<owners.length;index++)sum+=reads[index](owners[index]);check(sum===8386560,'deep-retained-eval-owner-graph');`;
 const moduleSource=source.replace('return visible}', 'return typeof visible}').replace('sloppyVars()===19', 'sloppyVars()==="undefined"');
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-eval-cli-'));
 try{
  const oracleEntry=path.join(temporary,'oracle.cjs');await fs.writeFile(oracleEntry,'const fs = require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");\n'+source);
  const oracle=Bun.spawnSync(['node',oracleEntry],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({exit:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exit:0,stderr:''});
  const moduleOracleEntry=path.join(temporary,'oracle.mjs');
  await fs.writeFile(moduleOracleEntry,'import fs from "node:fs";console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");\n'+moduleSource);
  const moduleOracle=Bun.spawnSync(['node',moduleOracleEntry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({exit:moduleOracle.exitCode,stderr:moduleOracle.stderr.toString(),stdout:moduleOracle.stdout.toString()}).toEqual({exit:0,stderr:'',stdout:oracle.stdout.toString()});
  for(const {observation,module} of [{observation:false,module:false},{observation:false,module:true},{observation:true,module:false}])for(const noGc of [false,true]){
   const directory=path.join(temporary,`${observation}-${module}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,module?'caller.mjs':'caller.js');
   const prepared=module?moduleSource:source;
   await fs.writeFile(entry,observation?prepared.replace('console.log(label+', 'print(label+'):prepared);
   const diagnostics:string[]=[],output=path.join(directory,'program');
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message),
    ...(observation?{isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/eval-cli.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]}}:{})});
   expect({observation,module,noGc,exit:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({observation,module,noGc,exit:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({observation,module,noGc,exit:native.exitCode,stderr:native.stderr.toString()}).toEqual({observation,module,noGc,exit:0,stderr:''});
   const actual=observation?parseHostObservation(JSON.parse(native.stdout.toString())).stdout:native.stdout.toString();expect(actual).toBe(oracle.stdout.toString());
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600000);

test('unresolved eval sources fail closed at canonical invocation nodes',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-eval-admission-'));
 try{
  for(const invoke of ['eval(process.argv[2])','const execute=eval;execute(process.argv[2])']){
   const entry=path.join(temporary,'caller.ts');await fs.writeFile(entry,invoke+';');const diagnostics:string[]=[];
   const result=await compile({entry,output:path.join(temporary,'program'),noGc:true,diagnosticWriter:message=>diagnostics.push(message)});
   expect(result.exitCode).toBe(3);expect(diagnostics.join('')).toContain('unknown eval() source requires --runtime-code-manifest allow-list');
   const fallback=await compile({entry,output:path.join(temporary,'program'),noGc:true,unsafeEval:true,emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
   expect(fallback.exitCode).toBe(0);expect(fallback.mainC).toContain('return tsc_node_eval(source);');
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
});
