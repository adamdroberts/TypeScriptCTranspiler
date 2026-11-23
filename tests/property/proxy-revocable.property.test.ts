import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* Proxy.revocable (ES2026 28.2.2.1) returns an ordinary object with the new
 * Proxy and its revoke function, a native that returns undefined; after
 * revoke every internal method of the Proxy throws a TypeError (its handler
 * is null). Before, revocable was an unrepresented member, so calling its
 * revoke ran unknown code. The partitions, sound against Node: revocable and
 * revoke followed by an eval of a literal global (exact); a revoked Proxy's
 * Get caught and stored (listed or unproven); a revocable Proxy's get trap
 * that writes the global (listed); `new Proxy.revocable()` and `new revoke()`
 * caught (TypeError). The stress makes 128 revocable Proxies. */

const P=`eval("print('"+w+"')");`;
const shapes:Record<string,{source:string;exact:string[]|null}>={
 revoke:{source:`var w='1';var r=Proxy.revocable([],{});r.revoke();r.revoke();${P}`,exact:["print('1')"]},
 revokedGet:{source:`var w='1';var r=Proxy.revocable({},{});r.revoke();try{r.proxy.x}catch(e){w=e instanceof TypeError?'T':'other'}${P}`,exact:null},
 trap:{source:`var w='1';var r=Proxy.revocable({},{get(){w='2';return 1}});r.proxy.x;${P}`,exact:null},
 construct:{source:`var w='1';try{new Proxy.revocable({},{})}catch(e){w=e instanceof TypeError?'T':'other'}try{new (Proxy.revocable({},{}).revoke)()}catch(e){w+=e instanceof TypeError?'T':'other'}${P}`,exact:null},
 stress:{source:`var w='1';${Array.from({length:128},(_,k)=>`Proxy.revocable(${k%2?'[]':'{}'},{}).revoke();`).join('')}${P}`,exact:["print('1')"]},
};

test('Proxy.revocable returns a revocable Proxy and a native revoke, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{print:value=>seen.push("print(\x27"+value+"\x27)")});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]!.source))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[names.indexOf('revokedGet')]).toEqual(["print('T')"]);
 expect(observed[names.indexOf('construct')]).toEqual(["print('TT')"]);
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-proxy-revocable-'));
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
