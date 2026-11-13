import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* ToObject of a Boolean, Number, BigInt or Symbol is a wrapper with no own
 * properties, so a native that enumerates a receiver's keys (Array.prototype
 * join or keys, a computed read with an unknown key) sees only the keys of the
 * kind's prototype chain and runs user code only through accessors there. A
 * primitive receiver, even one merged with an array (a generator's yielded
 * primitive beside its returned array), must therefore not count as unknown
 * code: that would let every later global binding, `eval` included, be
 * overwritten. Each receiver kind, consumer and prototype hook is one sloppy
 * Script; without a hook the analysis must find exactly the eval sources Node
 * 26 observes, and with a getter on the prototype at least those. 256
 * successive merged joins, each followed by a direct eval of a global the
 * join would let unknown code rewrite, are the stress. */

const kinds:Record<string,{value:string;prototype:string}>={
 number:{value:'5',prototype:'Number.prototype'},
 boolean:{value:'true',prototype:'Boolean.prototype'},
 bigint:{value:'5n',prototype:'BigInt.prototype'},
 symbol:{value:'Symbol("s")',prototype:'Symbol.prototype'},
 unknownNumber:{value:'Math.random()',prototype:'Number.prototype'},
 unknownBoolean:{value:'(Math.random() < 2)',prototype:'Boolean.prototype'},
};
const consumers:Record<string,(value:string)=>string>={
 join:value=>`Array.prototype.join.call(${value}, "|");`,
 merged:value=>`function* g() { yield ${value}; return ["a"]; } var o = g(); o.next(); o.next().value.join("|");`,
 keys:value=>`[...Array.prototype.keys.call(${value})];`,
 computed:value=>`(${value})[String(Math.random())];`,
};
const hooks:Record<string,(prototype:string)=>string>={
 none:()=>'',
 indexGetter:prototype=>`${prototype}.length = 1; Object.defineProperty(${prototype}, "0", {get() { hit = "2;"; return "x"; }, configurable: true});`,
};

const programs:{name:string;exact:boolean;source:string}[]=[];
for(const [kind,{value,prototype}] of Object.entries(kinds))for(const [consumer,use] of Object.entries(consumers))for(const [hook,install] of Object.entries(hooks))
 programs.push({name:`${kind}/${consumer}/${hook}`,exact:hook==='none',source:`var hit = "1;";\n${install(prototype)}\n${use(value)}\neval(hit);\neval("3;");\n`});
programs.push({name:'stress',exact:true,source:`function* g() { yield 0; return ["a"]; }\nvar hit;\n`+
 Array.from({length:256},(_,index)=>`hit = "${index};"; { const o = g(); o.next(); o.next().value.join("|"); } eval(hit);`).join('\n')+'\n'});

test('a primitive receiver\'s key domain is its prototype chain\'s',()=>{
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(programs.map(program=>program.source.replaceAll('eval(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed.at(-1)!.length).toBe(256);
 const failures=programs.flatMap((program,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:program.source}]);
  const sources=[...new Set(graph.directEvalSources.map(record=>record.source))].sort(),node=[...new Set(observed[index]!)].sort();
  const sound=graph.error===null&&node.every(source=>sources.includes(source));
  return sound&&(!program.exact||JSON.stringify(sources)===JSON.stringify(node))?[]:[{name:program.name,error:graph.error,sources,node}];
 });
 expect(failures).toEqual([]);
},300_000);
