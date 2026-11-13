import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* A function's return is projected per invocation: its parameters are
 * replaced by that call's actuals. A return that converts its parameters
 * (`a + b`, a template, `+=`) reads them through a conversion List, whose
 * cells a rule fills from every input that ever reached it; the projection
 * must re-run the List over the call's own operands, or every call's value
 * is the product of all calls' actuals. Each return form, definition kind and
 * second call (another literal, an unknown string, before or after) is one
 * sloppy Script whose first call's result is evaluated; the analysis must
 * find exactly the source Node 26 evaluates. One function whose return
 * nests 256 conversions, called with three actuals, is the stress. */

const returns:Record<string,string>={
 plus:'return a + b;',
 template:'return `${a}${b}`;',
 suffix:'return a + ";";',
 nested:'return (a + "") + b;',
 local:'const r = a + b; return r;',
 compound:'let r = a; r += b; return r;',
};
const definitions:Record<string,(body:string)=>string>={
 declaration:body=>`function f(a, b) { ${body} }`,
 arrow:body=>`const f = (a, b) => { ${body} };`,
};
const seconds:Record<string,string>={literal:'f("3", "4;");',unknown:'f(String(Math.random()), "x;");'};

const programs:{name:string;source:string}[]=[];
for(const [form,body] of Object.entries(returns))for(const [kind,define] of Object.entries(definitions))
 for(const [second,call] of Object.entries(seconds))for(const order of ['after','before'])
  programs.push({name:`${form}/${kind}/${second}/${order}`,source:`${define(body)}\n${order==='before'?call:''}\nvar first = f("1", "2;");\n${order==='after'?call:''}\neval(first);\n`});
let nested='a';for(let index=0;index<256;index++)nested=index%2?`(${nested} + "")`:`\`\${${nested}}\``;
programs.push({name:'stress',source:`function f(a) { return ${nested}; }\nvar first = f("1;");\nf("2;");\nf(String(Math.random()));\neval(first);\n`});

test('a converting return is projected per invocation',()=>{
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(programs.map(program=>program.source.replaceAll('eval(','observe(')))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 expect(observed.at(-1)).toEqual(['1;']);
 const failures=programs.flatMap((program,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:program.source}]);
  const sources=[...new Set(graph.directEvalSources.map(record=>record.source))].sort(),node=[...new Set(observed[index]!)].sort();
  return graph.error===null&&JSON.stringify(sources)===JSON.stringify(node)?[]:[{name:program.name,error:graph.error,sources,node}];
 });
 expect(failures).toEqual([]);
},300_000);
