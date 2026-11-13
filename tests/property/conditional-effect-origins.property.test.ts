import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* An opaque effect inside a function body takes the execution origins of
 * the invocations that perform it. A conversion of an operand the analysis
 * cannot resolve (ToPrimitive, for `+`, a template, `+=`, a numeric
 * operator or String(), may run unknown code) happens only in an invocation
 * whose own operand is unresolved, and an opaque call (a callee such as
 * `holder.f` that a late effect may replace) only in an invocation whose
 * own callee is unknown: when unknown code calls a
 * global function late (the toJSON JSON.stringify may find on an eval
 * result) with an unknown argument, the conversion's effect belongs to that
 * call, not to an earlier call whose argument is a known object, so the
 * earlier call's result keeps its exact value. Each conversion form, callee
 * form and late caller is one sloppy Script whose first call's result is
 * evaluated; the analysis must find exactly the source Node 26 evaluates.
 * Known code that a conversion really runs (an object's own toString that
 * mutates the object a later call reads) must still be seen. One Script of
 * 128 blocks, each with its own function and conversion, is the stress.
 * Unknown code that runs inside a function (the wrapper's `holder.f`, a
 * replaced `String`) makes every function its escape graph calls a repeated
 * activation, in which reaching definitions are not resolved per
 * invocation: `+=` then also sees the value before it (sound, not exact),
 * so the compound form under the wrapper is a soundness partition and the
 * stress, whose functions are all global, leaves out String(). */

const forms:Record<string,string>={
 plus:'return o.text + o.extra;',
 template:'return `${o.text}${o.extra}`;',
 compound:'let r = o.text; r += o.extra; return r;',
 numeric:'return (o.text * 1) + o.extra;',
 string:'return String(o.text) + o.extra;',
};
const callees:Record<string,(body:string)=>string>={
 declaration:body=>`function f(o) { ${body} }`,
 arrow:body=>`var f = (o) => { ${body} };`,
 method:body=>`var holder = { f(o) { ${body} } }; var f = holder.f;`,
 wrapper:body=>`var holder = { f(o) { ${body} } }; var f = (o) => holder.f(o);`,
};
const lates:Record<string,string>={
 json:'JSON.stringify(out);',
 replacer:'JSON.stringify(out, (key, value) => value);',
};

const programs:{name:string;source:string;exact:boolean}[]=[];
for(const [form,body] of Object.entries(forms))for(const [callee,define] of Object.entries(callees))for(const [late,call] of Object.entries(lates))
 programs.push({name:`${form}/${callee}/${late}`,exact:!(form==='compound'&&callee==='wrapper'),source:`var out = [];\nvar top = { text: "1", extra: " + 2" };\n${define(body)}\nvar first = f(top);\nout.push(eval(first));\n${call}\n`});
for(const [form,body] of Object.entries(forms))
 programs.push({name:`${form}/known-mutation`,exact:false,source:`var out = [];\nvar top = { text: "1", extra: " + 2" };\nvar trap = { toString() { top.extra = " + 3"; return "x"; } };\nfunction f(o) { ${body} }\nf({ text: trap, extra: "" });\nvar first = f(top);\nout.push(eval(first));\nJSON.stringify(out);\n`});
let stress='var out = [];\n';
const formNames=Object.keys(forms).filter(name=>name!=='string');
for(let index=0;index<128;index++)stress+=`{ const top${index} = { text: "${index}", extra: " + ${index+1}" }; function f${index}(o) { ${forms[formNames[index%formNames.length]!]!} } out.push(eval(f${index}(top${index}))); }\n`;
programs.push({name:'stress',exact:true,source:stress+'JSON.stringify(out);\n'});

test('a conversion effect takes the origins of the invocations that perform it',()=>{
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>{seen.push(value);return value;}});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(programs.map(program=>program.source.replaceAll('eval(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed[0]).toEqual(['1 + 2']);
 expect(observed.at(-2)).toEqual(['1 + 3']);
 expect(observed.at(-1)!.length).toBe(128);
 const failures=programs.flatMap((program,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:program.source}]);
  const sources=[...new Set(graph.directEvalSources.map(record=>record.source))].sort(),node=[...new Set(observed[index]!)].sort();
  // Every finite answer must contain Node's sources; the precision
  // partitions must find exactly them.
  const sound=graph.error!==null||node.every(source=>sources.includes(source));
  const precise=graph.error===null&&JSON.stringify(sources)===JSON.stringify(node);
  return sound&&(precise||!program.exact)?[]:[{name:program.name,error:graph.error,sources,node}];
 });
 expect(failures).toEqual([]);
},600_000);
