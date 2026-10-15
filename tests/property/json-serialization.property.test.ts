import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

const scalars=['undefined','null','false','true','0','-0','NaN','Infinity','-Infinity','17.5','"quotes\\\"\\\\\\n\\t"','"\\ud800"','"\\udfff"','"\\ud83d\\ude00"','Symbol("ignored")','function(){}'];
scalars.push(...[
    Array.from({length:32},(_,index)=>String.fromCharCode(index)).join(""),
    String.fromCharCode(0xd7ff,0xd800,0xdbff,0xdc00,0xdfff,0xe000),
    String.fromCodePoint(0x20,0x7f,0x80,0x7ff,0x800,0xffff,0x10000,0x10ffff),
].map(value=>JSON.stringify(value)));
const spaces=['undefined','-1','0','1.8','Infinity','"abcdefghijk"','"😀😀😀😀😀😀"','true','{}'];
function subject(depth:number):string {
    return scalars.map((value,index)=>`print("scalar${index}:"+String(JSON.stringify(${value})));`).join('\n')+'\n'+
        spaces.map((space,index)=>`print("gap${index}:"+JSON.stringify({a:[1,{b:2}]},null,${space}));`).join('\n')+`\n
        {const object={z:0,"10":10,"2":2,a:undefined,b:function(){},c:Symbol("c")};print("keys:"+JSON.stringify(object));}
        {const prototype={1:19};const array=[17,,,];Object.setPrototypeOf(array,prototype);print("sparse:"+JSON.stringify(array));}
        {const trace=[];const owner={get a(){trace.push("get:a");delete this.b;this.c=3;return 1;},b:2};print("mutation:"+JSON.stringify(owner)+":"+trace.join(","));}
        {const trace=[];const child={toJSON(key){trace.push("toJSON:"+key+":"+(this===child));return {v:17};}};
         const parent={child};const result=JSON.stringify(parent,function(key,value){trace.push("replace:"+key+":"+(key==="child"?this===parent:key==="v"?this.v===17:this[""]===parent));return value;});print("hooks:"+result+":"+trace.join(","));}
        {const owner={a:1,b:2,"0":3};const list=["b","b",0,new String("a"),true,{}];print("list:"+JSON.stringify(owner,list,2));}
        {const trace=[];const list={get 0(){trace.push("key");return "a";},length:1};const space={valueOf(){trace.push("unexpected");return 2;}};print("ordinary-options:"+JSON.stringify({a:1},list,space)+":"+trace.join(","));}
        {const trace=[];const number=new Number(17);number.valueOf=function(){trace.push("number");return 19;};const string=new String("a");string.toString=function(){trace.push("string");return "b";};const boolean=new Boolean(false);boolean.valueOf=function(){throw "boolean conversion";};print("boxes:"+JSON.stringify([number,string,boolean,Object(Symbol("s"))])+":"+trace.join(","));}
        {let next=0;const box=new Number(2);box.valueOf=function(){next++;return 3;};print("boxed-gap:"+JSON.stringify({a:1},null,box)+":"+next);}
        {const array=[1,2,3];Object.defineProperty(array,"0",{get(){array.length=1;return 1;}});print("array-length:"+JSON.stringify(array));}
        {const saved=BigInt.prototype.toJSON;BigInt.prototype.toJSON=function(key){return "big:"+key+":"+String(this);};print("bigint-hook:"+JSON.stringify({a:1n}));if(saved===undefined)delete BigInt.prototype.toJSON;else BigInt.prototype.toJSON=saved;}
        {const object={a:1,b:2};const list=["a","b"];Object.defineProperty(list,"0",{get(){delete object.b;return "a";}});print("list-order:"+JSON.stringify(object,list));}
        {const trace=[];const object={a:1,b:2};const proxy=new Proxy(object,{ownKeys(target){trace.push("keys");return ["b","a"];},getOwnPropertyDescriptor(target,key){trace.push("desc:"+key);return Object.getOwnPropertyDescriptor(target,key);},get(target,key){trace.push("get:"+String(key));return target[key];}});print("proxy:"+JSON.stringify(proxy)+":"+trace.join(","));}
        {const value={x:1};print("alias:"+JSON.stringify([value,value]));value.self=value;try{JSON.stringify(value);}catch(error){print("cycle:"+(error instanceof TypeError));}print("recovered:"+JSON.stringify({ok:1}));}
        {try{JSON.stringify([1n]);}catch(error){print("bigint:"+(error instanceof TypeError));}}
        {const object={toJSON(){throw "toJSON";}};try{JSON.stringify(object);}catch(error){print("throw:"+error);}try{JSON.stringify(1,function(){throw "replacer";});}catch(error){print("throw:"+error);}}
        {let effects=0;const result=JSON.stringify({a:1},undefined,undefined,effects++);print("extra:"+result+":"+effects);}
        {const fn=JSON.stringify;print("forward:"+fn.call(null,{a:1},["a"],1)+":"+Reflect.apply(fn,null,[[1,undefined],null,0]));}
        {let value=0;for(let index=0;index<${depth};index++)value=[value];const result=JSON.stringify(value);print("deep:"+result);}
    `;
}
test("JSON Serialization Record matches Node across callbacks, options and one deep worklist",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"tsc2c-json-serialization-"));
    try{
        for(const typed of [false,true])for(const noGc of [false,true]){
            const source=subject(typed&&!noGc?16384:1),entry=join(directory,"main-"+typed+"-"+noGc+(typed?".ts":".js")),output=join(directory,"program-"+typed+"-"+noGc),diagnostics:string[]=[];
            // Node's native JSON walker has a stack limit, so the deep input's
            // independent oracle checks its mathematical bracket projection.
            const nativeDeep=`let value=0;for(let index=0;index<${typed&&!noGc?16384:1};index++)value=[value];const result=JSON.stringify(value);print("deep:"+result);`;
            const nodeSource=source.replace(nativeDeep,`print("deep:"+"[".repeat(${typed&&!noGc?16384:1})+"0"+"]".repeat(${typed&&!noGc?16384:1}));`);
            expect(nodeSource).not.toBe(source);
            const node=nodeReferenceSync(["node","-e",'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(0,"utf8")).runInNewContext({print:value=>fs.writeSync(1,String(value)+"\\n")});'],{stdin:Buffer.from(nodeSource),stdout:"pipe",stderr:"pipe",timeout:120000});
            expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
            await writeFile(entry,(typed?"// @ts-nocheck\n":"")+source);
            const result=await compile({entry,output,noGc,buildDir:output+"-build",isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/json-serialization#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});
            expect({code:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({code:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});
            expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe("normal");expect(observation.stdout).toBe(node.stdout.toString());
        }
    }finally{await rm(directory,{recursive:true,force:true});}
},600000);
