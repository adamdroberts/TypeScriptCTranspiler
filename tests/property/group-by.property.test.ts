import {nodeReferenceSync} from './node-reference';
import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

test("GroupBy consumes live Iterator Records and shares keyed groups across result projections", async () => {
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-group-by-"));
    try {
        const partitions:string[]=[];
        for(const mode of ["Object","Map"])
            for(const failure of ["none","next","result","done","value","callback","key"])
                for(const close of failure==="callback" || mode==="Object" && failure==="key"
                    ? ["normal","getter","throw","primitive","noncallable"] : ["normal"])
                    partitions.push(`scenario('${mode}','${failure}','${close}');`);
        const common=`
            function check(value,label){if(!value)throw new Error(label);PRINT(label+':'+value);}
            function scenario(mode,failure,close){
                        const events=[],original={},cleanup={};let index=0;
                        const iterator={
                            get next(){events.push('next-get');return function(){events.push('next:'+index);
                                if(failure==='next')throw original;
                                if(failure==='result')return 1;
                                const current=index++;return {get done(){events.push('done');if(failure==='done')throw original;return current===2;},get value(){events.push('value');if(failure==='value')throw original;return current;}};
                            };},
                            get return(){events.push('return-get');if(close==='getter')throw cleanup;if(close==='noncallable')return 1;return function(){events.push('return');if(close==='throw')throw cleanup;return close==='primitive'?1:{};};}
                        };
                        const source={[Symbol.iterator](){events.push('open');return iterator;}};
                        let caught='none';try{(mode==='Object'?Object.groupBy:Map.groupBy)(source,function(value,position){'use strict';
                            if(this!==undefined || arguments.length!==2 || value!==position)throw cleanup;
                            events.push('callback:'+position);
                            if(failure==='callback')throw original;
                            if(failure==='key')return {[Symbol.toPrimitive](hint){events.push('key:'+hint);throw original;}};
                            return position%2;
                        });}catch(error){caught=error===original?'original':error instanceof TypeError?'TypeError':'cleanup';}
                        PRINT(mode+':'+failure+':'+close+':'+caught+':'+events.join('|'));
                    }
            ${partitions.join("\n")}
            for(const method of [Object.groupBy,Map.groupBy]){
                let effects=0;const input={[Symbol.iterator]:()=>{effects++;throw {};}};
                let rejected=false;try{method(input,null);}catch(error){rejected=error instanceof TypeError;}
                check(rejected && effects===0,'validation-before-iterator');
                const values=[1,2];const grouped=method(values,(value,index)=>{if(index===0)values.push(3);return 'key';});
                check((grouped instanceof Map?grouped.get('key'):grouped.key).join('|')==='1|2|3','live-array');
                let nextGets=0,index=0;const iterator={get next(){nextGets++;return ()=>({value:index++,done:index>3});}};
                const iterable={[Symbol.iterator]:()=>iterator};
                const captured=method(iterable,()=>{Object.defineProperty(iterator,'next',{value:()=>{throw 'reread';}});return 'key';});
                check(nextGets===1 && (captured instanceof Map?captured.get('key'):captured.key).join('|')==='0|1|2','captured-next');
                const receiver={};const callback=function(value,index){'use strict';check(this===receiver,'bound-receiver');return index%2;}.bind(receiver);
                method([1,2],callback);
                const descriptor=Object.getOwnPropertyDescriptor(method===Object.groupBy?Object:Map,'groupBy');
                check(method.name==='groupBy' && method.length===2 && descriptor.writable && !descriptor.enumerable && descriptor.configurable,'callable-metadata');
            }
            const symbol=Symbol('key'),otherSymbol=Symbol('key'),object={},otherObject={};
            const keys=[-0,0,NaN,NaN,symbol,symbol,otherSymbol,object,object,otherObject,1n,'1',undefined];
            const map=Map.groupBy(keys,value=>value);
            check(map.size===9 && map.get(0).length===2 && map.get(NaN).length===2 && map.get(symbol).length===2 && map.get(object).length===2 && map.get(otherObject)[0]===otherObject,'collection-key-identity');
            check(Object.is(map.keys().next().value,0),'collection-positive-zero');
            const values=[{id:1},{id:2},{id:3}];let conversions=0;
            const properties=Object.groupBy(values,(value,index)=>index===1?symbol:{[Symbol.toPrimitive](hint){if(hint!=='string')throw {};conversions++;return '__proto__';}});
            const propertyDescriptor=Object.getOwnPropertyDescriptor(properties,symbol);
            check(Object.getPrototypeOf(properties)===null && properties.__proto__[0]===values[0] && properties.__proto__[1]===values[2] && properties[symbol][0]===values[1] && conversions===2,'property-key-conversion');
            check(propertyDescriptor.writable && propertyDescriptor.enumerable && propertyDescriptor.configurable && Object.getPrototypeOf(properties[symbol])===Array.prototype,'result-descriptors');
            check(Reflect.ownKeys(Object.groupBy([0,1,2,3],value=>[3,'2','plain',symbol][value])).map(key=>typeof key==='symbol'?'symbol':key).join('|')==='2|3|plain|symbol','property-key-order');
            const savedObject=Object,savedMap=Map,savedArray=Array,savedSet=Map.prototype.set;
            const intrinsicObject=Object.groupBy,intrinsicMap=Map.groupBy;
            Map.prototype.set=function(){throw 'setter';};
            const intrinsic=intrinsicMap([1,2],value=>{globalThis.Map=function(){throw 'constructor';};globalThis.Array=function(){throw 'array';};return value%2;});
            globalThis.Map=savedMap;globalThis.Array=savedArray;Map.prototype.set=savedSet;
            check(intrinsic instanceof Map && intrinsic.size===2 && intrinsic.get(1)[0]===1,'intrinsic-result-construction');
            let ignored=0;const alias=intrinsicObject;Object.groupBy=()=>({replacement:true});
            check(Object.groupBy([],()=>0).replacement && alias([3],()=>{ignored++;return 'key';},ignored=0).key[0]===3 && ignored===1,'mutable-method-and-arguments');Object.groupBy=alias;
            let nested={leaf:true};
            for(let index=0;index<512;index++)nested=Map.groupBy([nested],()=>object);
            for(let index=0;index<512;index++)nested=nested.get(object)[0];
            check(nested.leaf,'deep-retained-group-tree');
            PRINT('group-by-complete');`;
        for(const profile of [false,true]) {
            const source=common.replaceAll("PRINT",profile?"print":"console.log");
            const referenceFile=path.join(temporary,`reference-${profile}.js`);await fs.writeFile(referenceFile,source);
            const reference=nodeReferenceSync(["node","--experimental-vm-modules","--no-warnings","-e",
                'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print,console:{log:print}})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:"pipe",stderr:"pipe"});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("group-by-complete");
            for(const noGc of [false,true]) {
                const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");await fs.writeFile(entry,source);
                const diagnostics:string[]=[];const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/group-by.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),
                    diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation.kind).toBe("normal");
                expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    } finally {await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
