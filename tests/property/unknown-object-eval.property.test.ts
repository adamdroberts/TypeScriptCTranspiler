import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';
import {nodeReferenceSync} from './node-reference';

/* ToObject of an unknown value is an Object, possibly callable, never a
 * primitive (ES2026 7.1.18), and eval returns an Object argument without
 * evaluating it (PerformEval step 2). Object(input) of an unknown input was a
 * plain unknown value, so `eval(Object(input))` was an unproven eval site.
 * The partitions: Object(input) and new Object(input) as eval's argument
 * (exactly no source), the result's typeof (sound against Node for String,
 * Number, function and object inputs: "object" or "function"), and the
 * result's ToString, which may run a program's toString and so stays
 * unproven. The stress nests Object 256 deep. */

const P=(value:string)=>`eval("print('"+${value}+"')")`;
const depth=256;
const shapes:Record<string,{source:string;sites:(string[]|null)[]|'sound'}>={
 call:{source:'eval(Object(input));',sites:[[]]},
 construct:{source:'eval(new Object(input));',sites:[[]]},
 kind:{source:`var v=eval(Object(input));${P('typeof v')}`,sites:'sound'},
 text:{source:'try{eval(String(Object(input)))}catch(error){}',sites:[null]},
 stress:{source:`eval(${'Object('.repeat(depth)}input${')'.repeat(depth)});`,sites:[[]]},
};
const inputs=['("1;")','(1)','(function(){})','({})'];

test('ToObject of an unknown value is an Object that eval does not evaluate, sound against Node',async()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const [sources,inputs]=JSON.parse(process.argv[1]);const out=[];for(const source of sources){const seen=new Set();for(const input of inputs)vm.runInNewContext(source,{print:value=>seen.add("print(\x27"+value+"\x27)"),input:vm.runInNewContext(input)});out.push([...seen])}process.stdout.write(JSON.stringify(out))',
  JSON.stringify([names.map(name=>shapes[name]!.source),inputs])],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-unknown-object-eval-'));
 try{
  for(const [index,name] of names.entries()){
   const entry=join(directory,`${name}.js`);
   await writeFile(entry,shapes[name]!.source+'\n');
   const started=performance.now();
   const sites=sourceEvaluationInvocations(ts.createProgram([entry],{allowJs:true,noLib:true})).map(site=>site.choices);
   expect({name,seconds:(performance.now()-started)/1000<30}).toEqual({name,seconds:true});
   const expected=shapes[name]!.sites;
   if(expected==='sound'){
    // The Object(input) site evaluates nothing; the typeof site lists every
    // source Node evaluates.
    expect({name,first:sites[0]}).toEqual({name,first:[]});
    expect({name,missing:observed[index]!.filter(value=>!(sites[1]??[]).includes(value))}).toEqual({name,missing:[]});
   }else expect({name,sites}).toEqual({name,sites:expected});
  }
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
