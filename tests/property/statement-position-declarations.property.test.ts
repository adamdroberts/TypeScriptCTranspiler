import {expect,test} from 'bun:test';
import ts from 'typescript';
import {earlyControlFlowStaticSemanticsFailure} from '../../src/control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from '../../src/function-static-semantics';
import {earlyPrivateStaticSemanticsFailure} from '../../src/emit/private-names';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {nodeReferenceSync} from './node-reference';

const NODE=process.env.TSC2C_NODE_REFERENCE??'node';

/* A Declaration is not a Statement: as the body of an if, iteration, with or
 * labelled statement only Annex B admits a plain FunctionDeclaration in
 * non-strict code (B.3.2 labelled items, B.3.3 if bodies), and never where
 * IsLabelledFunction(Statement) applies. Alongside: the `for ( [lookahead ≠
 * async of] ...` restriction, private names as object literal member names,
 * and `yield`/`await` as a FunctionExpression's own name ([~Yield] unless a
 * generator, [~Await] unless async). Generated programs compare our early
 * verdict with Node's parser; one deep label chain and one deep if chain
 * check the ascent. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const declarations=['function f() {}','function* f() {}','async function f() {}','async function* f() {}','class f {}','let f;','const f = 1;','var f;',';','f = 1;'];
const positions=[(d:string)=>`if (0) ${d}`,(d:string)=>`if (0) ; else ${d}`,(d:string)=>`while (0) ${d}`,(d:string)=>`do ${d} while (0)`,(d:string)=>`for (;;) ${d}`,(d:string)=>`for (x in o) ${d}`,(d:string)=>`for (x of []) ${d}`,(d:string)=>`with (o) ${d}`,(d:string)=>d,(d:string)=>`{ ${d} }`];
function statement(random:()=>number):string{
 let item=declarations[Math.floor(random()*declarations.length)]!;
 const labels=Math.floor(random()*3);
 for(let index=0;index<labels;index++)item=`l${index}: ${item}`;
 return positions[Math.floor(random()*positions.length)]!(item);
}
function program(random:()=>number,strict:boolean):string{
 return `${strict?'"use strict";\n':''}var x, o = {};\n${statement(random)}\n`;
}
const fixed=[
 'for (async of [1]);','for ((async) of [1]);','for (async in o);','for (async of => 1;;);','for (\\u0061sync of [1]);','async function q(){ for await (async of [1]); }','for (async.x of [1]);','for (async[0] of [1]);','for (async() of [1]);',
 '({ #m() {} });','({ get #m() {} });','({ set #m(v) {} });','({ async #m() {} });','({ *#m() {} });','({ #m: 1 });','class C { #m; n() { ({ #m() {} }); } }','class C { #m; n() { ({ k() { return this.#m; } }); } }','class C { static { ({ #m() {} }); } }',
 'function* g() { (function yield() {}); }','function* g() { (function* yield() {}); }','function* g() { (async function yield() {}); }','function* g() { (class yield {}); }','function* g() { function yield() {} }','function* g() { ({ m: function yield() {} }); }','"use strict"; function* g() { (function yield() {}); }',
 'async function g() { (function await() {}); }','async function g() { (async function await() {}); }','async function g() { (function* await() {}); }','async function g() { function await() {} }','async function g() { (class await {}); }',
 'label: function f() {} label: function f() {}','{ label: function f() {} }','label: label2: function f() {}','if (0) ; else label: function f() {}',
];
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

test('declarations in Statement position are early errors exactly when Node rejects them',()=>{
 const random=rng(0x5741);
 const sources:string[]=[...fixed];
 for(let index=0;index<320;index++)sources.push(program(random,index%2===0));
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(80);
 expect(expected.filter(value=>!value).length).toBeGreaterThan(80);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep label chain and one deep if chain reach the declaration at the bottom',()=>{
 let labelled='function f() {}';
 for(let depth=0;depth<1200;depth++)labelled=`l${depth}: ${labelled}`;
 let nested='function f() {}';
 for(let depth=0;depth<1200;depth++)nested=`if (0) ${nested}`;
 const sources=[labelled,`"use strict"; ${labelled}`,`while (0) ${labelled}`,nested,`"use strict"; ${nested}`,`while (0) ${nested}`];
 const expected=nodeVerdicts(sources);
 expect(expected).toEqual([false,true,true,false,true,false]);
 for(const [index,source] of sources.entries())expect({index,early:ours(source)}).toEqual({index,early:expected[index]!});
});
