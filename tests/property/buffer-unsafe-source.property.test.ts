import {nodeReferenceSync} from './node-reference';
import {expect,test}from'bun:test';
import ts from'typescript';
import {staticStringExpressionTexts}from'../../src/module-specifiers';
import {compile}from'../../src/compile';
import{mkdtemp,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join}from'node:path';

function expression(source:string):ts.Expression{
 const file=ts.createSourceFile('/tmp/buffer-source-partition.ts','const query='+source+';',ts.ScriptTarget.ESNext,true);
 return (file.statements[0]as ts.VariableStatement).declarationList.declarations[0]!.initializer!;
}
const allocations=['Buffer.allocUnsafe(3)','Buffer.allocUnsafeSlow(3)'];
const transforms=[(value:string)=>value,(value:string)=>`Buffer.from(${value})`,(value:string)=>`Buffer.concat([Buffer.from('41','hex'),${value}])`,(value:string)=>`${value}.slice(0,1)`,(value:string)=>`${value}.subarray(0,1)`,(value:string)=>`${value}.valueOf()`];
test('unknown allocation bytes remain unknown across shared Buffer source projections',()=>{
 for(const allocation of allocations)for(const transform of transforms)for(const encoding of ['hex','base64','utf8']){
  const source=transform(allocation)+'.toString('+JSON.stringify(encoding)+')';expect({source,proof:staticStringExpressionTexts(expression(source))}).toEqual({source,proof:[]});
 }
 for(const source of ["Buffer.alloc(3).toString('hex')","Buffer.alloc(3,65).toString('utf8')","Buffer.concat([Buffer.alloc(1),Buffer.from('41','hex')]).toString('hex')"]){
  const node=nodeReferenceSync(['node','-e','require("node:fs").writeSync(1,'+source+')'],{stdout:'pipe',stderr:'pipe'});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(staticStringExpressionTexts(expression(source))).toContain(node.stdout.toString());
 }
});

test('unsafe-derived unknown requires use the stable finite-AOT diagnostic',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-buffer-unsafe-source-'));
 try{for(const allocation of allocations){
  const entry=join(root,'main.ts');await writeFile(entry,`const owner=require('./value_'+${allocation}.toString('hex'));console.log(owner);`);const diagnostics:string[]=[],r=await compile({entry,output:entry+'-program',noGc:true,diagnosticWriter:m=>diagnostics.push(m)});expect(r.exitCode).toBe(3);expect(diagnostics.join('')).toContain('dynamic require(variable) needs a finite AOT specifier proof or --dynamic-require-manifest allow-list');
 }}finally{await rm(root,{recursive:true,force:true})}
});
