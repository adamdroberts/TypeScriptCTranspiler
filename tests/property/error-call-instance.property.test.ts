import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* Error, the NativeError constructors and AggregateError create the same
 * instance when called as when constructed (ES2026 20.5.1.1, 20.5.6.1.1,
 * 20.5.7.1.1: NewTarget is the active function), so a call's result is that
 * instance, not an opaque value a promise resolution must treat as unknown
 * code's thenable. The partitions: an async function returning Error(...),
 * TypeError(...) and AggregateError([...]), each awaited, then an eval of a
 * literal global (exact); a replaced Error returning a thenable whose then
 * writes the global, observed after resolution (sound against Node). A
 * builtin's instance inherits NewTarget's prototype and its unrepresented own
 * members are native: a promise resolved with a constructed Error or Date
 * reaches its reaction (its `then` read had no value, so the reaction never
 * ran and the eval in it listed no source), and a constructed Error's
 * message is listed. The stress returns 64 error calls from async
 * functions. */

const P=`eval("print('"+w+"')")`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 error:{source:`var w='1';async function d(){return Error('x')}d().then(()=>${P});`,exact:["print('1')","print('undefined')"]},
 nativeError:{source:`var w='1';async function d(){return TypeError(await Promise.resolve('x'))}d().then(()=>${P});`,exact:["print('1')","print('undefined')"]},
 aggregate:{source:`var w='1';async function d(){return AggregateError([1],'x')}d().then(()=>${P});`,exact:["print('1')","print('undefined')"]},
 replaced:{source:`var w='1';var o=Error;Error=function(){return {then(r){w='2';r(1)}}};async function d(){return Error('x')}var c=d();Error=o;c.then(()=>${P});`,exact:null},
 resolvedError:{source:`var w='1';Promise.resolve(new Error('x')).then(()=>${P});`,exact:null},
 resolvedDate:{source:`var w='1';async function d(){return new Date(0)}d().then(()=>${P});`,exact:null},
 message:{source:`var w=new Error('x').message;${P}`,exact:null},
 stress:{source:`var w='1';${Array.from({length:64},(_,k)=>`async function d${k}(){return ${['Error','RangeError','URIError','SyntaxError'][k%4]}('m${k}')}d${k}();`).join('')}Promise.resolve().then(()=>${P});`,exact:["print('1')","print('undefined')"]},
};

test('error constructor calls create instances, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");(async()=>{const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});await new Promise(resolve=>setTimeout(resolve,10));out.push(seen)}process.stdout.write(JSON.stringify(out))})()',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[names.indexOf('replaced')]).toEqual(["print('2')"]);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-error-call-instance-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   const exact=shapes[name]!.exact;
   // A read in a promise reaction (a deferred job) may also see the var
   // before its initializer, so the exact set includes undefined.
   if(exact)expect({name,choices:choices&&[...choices].sort()}).toEqual({name,choices:[...exact].sort()});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
