import {expect,test} from 'bun:test';
import ts from 'typescript';
import {createEcmaSourceFile} from '../../src/ecmascript-source';
import {sourceFileExpressionTexts} from '../../src/source-file-expression-proof';

function query(source:string,goal:'script'|'module'='module'):{call:ts.CallExpression;parsed:ts.SourceFile}{
 const parsed=createEcmaSourceFile('/tmp/source-proof-identity.ts',source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.TS,goal),pending:ts.Node[]=[parsed];let call:ts.CallExpression|undefined;
 while(pending.length){const node=pending.pop()!;if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='query'&&node.initializer&&ts.isCallExpression(node.initializer))call=node.initializer;node.forEachChild(child=>{pending.push(child)});}
 if(!call)throw new Error('missing query');return {call,parsed};
}
const prefix="import {format} from 'node:util';const key=Symbol('key');function choose({[key]:value='17;'}={}){return format('%s',value)}";
test('source proof clones retain canonical identity across computed key and call projections',()=>{
 for(const actual of ["{}","{[key]:'19;'}"]){const source=prefix+'const query=choose('+actual+');',input=query(source),proof=sourceFileExpressionTexts(input.call);expect(proof).not.toBeNull();expect(proof).toContain(actual==='{}'?'17;':'19;');expect(sourceFileExpressionTexts(input.call)).toEqual(proof);}
 const first=query("function choose(){return '23;'}const query=choose();"),second=query("function choose(){return '29;'}const query=choose();");expect(first.parsed.fileName).toBe(second.parsed.fileName);expect(sourceFileExpressionTexts(first.call)).toEqual(['23;']);expect(sourceFileExpressionTexts(second.call)).toEqual(['29;']);
 for(const goal of ['script','module'] as const){const input=query("const owner={source:'31;'};function choose(){return owner.source}const query=choose();",goal);expect(sourceFileExpressionTexts(input.call)).toEqual(['31;']);}
 const opaque=query(prefix+"const query=choose({[key]:opaque()});");expect(sourceFileExpressionTexts(opaque.call)).toBeNull();
});

test('captured formatter dependencies retain ordering and undefined-only defaults',()=>{
 const head="import {format} from 'node:util';const key=Symbol('source');";
 const choose="function choose(input={}){const {[key]:source='./fallback'}=input;return format('%s',source)}";
 for(const suffix of ["require(query);","opaque();"]){
  const input=query(head+choose+"const query=choose({[key]:'./source'});"+suffix),proof=sourceFileExpressionTexts(input.call);
  expect(proof).not.toBeNull();expect(proof).toContain('./source');expect(proof).not.toContain('undefined');
 }
 for(const [setup,actual]of [[choose+'opaque();',"{[key]:'./source'}"],["function choose(input={}){opaque(input);const {[key]:source='./fallback'}=input;return format('%s',source)}","{[key]:'./source'}"],[choose,"{[key]:opaque()}"]] as const)
  expect(sourceFileExpressionTexts(query(head+setup+'const query=choose('+actual+');').call)).toBeNull();
 const omitted=query(head+choose+'const query=choose();');expect(sourceFileExpressionTexts(omitted.call)).toEqual(['./fallback']);
 const present=query(head+"function choose(value='17;'){return format('%s',value)}const query=choose(19);opaque();");expect(sourceFileExpressionTexts(present.call)).toEqual(['19']);
 const nested=query(head+"function choose(value){return format('%s','('+format('%s',value)+')')}const query=choose('23;');opaque();");expect(sourceFileExpressionTexts(nested.call)).toEqual(['(23;)']);
});

test('defaulted captured scalar formatter facts contain independent Node results',()=>{
 const bodies=[
  "function choose(value='17;'){return format('%s',value)}",
  "function choose(input={}){const {source='19;'}=input;return format('%s',source)}",
 ];
 for(const [index,body]of bodies.entries())for(const value of ['undefined','null','false','0',"''","'23;'"]){
  const expression=index===0?value:'{source:'+value+'}',source=body+'const query=choose('+expression+');';
  const input=query("import {format} from 'node:util';"+source+'opaque();'),proof=sourceFileExpressionTexts(input.call);
  const oracle=Bun.spawnSync(['node','-e',"const vm=require('node:vm');const context=vm.createContext({format:require('node:util').format});new vm.Script(process.argv[1]).runInContext(context);require('node:fs').writeSync(1,String(vm.runInContext('query',context)))",source],{stdout:'pipe',stderr:'pipe',timeout:30000});
  expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});expect(proof).not.toBeNull();expect(proof).toContain(oracle.stdout.toString());
  if(value!=='undefined')expect(proof).not.toContain(index===0?'17;':'19;');
 }
});
