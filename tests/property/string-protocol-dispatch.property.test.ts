import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* String.prototype.match, matchAll, replace, replaceAll, search and split
 * with an Object argument read its @@-method and, when there is one, return
 * Call(method, argument, «O, ...rest»); without one, O and the argument are
 * converted and a new RegExp's native method runs. Other String, Number and
 * BigInt prototype methods run user code only through their receiver's and
 * arguments' conversions. Such a call is not unknown code writing every
 * global, so a later eval of a literal global stays exact. The partitions,
 * sound against Node: @@match and @@search methods that write nothing and
 * return a value (exact); a @@replace method, a replacer function, a
 * receiver's toString and a split argument without @@split (converted by
 * toString) that write the global (listed or the site unproven); a String
 * method's result from a user @@match flowing into the evaluated text. Number
 * toString and toFixed check thisNumberValue before converting their
 * argument: a non-Number receiver throws without running the radix's valueOf
 * (exact); a valid one runs it (listed). A Number or Boolean wrapper has no own
 * members, so its toString is its prototype's (exact). The stress makes 256
 * dispatching calls. */

const P=`eval("print('"+w+"')");`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 matchMethod:{source:`var w='1';var m={[Symbol.match](s){return [s]}};"ab".match(m);"ab".search({[Symbol.search](){return 0}});${P}`,exact:["print('1')"]},
 matchResult:{source:`var w='1';var m={[Symbol.match](s){return '2'}};w="ab".match(m);${P}`,exact:["print('2')"]},
 replaceWrites:{source:`var w='1';"ab".replace({[Symbol.replace](){w='2';return ''}},'x');${P}`,exact:null},
 replacer:{source:`var w='1';"ab".replace(/a/,function(){w='2';return ''});${P}`,exact:null},
 receiverText:{source:`var w='1';String.prototype.padEnd.call({toString(){w='2';return 'a'}},3);${P}`,exact:null},
 splitConverted:{source:`var w='1';"a,b".split({toString(){w='2';return ','}});${P}`,exact:null},
 numberReceiverFirst:{source:`var w='1';try{Reflect.apply((1).toString,{},[{valueOf(){w='2';return 10}}])}catch(e){}${P}`,exact:["print('1')"]},
 numberRadix:{source:`var w='1';(255).toString({valueOf(){w='2';return 16}});new Number(255).toFixed({valueOf(){w+='3';return 1}});${P}`,exact:null},
 wrapperMethod:{source:`var w='1';var radix={valueOf(){return 16}};for(var i=0;i<2;i++){new Number(255).toString(radix);new Boolean(true).toString();}${P}`,exact:["print('1')"]},
 stress:{source:`var w='1';var m={[Symbol.match](s){return null}};${Array.from({length:256},(_,k)=>['"ab".match(m);','"ab".search({[Symbol.search](){return 0}});','"ab".padStart(4);','"ab".split({[Symbol.split](){return []}});'][k%4]).join('')}${P}`,exact:["print('1')"]},
};

test('String prototype methods dispatch to their argument protocol, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[names.indexOf('numberRadix')]).toEqual(["print('23')"]);
 for(const name of ['replaceWrites','replacer','receiverText','splitConverted'])expect({name,observed:observed[names.indexOf(name)]}).toEqual({name,observed:["print('2')"]});
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-string-protocol-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const choices=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true}),{roots:[entry],host:'test262'})[0]?.choices??null;
   expect({name,fast:(performance.now()-started)/1000<30}).toEqual({name,fast:true});
   expect({name,missing:choices===null?[]:observed[index]!.filter(value=>!choices.includes(value))}).toEqual({name,missing:[]});
   const exact=shapes[name]!.exact;
   if(exact)expect({name,choices}).toEqual({name,choices:exact});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
