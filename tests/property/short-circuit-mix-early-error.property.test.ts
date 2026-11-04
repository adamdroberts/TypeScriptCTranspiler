import {expect,test} from 'bun:test';
import ts from 'typescript';
import {earlyShortCircuitMixFailure} from '../../src/function-static-semantics';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {nodeReferenceSync} from './node-reference';

/* CoalesceExpression early error: `??` may not share an operand position
 * with `||` or `&&` unless parentheses separate them. Generated operator
 * trees compare our verdict with Node's parser, and one deep tree checks
 * the worklist. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const operators=['??','||','&&','+','==='];
function tree(random:()=>number,depth:number):string{
 if(depth===0||random()<0.3)return ['a','b','1','null','undefined','"s"'][Math.floor(random()*6)]!;
 const operator=operators[Math.floor(random()*operators.length)]!;
 const left=tree(random,depth-1),right=tree(random,depth-1);
 const wrap=(text:string)=>random()<0.5?`(${text})`:text;
 return `${wrap(left)} ${operator} ${wrap(right)}`;
}
function ours(source:string):boolean{
 const file=createEcmaSourceFile('x.js',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS,'script');
 const parse=(file as ts.SourceFile&{parseDiagnostics?:readonly ts.Diagnostic[]}).parseDiagnostics??[];
 return parse.length>0||earlyShortCircuitMixFailure(file)!==null;
}
function nodeVerdicts(sources:readonly string[]):boolean[]{
 const script='const sources=JSON.parse(require("node:fs").readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(sources.map(source=>{try{new Function(source);return false;}catch(error){return error instanceof SyntaxError;}})));';
 const node=nodeReferenceSync(['node','-e',script],{stdin:Buffer.from(JSON.stringify(sources)),stdout:'pipe',stderr:'pipe',timeout:60000});
 expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
 return JSON.parse(node.stdout.toString());
}

test('?? mixed with || or && is an early error exactly when Node rejects it',()=>{
 const random=rng(0xc0a1e5ce);
 const sources=['a ?? b || c','a || b ?? c','a ?? b && c','a && b ?? c','(a ?? b) || c','a ?? (b || c)','a || (b ?? c)','(a || b) ?? c','a ?? b ?? c','a || b && c','a ?? b + c || d'];
 for(let index=0;index<400;index++)sources.push('var a, b; a = '+tree(random,4)+';');
 const expected=nodeVerdicts(sources);
 expect(expected.filter(Boolean).length).toBeGreaterThan(20);
 for(const [index,source] of sources.entries())expect({source,early:ours(source)}).toEqual({source,early:expected[index]!});
});

test('one deep operator tree reaches the mixed pair at the bottom',()=>{
 let source='a ?? b || c';
 for(let depth=0;depth<2000;depth++)source=`(${source}) + ${depth}`;
 expect(ours('var a, b, c; a = '+source+';')).toBe(true);
 expect(ours('var a, b, c; a = '+source.replace('a ?? b || c','(a ?? b) || c')+';')).toBe(false);
});
