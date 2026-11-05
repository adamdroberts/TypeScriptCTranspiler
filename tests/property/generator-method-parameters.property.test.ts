import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* Generator and async generator methods (object literals, classes, static
 * and private members) bind their FormalParameters through the one
 * canonical formal plan that every source function uses, so destructuring
 * patterns, defaults that read earlier parameters, rest elements, iterator
 * closing and the TypeError for a missing iterable behave exactly as in a
 * plain function. Generated methods combine owner, kind and parameter
 * shapes and are run against Node; one deeply nested pattern is the stress
 * input. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const patterns:readonly {readonly text:string;readonly argument:string;readonly use:string}[]=[
 {text:'[a, b = a + 1, ...rest]',argument:'[1, undefined, 3, 4]',use:'a + b + rest.length'},
 {text:'[a = 1, [b, c = b * 2] = [5]]',argument:'[]',use:'a + b + c'},
 {text:'{x, y: [z] = [9], ...others}',argument:'{x: 2, w: 1}',use:'x + z + Object.keys(others).length'},
 {text:'{x = 1, y: {z = x + 1} = {}} = {}',argument:'',use:'x * 10 + z'},
 {text:'[head, ...[tail = head]]',argument:'[4]',use:'head + tail'},
 {text:'...[first = 0, second = first + 1]',argument:'',use:'first + second'},
 {text:'[closed]',argument:'closing()',use:'closed + closes'},
 {text:'{length}',argument:'"abc"',use:'length'},
];
const owners:readonly {readonly member:(name:string)=>string;readonly open:(method:string,name:string)=>string;readonly call:(name:string,args:string)=>string}[]=[
 {member:name=>name,open:method=>`const o = { ${method} };`,call:(name,args)=>`o.${name}(${args})`},
 {member:name=>name,open:method=>`class K { ${method} } const o = new K();`,call:(name,args)=>`o.${name}(${args})`},
 {member:name=>name,open:method=>`class K { static ${method} }`,call:(name,args)=>`K.${name}(${args})`},
 {member:name=>`#${name}`,open:(method,name)=>`class K { ${method} run(...args) { return this.#${name}(...args); } } const o = new K();`,call:(_name,args)=>`o.run(${args})`},
];
function program(random:()=>number,count:number):string{
 let text=`const out = [];
let closes = 0;
const closing = () => ({ [Symbol.iterator]() { return { next() { return { value: 1, done: false }; }, return() { closes += 1; return {}; } }; } });
const run = async () => {
`;
 for(let index=0;index<count;index++){
  const pattern=patterns[Math.floor(random()*patterns.length)]!;
  const owner=owners[Math.floor(random()*owners.length)]!;
  const asyncKind=random()<0.4;
  const name=`m${index}`;
  const method=`${asyncKind?'async ':''}*${owner.member(name)}(${pattern.text}) { yield ${pattern.use}; }`;
  const open=owner.open(method,name);
  const call=owner.call(name,pattern.argument);
  text+=`{ ${open}\n  try { const values = []; ${asyncKind?`for await (const v of ${call}) values.push(v);`:`for (const v of ${call}) values.push(v);`} out.push(${JSON.stringify(name)} + ':' + values.join(',')); } catch (error) { out.push(${JSON.stringify(name)} + ':' + error.constructor.name); }\n`;
  if(random()<0.3)text+=`  try { const values = []; ${asyncKind?`for await (const v of ${owner.call(name,'')}) values.push(v);`:`for (const v of ${owner.call(name,'')}) values.push(v);`} out.push(${JSON.stringify(name)} + '!:' + values.join(',')); } catch (error) { out.push(${JSON.stringify(name)} + '!:' + error.constructor.name); }\n`;
  text+='}\n';
 }
 return text+`  console.log(out.join('\\n'), closes);
};
run();
`;
}
function stressProgram(depth:number):string{
 let pattern='leaf',argument='7';
 for(let level=0;level<depth;level++){
  if(level%2){pattern=`[${pattern}]`;argument=`[${argument}]`;}
  else{pattern=`{k${level}: ${pattern}}`;argument=`{k${level}: ${argument}}`;}
 }
 return `class K { static *deep(${pattern}) { yield leaf; } }\nconsole.log([...K.deep(${argument})][0]);\n`;
}
async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-generator-method-'));
 try{
  const entry=join(root,'main.cjs');await writeFile(entry,source);
  const node=nodeReferenceSync(['node',entry],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:node.exitCode,stderr:node.stderr.toString()}).toEqual({name,code:0,stderr:''});
  const diagnostics:string[]=[],output=join(root,'program');
  const built=await compile({entry,output,buildDir:join(root,'build'),diagnosticWriter:x=>diagnostics.push(x)});
  expect({name,code:built.exitCode,diagnostics}).toEqual({name,code:0,diagnostics:[]});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});
  expect({name,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({name,code:0,stderr:'',stdout:node.stdout.toString()});
 }finally{await rm(root,{recursive:true,force:true});}
}

test('generated generator methods bind destructured parameters like Node',async()=>{
 await compare('generated',program(rng(0x6e4d),40));
},600000);

test('one deeply nested parameter pattern in a static generator method',async()=>{
 await compare('stress',stressProgram(60));
},600000);
