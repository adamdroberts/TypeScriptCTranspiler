import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';

// Every top-level unknown call of a Script shares one escape graph: the
// callables the global object and global lexicals reach run in one synthetic
// activation whose origins are every escape point's. A source write between
// two points is therefore seen by a callable a later point invokes, whatever
// the first point's guard or handler, and a value read before every point
// keeps its exact source. (owner-field-effects-source holds the 512-wide
// stress over this graph.)
const points:Record<string,string>={
 none:'',
 plain:'opaque();',
 guarded:'if(Math.random()<0.5)opaque();',
 caught:'try{opaque()}catch{}',
};
// How unknown code reaches the callback that copies or rewrites block state.
const reaches:Record<string,(body:string)=>string>={
 global:body=>`globalThis.f=function(){${body}};`,
 lexical:body=>`G=function(){${body}};`,
 getter:body=>`globalThis.o={get v(){${body};return 1}};`,
};
function sources(source:string):string[]|null{
 const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:'var G;'+source}]);
 return graph.error===null?graph.directEvalSources.map(entry=>entry.source).sort():null;
}
test('top-level escape points share one graph that never orders a callable by the first point',()=>{
 for(const [firstName,first] of Object.entries(points))for(const [secondName,second] of Object.entries(points))for(const [reachName,reach] of Object.entries(reaches)){
  const label={firstName,secondName,reachName};
  // A callable the second point may run copies the state written after the first.
  const copied=sources(`{let s="1;",seen="0;";${reach('seen=s')}${first}s="2;";${second}eval(seen);}`);
  const possible=second?['0;','2;']:['0;'];
  expect({...label,sound:copied===null||possible.every(text=>copied.includes(text))}).toEqual({...label,sound:true});
  // A value saved before every point keeps its source; a later read sees the rewrite.
  expect({...label,saved:sources(`{let s="1;";${reach('s="2;"')}const saved=s;${first}${second}eval(saved);}`)}).toEqual({...label,saved:['1;']});
  const later=sources(`{let s="1;";${reach('s="2;"')}${first}${second}eval(s);}`);
  const after=first||second?['1;','2;']:['1;'];
  expect({...label,sound:later===null||after.every(text=>later.includes(text))}).toEqual({...label,sound:true});
 }
},300_000);
