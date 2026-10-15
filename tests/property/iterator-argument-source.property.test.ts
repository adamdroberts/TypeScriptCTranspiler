import {nodeReferenceSync} from './node-reference';
import {expect, test} from "bun:test";
import {mkdtemp, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {finiteEvalScriptSourceGraph as graph} from "../test262/native-host";
import {parseHostObservation} from "../test262/protocol";

function iterable(values: string): string {
    return `const values=${values};let cursor=0;const iterable={
        [Symbol.iterator](){return {next(){var index=cursor++;return index<values.length?
            {done:false,value:values[index]}:{done:true};}};}};`;
}
const routes = [
    'eval(...iterable)', '(0,eval)(...iterable)', 'eval.call(null,...iterable)',
    'eval.bind(null)(...iterable)', 'function forward(body){return eval(body);}forward(...iterable)',
    'function forward(ignored,body){return eval(body);}forward(0,...iterable)',
    'function forward(ignored,body){return eval(body);}forward.bind(null,0)(...iterable)',
    'function forward(body){return eval(body);}forward.call(null,...iterable)',
];
test("Iterator argument domains retain forwarding and conservative effects", () => {
    for (const route of routes) {
        const source=iterable('["17;","19;"]')+route+';';
        const result=graph([{path:"main.js",source}]);
        expect({route,error:result.error}).toEqual({route,error:null});
        const bodies=[...result.directEvalSources,...result.indirectEvalSources].map(entry=>entry.source);
        expect(new Set(bodies)).toEqual(new Set(["17;","19;"]));
    }
    for (const source of [
        'const iter={[Symbol.iterator](){return {next(){return {done:false,value:opaque()};}};}};eval(...iter);',
        'const owner={body:"17;"};const iter={[Symbol.iterator](){return {next(){return {done:false,value:owner};}};}};opaque(...iter);eval(owner.body);',
        'let body="17;";const iter={[Symbol.iterator](){body=opaque();return {next(){return {done:true};}};}};function ignore(){}ignore(0,...iter);eval(body);',
        'let body="17;";const iter={[Symbol.iterator](){return {next(){body=opaque();return {done:true};}};}};function ignore(){}ignore(...iter);eval(body);',
        'const iter={[Symbol.iterator](){return opaque();}};eval(...iter);',
        'const iter={[Symbol.iterator](){return {next:opaque()};}};eval(...iter);',
        iterable('["17;"]')+'function forward(...args){return eval(args[0]);}forward(...iterable);',
    ]) expect({source,error:graph([{path:"main.js",source}]).error})
        .toMatchObject({error:expect.stringContaining("direct eval source is not a finite static string expression")});
    // A terminal result never reads its value getter.
    expect(graph([{path:"main.js",source:'const iter={[Symbol.iterator](){return {next(){return {done:true,get value(){return opaque();}};}};}};eval(...iter);'}]).error).toBeNull();
});

function program(depth:number):string {
    const calls=routes.map((template,index)=>{
        const route=template.replaceAll('forward','forward'+index);
        const split=route.lastIndexOf('}');
        const declaration=route.startsWith('function')?route.slice(0,split+1):'';
        const expression=declaration?route.slice(split+1):route;
        return `{${iterable('["17;","19;"]')}${declaration}print("route${index}:"+(${expression}));}`;
    }).join('\n');
    return calls+`\n{${iterable('["23;","29;"]')}function project(body){return eval(body);}
        const b0=project;${Array.from({length:depth},(_,index)=>`const b${index+1}=b${index}.bind(null);`).join('\n')}
        print("deep:"+b${depth}(...iterable));}`+
        '\n{let nextReads=0,steps=0;const iterator={get next(){nextReads++;return function(){steps++;if(steps===1){this.next=function(){throw "recaptured next";};return {done:false,value:"31;"};}return {done:true,get value(){throw "terminal value read";}};};}};const iter={[Symbol.iterator](){return iterator;}};print("captured:"+eval(...iter)+":"+nextReads+":"+steps);}'+
        '\n{let suffix=0;function first(body){return eval(body);}const iter={[Symbol.iterator](){suffix++;return {next(){suffix++;return {done:true};}};}};print("suffix:"+first("37;",...iter)+":"+suffix);}'+
        '\n{const iter={[Symbol.iterator](){return {next(){throw "41;";}};}};try{eval(...iter);}catch(error){print("throw:"+eval(error));}}';
}
test("Iterator calls, terminal reads and deep forwarding match independent Node", async()=>{
    const directory=await mkdtemp(join(tmpdir(),"tsc2c-iterator-argument-source-"));
    try {
        for(const typed of [false,true]) for(const noGc of [false,true]) {
            const source=program(typed&&!noGc?256:1);
            expect(graph([{path:"main.js",source}]).error).toBeNull();
            const node=nodeReferenceSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(source),stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
            const entry=join(directory,"main-"+typed+"-"+noGc+(typed?".ts":".js")),output=join(directory,"program-"+typed+"-"+noGc),diagnostics:string[]=[];
            await writeFile(entry,(typed?"// @ts-nocheck\n":"")+source);
            const built=await compile({entry,output,noGc,buildDir:output+"-build",isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/iterator-argument-source#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
            expect({code:built.exitCode,diagnostics:diagnostics.join("")}).toEqual({code:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(node.stdout.toString());
        }
    } finally {await rm(directory,{recursive:true,force:true});}
},600_000);
