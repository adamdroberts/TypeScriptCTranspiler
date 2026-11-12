import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';
import {nodeReferenceSync} from './node-reference';

/* Sloppy code may declare one function name twice in a Block or CaseBlock
 * (B.3.2.4, B.3.2.5); the block's binding holds the last declaration, and
 * Node 26 and Bun also give the var scope the binding B.3.2.1 would give a
 * single declaration, which B.3.2.1 itself withholds because `var f` in place
 * of either would conflict with the other. One sloppy Script declares
 * duplicates in a function's block, its case block, beside a call between
 * them, three times, beside a let or a parameter of the name, and in the
 * Script's own block, compiled with and without the collector, against Node
 * running it as a global Script. (Inside a block that already declares the
 * name, Node also hoists the inner block's functions; Bun and B.3.2.1 do not,
 * and function-binding-source's stress keeps that.) One block declaring the
 * name 256 times is the depth stress. */

const many=Array.from({length:256},(_,index)=>`function m() { return ${index}; }`).join(' ');
const script=`print("block:" + (function () { var before = typeof k; { function k() { return 1; } function k() { return 2; } } return before + ":" + k(); })());
print("between:" + (function () { var r; { function k() { return 1; } r = k(); function k() { return 2; } } return r + ":" + k(); })());
print("case:" + (function () { switch (1) { case 1: function k() { return 1; } case 2: function k() { return 2; } } return k(); })());
print("three:" + (function () { { function k() { return 1; } function k() { return 2; } function k() { return 3; } } return k(); })());
print("let-outside:" + (function () { let k = "let"; { function k() { return 1; } function k() { return 2; } } return typeof k; })());
print("parameter:" + (function (k) { { function k() { return 1; } function k() { return 2; } } return typeof k; })(0));
{ function g() { return "g1"; } function g() { return "g2"; } }
print("script:" + g() + ":" + Object.getOwnPropertyDescriptor(globalThis, "g").configurable);
print("stress:" + (function () { { ${many} } return m(); })());
`;

test('duplicate function declarations in a sloppy block give the var scope the last one',async()=>{
 const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");vm.runInThisContext(process.argv[1]);',script],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
 const expected=reference.stdout.toString();
 expect(expected.split('\n').filter(line=>line.startsWith('block:')||line.startsWith('stress:'))).toEqual(['block:undefined:2','stress:255']);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-block-duplicates-'));
 try{
  for(const noGc of [false,true]){
   const entry=path.join(directory,'subject.js'),output=path.join(directory,`subject-${noGc}`),diagnostics:string[]=[];
   await fs.writeFile(entry,script);
   const result=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],
    test262Observation:{kind:'test262-native-observation',scenarioId:'property/block-function-duplicates.js#script',setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},
    diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({noGc,exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,exitCode:0,stderr:''});
   const observed=parseHostObservation(JSON.parse(native.stdout.toString()));
   expect({noGc,kind:observed.kind,stdout:observed.stdout}).toEqual({noGc,kind:'normal',stdout:expected});
  }
 }finally{await fs.rm(directory,{recursive:true,force:true});}
},600_000);
