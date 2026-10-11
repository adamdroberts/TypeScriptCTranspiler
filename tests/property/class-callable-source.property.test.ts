import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";
function program(source:string):ts.Program {
 const name="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===name?ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=file=>file===name?source:undefined;host.fileExists=file=>file===name;return ts.createProgram([name],options,host);
}
const definitions=[
 'class /* exact */ Named {}',
 'class { constructor(value=41){this.value=value;} read(){return this.value;} }',
 'class Named extends Base {constructor(value){super();this.value=value;} static method(){return "43;";} }',
 'class extends null {}',
 'class Named {#value=47;read(){return this.#value;} static method(){return "53;";} }',
 'class Named {static toString(){return "59;";} }',
 'class Named {static get toString(){return function(){return "61;";};} }',
 'class Named {static toString=()=>"67;";}',
 'class Named {static {this.toString=()=>"71;";}}',
];
test("class definitions and prototype identities use the shared callable graph",()=>{
 const adapters=["C.toString()","C.toString.call(C)","C.toString.apply(C,[])","Reflect.apply(C.toString,C,[])","C.toString.bind(C)()"];
 const sources=definitions.flatMap(definition=>adapters.map(adapter=>`class Base {} var C=${definition};eval(${adapter});`));
 sources.push('class C {method(){return 73;}}eval(C.prototype.constructor.toString());',
 'class Base {} class C extends Base {} eval(Object.getPrototypeOf(C).toString());',
 'class Base {static method(){return 79;}}class C extends Base {}eval(C.method.toString());',
 'class C {static toString(){return this.text;}static text="83;";}eval(C.toString());',
 'class C {constructor(){return "89;";}}eval(new C());',
 'function C(){return "97;";}eval(Reflect.construct(C,[]));',
 'eval(Reflect.construct(String,["101;"]));',
 'function inactive(value){value.toString=external;Reflect.set(globalThis,external,"127;");}class C {}eval(C.toString());',
 'class C {}function mutate(value){value.toString=()=>"131;";}mutate(C);eval(C.toString());',
 'class C {}function mutate(){Reflect.set(C,"toString",()=>"137;");}mutate();eval(C.toString());',
 'class C {field=Reflect.set(globalThis,external,"139;");}eval(C.toString());',
 'class C {}try{eval(C());}catch(error){}',
 'class C {}eval(Object.getPrototypeOf(C.prototype));',
 'class C extends null {}eval(String(Object.getPrototypeOf(C.prototype)));');
 const oracle=Bun.spawnSync(["node","-e",'const vm=require("node:vm");require("node:fs").writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>{if(typeof value==="string")values.push(value);}});return values;})));',JSON.stringify(sources)],{stdout:"pipe",stderr:"pipe"});
 expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of sources.entries()){
  const calls=sourceEvaluationInvocations(program(source));
  expect({source,complete:calls.length>0&&calls.every(call=>call.choices!==null&&expected[index]!.every(value=>call.choices!.includes(value)))}).toEqual({source,complete:true});
  if(expected[index]!.length===0)expect(calls.map(call=>call.choices)).toEqual([[]]);
 }
 for(const source of ['class C {static toString=external;}eval(C.toString());','class C {}C.toString=external;eval(C.toString());','class C extends external {}eval(C.toString());','class C {[external](){return "101;";}}eval(new C().toString());'])expect({source,incomplete:sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)}).toEqual({source,incomplete:true});
});
test("retained class source closes AOT eval and deep static inheritance matches Node",async()=>{
 const pieces=[
  'function check(name,value){print(name+":"+value);}',
  'function inactive(value){value.toString=external;Reflect.set(globalThis,external,"127;");}',
  'class Base {static text(){return "103;";}}',
  ...definitions.map((definition,index)=>`var C${index}=${definition};check("text${index}",C${index}.toString());`),
  'class Original {constructor(value){this.value=value;}read(){return this.value;}}',
  'var Copy=eval("("+Original.toString()+")");check("copy",new Copy(107).read());',
  'function rejected(){try{eval(Original());}catch(error){return error instanceof TypeError;}}check("class-call",rejected());',
  'class Child extends Base {}check("parent",Object.getPrototypeOf(Child).toString());check("inherited-method",Child.text.toString());',
  'class PrimitiveReturn {constructor(){return "109;";}}check("construct",typeof eval(new PrimitiveReturn()));',
  'class BoundReceiver {constructor(){this.text="113;";}}var Bound=BoundReceiver.bind({text:"127;"});check("bound-construct",new Bound().text);',
  'class Mutated {}function mutate(value){value.toString=()=>"137;";}mutate(Mutated);check("active-mutation",eval(Mutated.toString()));',
 ];
 for(let index=0;index<256;index++)pieces.push(`class Level${index} extends ${index?"Level"+(index-1):"Base"} {}`);
 pieces.push('if(NATIVE_GC)$262.gc();check("deep",eval(Level255.text()));');
 const source=pieces.join("\n"),directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-class-source-"));
 try {
  const entry=path.join(directory,"source.js");await fs.writeFile(entry,source.replaceAll("NATIVE_GC","false"));
  const node=Bun.spawnSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});',entry],{stdout:"pipe",stderr:"pipe"});expect({exitCode:node.exitCode,stderr:node.stderr.toString()}).toEqual({exitCode:0,stderr:""});
  for(const noGc of [false,true]){
   await fs.writeFile(entry,source.replaceAll("NATIVE_GC",String(!noGc)));const output=path.join(directory,"program-"+noGc),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build-"+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/class-callable-source.js#sloppy",setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
   const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
   const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(node.stdout.toString());
  }
 } finally {await fs.rm(directory,{recursive:true,force:true});}
},600_000);
