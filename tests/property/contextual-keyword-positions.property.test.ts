import {expect,test} from 'bun:test';
import ts from 'typescript';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyPrivateStaticSemanticsFailure} from '../../src/emit/private-names';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* `yield` and `await` are identifiers or keywords by grammar parameter:
 * ArrowParameters inherit the enclosing [Yield]/[Await] while a ConciseBody
 * resets them, a class static block sets [+Await], a non-generator
 * FunctionExpression's own name is parsed with [~Yield], and a LabelIdentifier
 * is an Identifier (strict mode reserved words are early errors). An
 * IdentifierReference `arguments` is an early error in a class static block
 * or field initializer unless a non-arrow function encloses it, and a nested
 * class contributes its computed keys, initializers and heritage. Generated
 * programs place the three names at nested parameter, body, label, class
 * and declaration positions inside every function kind and compare our early
 * verdict with Node's parser; one deep arrow-parameter nest checks the ascent. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const names=['yield','await','arguments'];
function use(random:()=>number,name:string):string{
 switch(Math.floor(random()*14)){
  case 0:return `(x = ${name}) => 0;`;
  case 1:return `((y = (x = ${name}) => 0) => 1);`;
  case 2:return `(() => ${name})();`;
  case 3:return `${name}: 1;`;
  case 4:return `var ${name};`;
  case 5:return `(function ${name}() {});`;
  case 6:return `(class { [${name}]() {} });`;
  case 7:return `(class { x = ${name}; });`;
  case 8:return `(class { [${name}] = 1; });`;
  case 9:return `(class { static { ${name}; } });`;
  case 10:return `(class extends (${name}, Object) {});`;
  case 11:return `(function () { ${name}; });`;
  case 12:return `({ ${name} }); o.${name};`;
  default:return `function h(x = ${name}) {}`;
 }
}
function context(random:()=>number,inner:string):string{
 switch(Math.floor(random()*9)){
  case 0:return `function f() { ${inner} }`;
  case 1:return `function* f() { ${inner} }`;
  case 2:return `async function f() { ${inner} }`;
  case 3:return `var f = async () => { ${inner} };`;
  case 4:return `class C { static { ${inner} } }`;
  case 5:return `var o = { *m() { ${inner} } };`;
  case 6:return `class C { x = (() => { ${inner} })(); }`;
  case 7:return `class C { static m() { ${inner} } }`;
  default:return `var f = () => { ${inner} };`;
 }
}
function program(random:()=>number,strict:boolean):string{
 return `${strict?'"use strict";\n':''}var x, o = {};\n${context(random,use(random,names[Math.floor(random()*names.length)]!))}\n`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyControlFlowStaticSemanticsFailure(file)!==null||earlyFunctionStaticSemanticsFailure(file)!==null||earlyPrivateStaticSemanticsFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync([NODE,'-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('yield, await and arguments positions are early errors exactly when Node rejects them',()=>{
 const random=rng(0xc0de);
 const sources:string[]=[];
 for(let index=0;index<400;index++)sources.push(program(random,index%3===0));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(80);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(80);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep arrow-parameter nest reaches the enclosing generator or static block',()=>{
 let yieldNest='yield';
 let awaitNest='await';
 for(let depth=0;depth<600;depth++){yieldNest=`(p${depth} = ${yieldNest}) => 0`;awaitNest=`(p${depth} = ${awaitNest}) => 0`;}
 const sources=[`function* g() { (${yieldNest}); }`,`function g() { (${yieldNest}); }`,`class C { static { (${awaitNest}); } }`,`function g() { (${awaitNest}); }`,`async function g() { (${awaitNest}); }`];
 const expected=nodeVerdicts(sources);
 expect(expected).toEqual([true,false,true,false,true]);
 for(const [index,source] of sources.entries())expect({index,early:ours(source)}).toEqual({index,early:expected[index]!});
});
