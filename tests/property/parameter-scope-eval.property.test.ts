import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';

/* A direct eval inside a parameter initializer runs with the parameters in a
 * declarative Environment Record between the eval and its variable
 * environment (FunctionDeclarationInstantiation steps 19-20, 27-28), so
 * EvalDeclarationInstantiation step 3.d throws a SyntaxError for a var that
 * names any parameter, while a fresh var lands in the function environment
 * and stays visible to the body. A direct eval in the body shares the body's
 * variable environment and may redeclare a parameter. Generated functions over
 * declaration, expression, arrow, method and generator shapes compare outputs
 * with Node; one wide parameter list is the stress input. `arguments` is left
 * out: V8 accepts `var arguments` there where the specification and JSC throw. */

function rng(seed:number):()=>number{
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
const names=['a','b','c','d','k'];
function block(random:()=>number,index:number):string{
 const declared=names[Math.floor(random()*names.length)]!;
 const evalSource=`eval("var ${declared} = 42")`;
 const where=Math.floor(random()*3);
 const parameters=where===0?`a = ${evalSource}, b, c`:where===1?`a, b = ${evalSource}, c`:`a, b, c = ${evalSource}`;
 // A body eval declaring a parameter's name must shadow the parameter in the
 // body's separate variable environment (step 28); statically bound reads do
 // not see that shadow yet, an open item, so body evals use other names here.
 const bodyEval=random()<0.3?`eval("var ${names[3+Math.floor(random()*2)]!} = 'body'");`:'';
 const body=`var k = 'k'; ${bodyEval} return [typeof a, a, typeof b, b, typeof c, c, typeof d, (() => { try { return d; } catch (error) { return error.name; } })(), k];`;
 const shape=Math.floor(random()*5);
 const fn=`fn${index}`;
 const definition=shape===0?`function ${fn}(${parameters}) { ${body} }`:shape===1?`var ${fn} = function (${parameters}) { ${body} };`:shape===2?`var ${fn} = (${parameters}) => { ${body} };`:shape===3?`var ${fn} = { m(${parameters}) { ${body} } }.m;`:`var gen${index} = function* (${parameters}) { ${body} }; var ${fn} = (...args) => gen${index}(...args).next();`;
 const call=`${fn}(${['','1','1, 2','1, 2, 3'][Math.floor(random()*4)]!})`;
 return `{ ${definition}\n try { out.push(${JSON.stringify(index+':')} + JSON.stringify(${call})); } catch (error) { out.push(${JSON.stringify(index+':')} + error.constructor.name); } }\n`;
}
function program(random:()=>number,count:number):string{
 let text='const out = [];\n';
 for(let index=0;index<count;index++)text+=block(random,index);
 text+=`var obj = { async method(a = eval("var a = 42")) { out.push('async body'); } };
obj.method().then(() => out.push('resolved'), error => out.push('rejected ' + error.constructor.name)).then(() => console.log(out.join('\\n')));
`;
 return text;
}
function stressProgram(width:number):string{
 const list=(last:string)=>Array.from({length:width},(_,index)=>index===width-1?`p${index} = ${last}`:`p${index}`).join(', ');
 return `const out = [];
function conflict(${list('eval("var p0 = 1")')}) { return p0; }
function fresh(${list('eval("var q = 1")')}) { return q + p0; }
try { out.push(String(conflict(7))); } catch (error) { out.push(error.constructor.name); }
try { out.push(String(fresh(7))); } catch (error) { out.push(error.constructor.name); }
console.log(out.join('\\n'));
`;
}

async function compare(name:string,source:string):Promise<void>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-parameter-eval-'));
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

test('direct eval var declarations in parameter and body scopes behave like Node',async()=>{
 // Distinct names per block: one shared `fn` binding with 40 definitions exhausts the source analysis memory budget.
 await compare('generated',program(rng(0xe7a1),24));
},600000);

test('one wide parameter list with an eval in its last initializer',async()=>{
 await compare('stress',stressProgram(300));
},600000);
