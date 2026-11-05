import {expect,test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* ObjectLiteral early errors: a CoverInitializedName (`{ a = 1 }`) and a
 * second non-computed `__proto__: value` member are SyntaxErrors unless the
 * literal covers an ObjectAssignmentPattern (assignment left side, for-in/of
 * head, nested pattern position); shorthand, computed and method `__proto__`
 * forms never count; and no member takes a modifier except `async` on a
 * method. Generated literals mix those members and sit in literal, pattern,
 * default-value and parameter positions; the verdict is compared with Node's
 * parser. One deep nesting checks the pattern ascent. At runtime
 * `__proto__: function () {}` is the prototype setter, not a NamedEvaluation,
 * so the function keeps an empty name (compared with Node). */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const members=['__proto__: o','"__proto__": o','["__proto__"]: o','__proto__','__proto__() {}','a = 1','a','a: o','a: 1','async a','async a() {}','async get a() {}','static a() {}','get a() {}','async a = 1','b: g'];
function literal(random:()=>number,depth:number):string{
 const count=1+Math.floor(random()*3);
 const parts:string[]=[];
 for(let index=0;index<count;index++){
  if(depth>0&&random()<0.3)parts.push(`${random()<0.5?'k':'__proto__'}: ${literal(random,depth-1)}`);
  else parts.push(members[Math.floor(random()*members.length)]!);
 }
 return `{ ${parts.join(', ')} }`;
}
function program(random:()=>number):string{
 const lit=literal(random,2);
 const body=[()=>`(${lit});`,()=>`(${lit} = o);`,()=>`for (${lit} of []);`,()=>`for (${lit} in o);`,()=>`[${lit}] = o;`,()=>`({ k: ${lit} } = o);`,()=>`({ k = ${lit} } = o);`,()=>`(${lit}) => 0;`,()=>`g(${lit});`,()=>`x = ${lit};`][Math.floor(random()*10)]!();
 return `var x, o = {}, a, b, g = () => {};\n${body}\n`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyFunctionStaticSemanticsFailure(file)!==null||earlyControlFlowStaticSemanticsFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('object literal early errors agree with Node in literal and pattern positions',()=>{
 const random=rng(0x0b1e);
 const sources:string[]=[];
 for(let index=0;index<400;index++)sources.push(program(random));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(60);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(60);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep nesting reaches the pattern position at the top',()=>{
 let inner='{ a = 1, __proto__: o, __proto__: o }';
 for(let depth=0;depth<1500;depth++)inner=depth%2?`{ k: ${inner} }`:`[${inner}]`;
 expect(ours(`var a, o; (${inner} = o);`)).toBe(false);
 expect(ours(`var a, o; (${inner});`)).toBe(true);
 expect(ours(`var a, o; ({ k = ${inner} } = o);`)).toBe(true);
});

test('__proto__: definition keeps an empty function name like Node',async()=>{
 const source=`const f = function () {};
const names = (o) => [Object.getPrototypeOf(o).name, Object.getOwnPropertyNames(o).join(',')];
console.log(JSON.stringify([
  names({ __proto__: function () {} }), names({ '__proto__': class {} }), names({ __proto__: () => {} }), names({ __proto__: async function* () {} }),
  [{ ['__proto__']: function () {} }.__proto__.name], [{ __proto__() {} }.__proto__.name], [{ __proto__: f }.name, Object.getPrototypeOf({ __proto__: f }).name],
  [{ __proto__: function named() {} }.constructor === Object, Object.getPrototypeOf({ __proto__: function named() {} }).name],
  [({ k: { __proto__: function () {} } }).k.__proto__.name, Object.getOwnPropertyNames({ __proto__: function () {}, __proto__() {} }).join(',')],
]));
`;
 const root=await mkdtemp(join(tmpdir(),'tsc2c-proto-name-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:60000});
  expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({code:built.exitCode,diagnostics}).toEqual({code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:60000});
  expect({code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
},600000);
