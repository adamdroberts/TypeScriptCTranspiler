import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// FunctionDeclarationInstantiation step 28: when the formals contain
// expressions, the body gets its own variable environment. A sloppy direct
// eval in the body declares its var there, so body code after the eval sees
// the eval's binding while closures created in the formals keep the formal;
// a direct eval inside a nested arrow declares into the arrow, and a strict
// eval declares nothing outside itself. Partitions: function kind
// (declaration, expression, arrow, method, generator, async), formal shape
// (default, destructuring default, a default on another formal), and reads
// before the eval, after it, after a later write, from a formal closure and
// from a body arrow. Node is the oracle. One function with 64 formals all
// shadowed by one eval is the stress.
const shapes:Record<string,{formals:string;call:string}>={
 default:{formals:'a = 0, g = () => a',call:'1'},
 pattern:{formals:'{ a } = { a: 0 }, g = () => a',call:'{ a: 1 }'},
 other:{formals:'a, b = 2, g = () => a',call:'1'},
};
const bodies:Record<string,string>={
 after:'eval("var a = 2"); return [a, g()];',
 before:'const before = a; eval("var a = 3"); return [before, a, g()];',
 write:'eval("var a = 4"); a = 5; return [a, g()];',
 arrow:'eval("var a = 6"); const read = () => a; return [read(), g()];',
 nested:'const inner = () => { eval("var a = 7"); return a; }; return [inner(), a, g()];',
 strict:'const strictEval = () => { "use strict"; return eval("var a = 8; a"); }; return [strictEval(), a, g()];',
};
function wrap(kind:string,name:string,formals:string,body:string,call:string):string{
 switch(kind){
  case 'declaration':return `function ${name}(${formals}) { ${body} }\nout.push(${JSON.stringify(name)} + " " + JSON.stringify(${name}(${call})));`;
  case 'expression':return `const ${name} = function (${formals}) { ${body} };\nout.push(${JSON.stringify(name)} + " " + JSON.stringify(${name}(${call})));`;
  case 'arrow':return `const ${name} = (${formals}) => { ${body} };\nout.push(${JSON.stringify(name)} + " " + JSON.stringify(${name}(${call})));`;
  case 'method':return `const ${name} = { m(${formals}) { ${body} } };\nout.push(${JSON.stringify(name)} + " " + JSON.stringify(${name}.m(${call})));`;
  case 'generator':return `function* ${name}(${formals}) { ${body.slice(0,body.lastIndexOf('return '))+'yield '+body.slice(body.lastIndexOf('return ')+7)} }\nout.push(${JSON.stringify(name)} + " " + JSON.stringify(${name}(${call}).next().value));`;
  default:return `async function ${name}(${formals}) { ${body} }\npending.push(${name}(${call}).then(value => out.push(${JSON.stringify(name)} + " " + JSON.stringify(value))));`;
 }
}

test('a sloppy direct eval in the body shadows a formal when the formals contain expressions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-eval-parameter-body-'));
 try{
  const lines=['const out = [], pending = [];'];
  let index=0;
  for(const kind of ['declaration','expression','arrow','method','generator','async'])for(const [shapeName,shape] of Object.entries(shapes))for(const [bodyName,body] of Object.entries(bodies)){
   // Keep the cross product compact: every body with the default shape, and
   // every shape with the `after` body.
   if(shapeName!=='default'&&bodyName!=='after')continue;
   lines.push(wrap(kind,`f${index++}_${kind}_${shapeName}_${bodyName}`,shape.formals,body,shape.call));
  }
  const count=64,formals=Array.from({length:count},(_,k)=>`p${k} = ${k}`).join(', ');
  const declarations=Array.from({length:count},(_,k)=>`p${k} = ${k + 1000}`).join(', ');
  lines.push(`function stress(${formals}, g = () => p0 + p${count-1}) { eval(${JSON.stringify(`var ${declarations};`)}); return [p0, p${count-1}, g()]; }`,
   'out.push("stress " + JSON.stringify(stress()));',
   'Promise.all(pending).then(() => console.log(out.join("\\n")));');
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,lines.join('\n')+'\n');
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString().split('\n')).toEqual(node.stdout.toString().split('\n'));
 }finally{await rm(directory,{recursive:true,force:true});}
},900_000);
