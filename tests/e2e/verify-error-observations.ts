import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {discoverE2eCaseManifest} from './case-manifest';

// Select actual exception-object observations through their source tree.
// File names and fixture inventory size do not establish the error contract.
function observesErrorKind(source:ts.SourceFile):boolean {
 const pending:ts.Node[]=[source];
 while(pending.length){
  const node=pending.pop()!;node.forEachChild(child=>{pending.push(child)});
  if(!ts.isConditionalExpression(node)||!ts.isBinaryExpression(node.condition)||node.condition.operatorToken.kind!==ts.SyntaxKind.InstanceOfKeyword)continue;
  const {left,right}=node.condition;
  if(!ts.isIdentifier(left)||!ts.isIdentifier(right)||right.text!=='Error')continue;
  if(ts.isPropertyAccessExpression(node.whenTrue)&&ts.isIdentifier(node.whenTrue.expression)&&node.whenTrue.expression.text===left.text&&node.whenTrue.name.text==='name'&&ts.isTypeOfExpression(node.whenFalse)&&ts.isIdentifier(node.whenFalse.expression)&&node.whenFalse.expression.text===left.text)return true;
 }
 return false;
}
const oracle=String.raw`const fs=require('node:fs'),vm=require('node:vm');const code=fs.readFileSync(0,'utf8');const render=value=>value!==null&&typeof value==='object'?JSON.stringify(value):String(value);const console={log:(...values)=>fs.writeSync(1,values.map(render).join(' ')+'\n')};vm.runInNewContext(code,{console},{filename:'exact-error-observation.js',timeout:3000});`;
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const results=[];
for(const record of await discoverE2eCaseManifest()){
 if(record.generatedSource!==undefined)continue;
 const source=await fs.readFile(record.entry,'utf8'),parsed=ts.createSourceFile(record.entry,source,ts.ScriptTarget.ESNext,true);
 if(!observesErrorKind(parsed))continue;
 if(ts.isExternalModule(parsed))throw new Error('Error observation requires a separate Module oracle: '+record.name);
 const program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.None}}).outputText;
 const observed=Bun.spawnSync(['node','-e',oracle],{stdin:Buffer.from(program),stdout:'pipe',stderr:'pipe',timeout:10_000});
 const expected=await fs.readFile(path.join(path.dirname(record.entry),'expected.stdout'),'utf8');
 const pass=observed.exitCode===0&&observed.stderr.length===0&&observed.stdout.toString()===expected;
 const result={case:record.name,sourceSha256:sha(source),programSha256:sha(program),expectedSha256:sha(expected),pass,exitCode:observed.exitCode,stderr:observed.stderr.toString(),stdout:observed.stdout.toString(),expected};
 results.push(result);if(!pass)console.error(JSON.stringify(result));
}
if(!results.length)throw new Error('No actual Error object observations selected');
const output=process.argv.indexOf('--output');if(output>=0){const filename=process.argv[output+1];if(!filename)throw new Error('--output requires a path');await fs.writeFile(filename,JSON.stringify({oracle:'independent Node Script with explicit console value projection',nodeVersion:Bun.spawnSync(['node','--version']).stdout.toString().trim(),results},null,2)+'\n')}
if(results.some(result=>!result.pass))process.exitCode=1;else console.log('Exact source Error kind observations agree with independent Node.');
