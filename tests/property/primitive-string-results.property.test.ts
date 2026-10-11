import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {compile} from "../../src/compile";
import {sourceEvaluationInvocations} from "../../src/source-value-flow";
import {parseHostObservation} from "../test262/protocol";
function program(source:string):ts.Program{
 const filename="source.js",options={allowJs:true,noLib:true,target:ts.ScriptTarget.ESNext};
 const host=ts.createCompilerHost(options);host.getSourceFile=name=>name===filename?ts.createSourceFile(name,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS):undefined;
 host.readFile=name=>name===filename?source:undefined;host.fileExists=name=>name===filename;return ts.createProgram([filename],options,host);
}
test("primitive String results stay in the shared text dependency tree across callable and argument Lists",()=>{
 const sources:string[]=[];
 for(const primitive of ["41","'43;'","true","false","null","undefined","-0","~0","!false","-53n","1e21","1.2345678901234567","53n"]){
  for(const expression of [`String(${primitive})`,`String.call(null,${primitive})`,`String.apply(null,[${primitive}])`,`Reflect.apply(String,null,[${primitive}])`,`String.bind(null,${primitive})()`])sources.push(`eval(${expression});`);
 }
 sources.push('eval(String());','function value(){return "59;";}eval(String(value()));','var convert=String;var input="61;";eval(convert(input));','eval(String("67;",{toString(){throw 71;}}));','String=function(){return "73;";};eval(String(79));');
 const deep="String(".repeat(512)+'"83;"'+")".repeat(512);sources.push(`eval(${deep});`);
 const oracle=Bun.spawnSync(["node","-e",'const vm=require("node:vm");process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(source=>{const values=[];new vm.Script(source).runInNewContext({eval:value=>values.push(value)});return values;})));',JSON.stringify(sources)],{stdout:"pipe",stderr:"pipe"});expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:""});
 const expected:string[][]=JSON.parse(oracle.stdout.toString());
 for(const[index,source]of sources.entries()){
  const choices=sourceEvaluationInvocations(program(source)).filter(call=>ts.isCallExpression(call.node)&&ts.isIdentifier(call.node.expression)&&call.node.expression.text==="eval").map(call=>call.choices);
  expect({source, complete:choices.length>0&&choices.every(values=>values!==null&&expected[index]!.every(value=>values.includes(value)))}).toEqual({source,complete:true});
 }
 for(const name of ["undefined","NaN","Infinity"]){
  for(const effect of ['Reflect.set(globalThis,externalKey,"163;");',`Reflect.set(globalThis,${JSON.stringify(name)},"167;");`])
   expect(sourceEvaluationInvocations(program(effect+`eval(${name});`)).map(call=>call.choices)).toEqual([[]]);
 }
 for(const source of ['eval(+external);','eval(-external);','eval(~external);','eval(!external);','eval(eval(-external));'])expect(sourceEvaluationInvocations(program(source)).every(call=>JSON.stringify(call.choices)==="[]")).toBe(true);
 for(const source of ['eval(String(external));','eval(String(flag?"89;":external));','var convert=flag?String:external;eval(convert("97;"));','eval(String({toString(){return "101;";}}));'])expect(sourceEvaluationInvocations(program(source)).some(call=>call.choices===null)).toBe(true);
});
test("closed eval consumes primitive conversion text natively in both memory modes",async()=>{
 const pieces=[
  'function check(label,callback){try{print(label+":"+callback());}catch(error){print(label+":"+error.name);}}',
  'check("precision",function(){return eval(String(1.2345678901234567))+":"+eval(String(1e21));});',
  'check("number",function(){return eval(String(107));});',
  'check("primitive",function(){return eval(String(true))+":"+eval(String(null))+":"+eval(String(undefined));});',
  'check("prefix",function(){return eval(String(-0))+":"+eval(String(!false))+":"+eval(String(~0));});',
  'check("missing",function(){return eval(String());});',
  'check("forward",function(){function source(){return "109;";}return eval(String.call(null,source()))+":"+eval(String.apply(null,["113;"]))+":"+eval(Reflect.apply(String,null,["127;"]))+":"+eval(String.bind(null,"131;")());});',
  'check("ignored",function(){return eval(String("137;",{toString(){throw 139;}}));});',
  'check("abrupt",function(){return eval(String("141;",(function(){throw 149;})()));});',
  'check("immutable",function(){Reflect.set(globalThis,"undefined","163;");Reflect.set(globalThis,"NaN","167;");return eval(undefined)+":"+eval(String(NaN))+":"+eval(String(Infinity));});',
  'check("GC",function(){var input="151;";if(NATIVE_GC)$262.gc();return eval(String(input));});',
 ];
 const deep="String(".repeat(512)+'"157;"'+")".repeat(512);pieces.push(`check("deep",function(){return eval(${deep});});`);
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-primitive-string-"));
    try {
        const entry = path.join(directory, "source.js");
        const oracleSource = pieces.join("\n").replaceAll("NATIVE_GC", "false");
        await fs.writeFile(entry, oracleSource);
        const oracle = Bun.spawnSync(["node", "-e", 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});', entry], { stdout: "pipe", stderr: "pipe" });
        expect({ exitCode: oracle.exitCode, stderr: oracle.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
        const expected = oracle.stdout.toString().trimEnd().split("\n");
        for (const noGc of [false, true]) {
            await fs.writeFile(entry, pieces.join("\n").replaceAll("NATIVE_GC", String(!noGc)));
            const output = path.join(directory, "program-" + noGc), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, buildDir: path.join(directory, "build-" + noGc),
                isolatedScriptRoots: [entry], initializationEntries: [entry],
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/primitive-string-results.js#sloppy", setupEntries: [], testEntry: entry, async: false, scriptEntries: [entry] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect({ exitCode: native.exitCode, stderr: native.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" });
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");
            expect(observation.stdout?.trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
},600_000);
