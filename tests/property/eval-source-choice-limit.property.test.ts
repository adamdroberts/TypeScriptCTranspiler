import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildProgram} from '../../src/program';
import {sourceEvaluationInvocations} from '../../src/source-value-flow';

/* One eval site contributes at most evalSourceChoiceLimit() distinct source
 * texts (1024 by default, TSC2C_EVAL_SOURCE_CHOICES); a site enumerating
 * more fails closed as an unknown source rather than generating that many
 * eval code files. The texts come from one concatenation whose operand sets
 * multiply, so the limit is reached by a few small arrays, not by source
 * length. */

function program(width:number):string{
 const digits=Array.from({length:width},(_,index)=>JSON.stringify(String(index)));
 return `const a = [${digits.join(', ')}];
for (const x of a) for (const y of a) eval("//" + x + "," + y + "\\n1;");
const only = eval("2;");
`;
}
async function choices(source:string):Promise<(readonly string[]|null)[]>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-eval-choice-limit-'));
 try{
  const entry=join(root,'main.js');await writeFile(entry,source);
  const built=buildProgram({entry,packageRoot:process.cwd(),retainModuleFailures:true,isolatedScriptRoots:[entry],initializationEntries:[entry]});
  return sourceEvaluationInvocations(built.program,{roots:[entry]}).filter(call=>call.operation==='eval').map(call=>call.choices);
 }finally{await rm(root,{recursive:true,force:true});}
}

test('an eval site stays finite up to the choice limit and fails closed beyond it',async()=>{
 const under=await choices(program(30));
 expect(under.map(value=>value===null?null:value.length).sort()).toEqual([1,900]);
 const over=await choices(program(40));
 expect(over.map(value=>value===null?null:value.length).sort()).toEqual([1,null]);
},600000);
