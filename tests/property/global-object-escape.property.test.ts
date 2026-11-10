import {expect,test} from 'bun:test';
import * as fs from 'node:fs';import * as os from 'node:os';import * as path from 'node:path';
import ts from 'typescript';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* A native that receives the global object calls a member of it only under a
 * protocol key (toString, @@toPrimitive, toJSON, a getter it reads) or as a
 * callback it is handed. The realm's own members under their own names
 * (`eval`, `Function`, `Number`, ...) are never such members, so handing the
 * global object to a native does not make `eval` a native callee; a callable
 * the program stores on the global object, under any key, still is. Each
 * generated Script evaluates what its protocol member ran; the eval records
 * must fail closed or contain every source Node evaluates, and the shapes that
 * only hand the global object to a native must stay finite. A 512-deep chain
 * of objects held by global bindings, handed to natives through the global
 * object, is the depth stress. */

const shapes:Record<string,string>={
 assignTarget:'eval("0;");Object.assign(globalThis,{});observe("1;");',
 concatOperand:'eval("0;");[].concat(globalThis);observe("1;");',
 sliceReceiver:'eval("0;");Array.prototype.slice.call(globalThis);observe("1;");',
 declaredToString:'function toString(){observe("2;");return "";}[globalThis].join();',
 declaredSortKey:'function toString(){observe("3;");return "";}[globalThis,"a"].sort();',
 writtenToPrimitive:'globalThis[Symbol.toPrimitive]=function(){observe("4;");return "";};[globalThis].join();',
 spreadableGetter:'Object.defineProperty(globalThis,Symbol.isConcatSpreadable,{get(){observe("5;");return false;},configurable:true});[].concat(globalThis);',
 declaredToJSON:'function toJSON(){observe("6;");return 1;}JSON.stringify(globalThis);',
 intrinsicMember:'Number.toString=function(){observe("7;");return "";};[Number].join();',
 nestedIntrinsicMember:'Number.toString=function(){observe("8;");return "";};[globalThis.Number].join();',
};
const finite=['assignTarget','concatOperand','sliceReceiver'];

function invocations(directory:string,source:string){
 const entry=path.join(directory,'main.js');fs.writeFileSync(entry,source);
 return sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry]});
}

test('natives handed the global object call only its protocol members',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tsc2c-global-escape-'));
 try{
  const results=names.map((name,index)=>{
   const records=invocations(directory,shapes[name]!.replaceAll('observe(','eval('));
   const closed=records.every(record=>record.choices!==null);
   return {name,closed,sources:records.flatMap(record=>record.choices??[]),node:observed[index]!};
  });
  // Sound: closed records contain every source Node evaluates.
  expect(results.filter(result=>result.closed&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
  // Precise: handing the global object to a native leaves `eval` uncalled.
  expect(results.filter(result=>finite.includes(result.name)&&!result.closed).map(result=>result.name)).toEqual([]);
  // A program-written eval on the global object stays a possible native callee.
  for(const source of ['var alias=eval;Object.assign(globalThis,{});','globalThis.alias=eval;[].concat(globalThis);'])
   expect(invocations(directory,source).some(record=>!record.direct&&record.choices===null)).toBe(true);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
},120_000);

test('a 512-deep object chain on the global object handed to natives stays finite',()=>{
 const depth=512,lines=['eval("9;");var v0={text:"9;"};'];
 for(let index=1;index<depth;index++)lines.push(`var v${index}={next:v${index-1}};`);
 lines.push('Object.assign(globalThis,{});[].concat(globalThis);Array.prototype.slice.call(globalThis);');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tsc2c-global-escape-deep-'));
 try{
  const records=invocations(directory,lines.join('\n'));
  expect(records.map(record=>({direct:record.direct,choices:record.choices}))).toEqual([{direct:true,choices:['9;']}]);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
},300_000);
