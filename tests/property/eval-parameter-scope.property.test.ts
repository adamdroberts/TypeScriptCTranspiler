import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

// A direct eval in a parameter expression sees the formals' environment, not
// the body's: the body's declarations do not exist yet. EvalDeclarationInstantiation
// throws a SyntaxError when a var the eval declares would hoist over a binding
// between the eval and the function's variable environment; for a non-arrow
// function with parameter expressions that includes the `arguments` object
// binding, whatever the body declares (Test262 eval-code/direct
// *-declare-arguments). Node 26 does not throw for `arguments` (a V8
// deviation); by the spec-first rule those partitions expect the spec result,
// and the rest compare with Node. Partitions: function kind, the declared name
// (`arguments` or an ordinary name), and the body's declaration of that name
// (none, var, let, const, class, function). One function with 64 formals, 64
// body lexical declarations and a parameter eval declaring 64 vars is the
// stress.
const kinds=['declaration','expression','arrow','method','generator','async'] as const;
const bodies:Record<string,(name:string)=>string>={
 none:()=>'',var:name=>`var ${name};`,let:name=>`let ${name};`,const:name=>`const ${name} = 0;`,
 class:name=>`class ${name} {}`,function:name=>`function ${name}() {}`,
};
function invoke(kind:string,label:string,formals:string,body:string):string{
 const report=`out.push(${JSON.stringify(label)} + " " + result)`;
 const settle=(call:string)=>`try { ${call}; result = "ok"; } catch (e) { result = e.constructor.name; } ${report};`;
 switch(kind){
  case 'declaration':return `{ let result; function f(${formals}) { ${body} } ${settle('f()')} }`;
  case 'expression':return `{ let result; const f = function (${formals}) { ${body} }; ${settle('f()')} }`;
  case 'arrow':return `{ let result; const f = (${formals}) => { ${body} }; ${settle('f()')} }`;
  case 'method':return `{ let result; const o = { m(${formals}) { ${body} } }; ${settle('o.m()')} }`;
  case 'generator':return `{ let result; function* g(${formals}) { ${body} } ${settle('g()')} }`;
  default:return `pending.push((async function (${formals}) { ${body} })().then(() => { const result = "ok"; ${report}; }, e => { const result = e.constructor.name; ${report}; }));`;
 }
}

test('a direct eval in a parameter expression declares against the formals environment',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-eval-parameter-scope-'));
 try{
  const lines=['const out = [], pending = [];'],spec=new Map<string,string>();
  for(const kind of kinds)for(const name of ['arguments','x'])for(const [bodyName,body] of Object.entries(bodies)){
   // `arguments` cannot be a class or function name in a body that also
   // uses it lexically in strict-only forms; keep the sloppy-valid ones.
   if(name==='arguments'&&(bodyName==='class'))continue;
   const label=`${kind}.${name}.${bodyName}`;
   lines.push(invoke(kind,label,`p = eval("var ${name}")`,body(name)));
   if(name==='arguments'&&kind!=='arrow')spec.set(label,'SyntaxError');
  }
  const count=64,formals=Array.from({length:count},(_,k)=>`p${k} = ${k}`).join(', ');
  const lexical=Array.from({length:count},(_,k)=>`let v${k} = ${k};`).join(' ');
  const evalVars=Array.from({length:count},(_,k)=>`v${k}`).join(', ');
  lines.push(`{ function stress(${formals}, q = eval(${JSON.stringify(`var ${evalVars};`)})) { ${lexical} return v0 + v${count-1}; } out.push("stress " + stress()); }`,
   'Promise.all(pending).then(() => console.log(out.join("\\n")));');
  const entry=join(directory,'main.js'),output=join(directory,'program'),diagnostics:string[]=[];
  await writeFile(entry,lines.join('\n')+'\n');
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:30_000});
  expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  const expected=node.stdout.toString().split('\n').map(line=>{
   const space=line.lastIndexOf(' '),label=line.slice(0,space);
   return spec.has(label)?`${label} ${spec.get(label)}`:line;
  });
  const built=await compile({entry,output,buildDir:join(directory,'build'),diagnosticWriter:message=>diagnostics.push(message)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60_000});
  expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(native.stdout.toString().split('\n')).toEqual(expected);
 }finally{await rm(directory,{recursive:true,force:true});}
},900_000);
