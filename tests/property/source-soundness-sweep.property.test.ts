import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

// The finite eval-source proof is a superset of every source a program can
// evaluate: for each generated program, the text Node evaluates must be
// among the proven ones, or the site must be unknown (refused). Operands mix
// literals of every kind with values the analysis holds abstractly.
const operands=['"1"','""','0','-0','NaN','null','undefined','true','({})','[1,2]','(Math.random()<2)','Math.floor(Math.random()*0)','String(Math.random()<2?"p":"q")','({valueOf(){return 3},toString(){return "v"}})'];
const unary=['!','-','+','~','typeof ','void '];
const binary=['+','-','*','/','%','**','<<','>>','>>>','&','|','^','==','!=','===','!==','<','>','<=','>=','&&','||','??',','];
// Statement and binding forms over two operands A and B; each leaves v.
const statements=[
 'var v;var {x:v="d"}={x:A};','var [,v="d"]=[B,A];','var {...r}={a:A,b:B};var v=r.a;',
 'var v="s";switch(A){case 0:v="zero";break;case "1":v="one";case null:v+="n";break;default:v="d"}',
 'var v="";outer:for(const x of [A,B]){for(const y of [1,2]){if(y===2)continue outer;v+=String(x)+y;}}',
 'var v;try{v=A;throw B}catch(e){v=String(v)+String(e)}finally{v+="f"}',
 'function mk(x){return function(){return x}}var v=mk(A)();','class C{f=A;static s=B}var v=String(new C().f)+String(C.s);',
 'var o={a:A};delete o.a;var v=o.a;','var v=A;v??=B;','var v=A;v&&=B;','var v=[A][0]?.toString?.();','var a=[];a[2]=A;var v=a.join("-");',
 'var g=function*(){yield A;yield B};var v=[...g()].map(String).join();',
 'var p=new Proxy({},{get(t,k){return A}});var v=p.x;','var o={[Symbol.toPrimitive](h){return h+String(A)}};var v=`${o}`;',
 'class P{m(){return A}}class Q extends P{m(){return String(super.m())+"q"}}var v=new Q().m();',
 'function f(a){arguments[0]=B;return a}var v=f(A);','var w={k:A};var v;with(w){v=k}',
 'var proto={set a(x){this.b=x}};var o=Object.create(proto);o.a=A;var v=o.b;',
 'var x=A;var o={get g(){x=B;return 1}};o.g;var v=x;','var v=(function(a=A,b=a){return b})();','var v=JSON.stringify({a:A,b:B});',
];
const programs:string[]=[];
for(const operator of unary)for(const a of operands)programs.push(`var v=${operator}(${a});`);
for(const operator of binary)for(const a of operands)for(const b of operands)programs.push(`var v=((${a})${operator}(${b}));`);
for(const a of operands)programs.push(`var v=(${a})?"y":"n";`);
for(const form of statements)for(const a of operands)for(const b of operands.slice(0,4))programs.push(form.replaceAll('A',`(${a})`).replaceAll('B',`(${b})`));

test('the proven eval sources of every generated program include the one Node evaluates',()=>{
 const batch='const fs=require("node:fs"),vm=require("node:vm");const programs=JSON.parse(fs.readFileSync(0,"utf8"));'+
  'fs.writeSync(1,JSON.stringify(programs.map(p=>{try{const c={};vm.runInNewContext(p+";globalThis.__r=JSON.stringify(String(v));",c);return c.__r}catch{return null}})));';
 const node=nodeReferenceSync(['node','-e',batch],{stdin:Buffer.from(JSON.stringify(programs)),stdout:'pipe',stderr:'pipe',timeout:120_000});
 expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 const actual:(string|null)[]=JSON.parse(node.stdout.toString());expect(actual.length).toBe(programs.length);
 const unsound:{program:string;actual:string;found:string[]}[]=[];let proven=0;
 for(const [index,program] of programs.entries()){
  const text=actual[index];if(text===null)continue;
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:program+'eval(JSON.stringify(String(v)));'}]);
  if(graph.error!==null)continue;proven++;
  const found=graph.directEvalSources.map(entry=>entry.source);
  if(!found.includes(text))unsound.push({program,actual:text,found});
 }
 expect(unsound).toEqual([]);
 // Most programs keep a finite proof, so the check is not vacuous.
 expect(proven).toBeGreaterThan(programs.length/2);
},600_000);
