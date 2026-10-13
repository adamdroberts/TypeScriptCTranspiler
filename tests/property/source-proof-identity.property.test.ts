import {expect,test} from 'bun:test';
import ts from 'typescript';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {sourceFileCallTexts} from '../../src/source-file-expression-proof';

function query(source:string,goal:'script'|'module'='module'):{call:ts.CallExpression;parsed:ts.SourceFile}{
 const parsed=createEcmaSourceFile('/tmp/source-proof-identity.ts',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.TS,goal),pending:ts.Node[]=[parsed];let call:ts.CallExpression|undefined;
 while(pending.length){const node=pending.pop()!;if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='query'&&node.initializer&&ts.isCallExpression(node.initializer))call=node.initializer;node.forEachChild(child=>{pending.push(child)});}
 if(!call)throw new Error('missing query');return {call,parsed};
}
const prefix="import {format} from 'node:util';const key=Symbol('key');function choose({[key]:value='17;'}={}){return format('%s',value)}";
test('source proof clones retain canonical identity across computed key and call projections',()=>{
 for(const actual of ["{}","{[key]:'19;'}"]){const source=prefix+'const query=choose('+actual+');',input=query(source),proof=sourceFileCallTexts(input.call);expect(proof).not.toBeNull();expect(proof).toContain(actual==='{}'?'17;':'19;');expect(sourceFileCallTexts(input.call)).toEqual(proof);}
 const first=query("function choose(){return '23;'}const query=choose();"),second=query("function choose(){return '29;'}const query=choose();");expect(first.parsed.fileName).toBe(second.parsed.fileName);expect(sourceFileCallTexts(first.call)).toEqual(['23;']);expect(sourceFileCallTexts(second.call)).toEqual(['29;']);
 for(const goal of ['script','module'] as const){const input=query("const owner={source:'31;'};function choose(){return owner.source}const query=choose();",goal);expect(sourceFileCallTexts(input.call)).toEqual(['31;']);}
 const opaque=query(prefix+"const query=choose({[key]:opaque()});");expect(sourceFileCallTexts(opaque.call)).toBeNull();
});
