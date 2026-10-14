import {expect,test} from 'bun:test';
import ts from 'typescript';
import {sourceExpressionTexts} from '../../src/source-value-flow';

function proof(setup:string,expressions:readonly string[]):(readonly string[]|null|undefined)[]{
 const source=setup+';const queries=['+expressions.join(',')+'];',name='input.js';
 const options={allowJs:true,noLib:true,noEmit:true,target:ts.ScriptTarget.ESNext},host=ts.createCompilerHost(options);
 host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;
 const program=ts.createProgram([name],options,host),parsed=program.getSourceFile(name)!,pending:ts.Node[]=[parsed],queries:ts.Expression[]=[];
 while(pending.length){const node=pending.pop()!;
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='queries'&&node.initializer&&ts.isArrayLiteralExpression(node.initializer))queries.push(...node.initializer.elements);
  node.forEachChild(child=>{pending.push(child)});
 }
 const result=sourceExpressionTexts(program,queries);return queries.map(query=>result.get(query));
}
test('virtual String fields conservatively retain independent actual reads and descriptor presence',()=>{
 const cases:{setup:string;query:string;exact:boolean}[]=[];
 for(const text of ['', 'x', 'xy', 'a😀z']){
  const setup=`const owner=Object(${JSON.stringify(text)});`;
  for(const query of new Set(['owner.length',...[-1,0,text.length-1,text.length].flatMap(index=>[
   `owner[${index}]`,`Object.getOwnPropertyDescriptor(owner,${JSON.stringify(String(index))})===undefined`,
   `Object.getOwnPropertyDescriptors(owner)[${JSON.stringify(String(index))}]===undefined`
  ])]))cases.push({setup,query,exact:true});
 }
 const shared='function wrap(value){return Object(value)};const first=wrap("ab"),second=wrap("xyz");';
 for(const query of ['first[2]','second[2]','Object.getOwnPropertyDescriptor(first,"2")===undefined','Object.getOwnPropertyDescriptor(second,"2")===undefined','Object.getOwnPropertyDescriptors(first)["2"]===undefined','Object.getOwnPropertyDescriptors(second)["2"]===undefined'])cases.push({setup:shared,query,exact:false});
 cases.push({setup:'const owner=Object("ab");owner[2]="added";',query:'owner[2]',exact:false},
  {setup:'const owner=Object("ab");String.prototype[2]="inherited";',query:'owner[2]',exact:true});
 const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");fs.writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(p=>String(new vm.Script(p.setup+";("+p.query+")").runInNewContext()))));',JSON.stringify(cases)],{stdout:'pipe',stderr:'pipe'});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});const observations:string[]=JSON.parse(oracle.stdout.toString());
 for(const [index,partition]of cases.entries()){
  const actual=proof(partition.setup,[partition.query])[0];expect(actual).not.toBeNull();expect(actual).toContain(observations[index]!);
  if(partition.exact)expect(actual).toEqual([observations[index]!]);
 }
 for(const setup of ['const owner=Object(external);','const owner=Object(String(external));','const owner=new String(external);','const owner=Object(String(Math.random()));','const owner=Object("xy");opaque(owner);']){
  for(const query of ['owner[0]','owner.length','Object.getOwnPropertyDescriptor(owner,"0").value'])expect(proof(setup,[query])[0]).toBeNull();
 }
},120000);
test('virtual String source reads select sparse UTF-16 positions from one large input',()=>{
 const text='a😀z'.repeat(32768),positions=[0,1,2,text.length-1,text.length];
 const queries=['owner.length',...positions.map(index=>`owner[${index}]`)];
 const actual=proof(`const owner=Object(${JSON.stringify(text)});`,queries);
 expect(actual).toEqual([[String(text.length)],...positions.map(index=>[String(text[index])])]);
},120000);
