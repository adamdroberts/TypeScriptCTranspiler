import {expect,test} from 'bun:test';
import ts from 'typescript';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyControlFlowFailure} from '../../src/control-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {nodeReferenceSync} from './node-reference';

/* ImportCall takes one specifier and an optional options argument, each
 * optionally followed by a trailing comma, and never a spread argument;
 * any other argument list is an early SyntaxError. Separately, an async
 * arrow head parses its parameters with [+Await], so `await` as a binding
 * identifier anywhere inside them (a nested arrow's parameters included) is
 * an early SyntaxError while a plain arrow's parameters admit it in script
 * code. Generated sources compare our verdict with Node's parser; one
 * import call sits under deeply nested arrow parameters. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const elements=['"./a.js"','x','...y','{}','(1, 2)','x = 1'];
function importCall(random:()=>number):string{
 const count=Math.floor(random()*5);
 const args=Array.from({length:count},()=>elements[Math.floor(random()*elements.length)]!);
 const trailing=count>0&&random()<0.3?',':'';
 return `import(${args.join(', ')}${trailing})`;
}
const contexts=[(c:string)=>`${c};`,(c:string)=>`let f = () => { ${c}; };`,(c:string)=>`async function f() { return ${c}; }`,(c:string)=>`function* f() { yield ${c}; }`,(c:string)=>`if (x) ${c}; else { ${c}; }`,(c:string)=>`class C { m() { return ${c}; } }`];
function importSource(random:()=>number):string{
 return `var x, y = [];\n${contexts[Math.floor(random()*contexts.length)]!(importCall(random))}\n`;
}
const awaitShapes=['async (a = (...await) => {}) => {};','async (a = (await) => {}) => {};','async (a = ((await) => {})) => {};','(a = (await) => {}) => {};','(a = (...await) => {}) => {};','async function f(a = (await) => {}) {}','async (a = () => await) => {};','async (a = async (await) => {}) => {};','(a = async (await) => {}) => {};','async (a = (b = await) => {}) => {};','async (await) => {};','(await) => {};','async ({await}) => {};','async ([await]) => {};','(a = async () => { (await) => {}; }) => {};','async (a = () => { (await) => {}; }) => {};'];
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyFunctionStaticSemanticsFailure(file)!==null||earlyControlFlowFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('import() argument lists are early errors exactly when Node rejects them',()=>{
 const random=rng(0x1e4d);
 const sources:string[]=[];
 for(let index=0;index<300;index++)sources.push(importSource(random));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(60);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(60);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('await inside async arrow parameters is an early error exactly when Node rejects it',()=>{
 const expected=nodeVerdicts(awaitShapes);
 expect(expected.filter(Boolean).length).toBeGreaterThan(5);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(3);
 for(const [index,source] of awaitShapes.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one import call under deeply nested arrow parameters keeps its arity verdict',()=>{
 let inner='import()',valid='import("./a.js", {})';
 for(let depth=0;depth<400;depth++){inner=`(a = ${inner}) => {}`;valid=`(a = ${valid}) => {}`;}
 expect(ours(`${inner};`)).toBe(true);
 expect(ours(`${valid};`)).toBe(false);
});
