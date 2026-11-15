import {expect,test} from 'bun:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// An ImportCall in code created by eval or the Function constructor resolves
// against GetActiveScriptOrModule(): the Script or Module whose call created
// the code, never the location the compiler stages that code at. Each way of
// creating code is one partition (direct eval, indirect eval, Function, eval
// nested in eval, Function created by eval code), each from the entry module
// and from an imported module in another directory, over a sibling and a
// parent specifier. A 64-deep chain of nested direct evals is the depth
// stress. One source text evaluated from two directories has no single
// referrer: its ImportCall has no AOT candidate and rejects with a TypeError
// (fail closed), where Node resolves it per caller.
test('import() in eval and Function code resolves against the calling module',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-eval-import-referrer-'));
 try{
  for(const name of ['sub','other'])await mkdir(join(directory,name));
  await writeFile(join(directory,'t.mjs'),'export default "root";\n');
  await writeFile(join(directory,'sub','t.mjs'),'export default "sub";\n');
  await writeFile(join(directory,'other','t.mjs'),'export default "other";\n');
  const creators=(prefix:string,quote:string)=>{
   const specifier=(path:string)=>`import(${quote}${path}${quote})`;
   return [
    [`${prefix}direct`,`() => eval(${JSON.stringify(specifier('./t.mjs'))})`],
    [`${prefix}indirect`,`() => (0, eval)(${JSON.stringify(specifier('./t.mjs')+' ')})`],
    [`${prefix}function`,`() => new Function(${JSON.stringify('return '+specifier('./t.mjs'))})()`],
    [`${prefix}nested`,`() => eval(${JSON.stringify('eval('+JSON.stringify(specifier('./t.mjs')+';')+')')})`],
    [`${prefix}evalFunction`,`() => eval(${JSON.stringify('new Function('+JSON.stringify('return '+specifier('./t.mjs')+';')+')()')})`],
    [`${prefix}parent`,`() => eval(${JSON.stringify(specifier('../t.mjs'))})`],
   ];
  };
  const other=creators('other.','"');
  await writeFile(join(directory,'other','lib.mjs'),`export const cases = [${other.map(([label,body])=>`[${JSON.stringify(label)}, ${body}]`).join(', ')}];\n`+
   'export function shared() { return eval("import(\'./t.mjs\') /* shared */"); }\n');
  const depth=64,chain=[`const s0 = "import('./t.mjs')";`];
  for(let index=1;index<depth;index++)chain.push(`const s${index} = "eval(s${index-1})";`);
  const entry=join(directory,'sub','main.mjs');
  await writeFile(entry,[
   'import { cases as otherCases, shared } from "../other/lib.mjs";',
   ...chain,
   `const cases = [${creators('sub.',"'").map(([label,body])=>`[${JSON.stringify(label)}, ${body}]`).join(', ')}, ["sub.chain", () => eval(s${depth-1})], ...otherCases];`,
   'const out = [];',
   'for (const [label, create] of cases) out.push(label + "=" + (await create()).default);',
   'out.push("shared.sub=" + await eval("import(\'./t.mjs\') /* shared */").then(ns => ns.default, error => error.name));',
   'out.push("shared.other=" + await shared().then(ns => ns.default, error => error.name));',
   'console.log(out.join("\\n"));',
  ].join('\n')+'\n');
  const reference=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({code:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({code:0,stderr:''});
  const expected=reference.stdout.toString().trimEnd().split('\n');
  expect(expected.filter(line=>line.startsWith('shared.'))).toEqual(['shared.sub=sub','shared.other=other']);
  const output=join(directory,'program'),diagnostics:string[]=[];
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const failClosed=['shared.sub=TypeError','shared.other=TypeError'];
  expect(native.stdout.toString().trimEnd().split('\n')).toEqual([...expected.filter(line=>!line.startsWith('shared.')),...failClosed]);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
