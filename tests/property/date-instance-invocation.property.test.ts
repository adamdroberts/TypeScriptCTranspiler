import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject():string {
    return `
        const raw={},seed=Date.UTC(2000,0,2,3,4,5,6);
        const plans=[
            {name:'setUTCFullYear',values:[2001,11,3]}, {name:'setUTCMonth',values:[11,3]},
            {name:'setUTCDate',values:[3]}, {name:'setUTCHours',values:[1,2,3,4]},
            {name:'setUTCMinutes',values:[2,3,4]}, {name:'setUTCSeconds',values:[3,4]},
            {name:'setUTCMilliseconds',values:[4]},
            {name:'setFullYear',values:[2001,11,3]}, {name:'setMonth',values:[11,3]},
            {name:'setDate',values:[3]}, {name:'setHours',values:[1,2,3,4]},
            {name:'setMinutes',values:[2,3,4]}, {name:'setSeconds',values:[3,4]},
            {name:'setMilliseconds',values:[4]}, {name:'setYear',values:[24]}
        ];
        function check(value,label){if(!value)throw new Error(label);PRINT(label);}
        for(const value of [0,seed,-1,NaN,Infinity]){
            const date=new Date({valueOf(){COLLECT;return value;}});
            COLLECT;
            check(Object.is(date.getTime(),Number.isFinite(value)?value:NaN),'constructed-receiver:'+value);
        }
        for(const plan of plans)for(const invalid of [false,true])for(const mode of ['absent','present','undefined','abrupt']){
            const date=new Date(invalid?NaN:seed),events=[];
            COLLECT;
            const first={valueOf(){events.push('first');COLLECT;date.setTime(mode==='abrupt'?12345:0);if(mode==='abrupt')throw raw;return plan.values[0];}};
            const args=[first];
            if(mode==='present')for(let position=1;position<plan.values.length;position++)args.push({valueOf(){events.push('optional:'+position);COLLECT;date.setTime(0);return plan.values[position];}});
            if(mode==='undefined' && plan.values.length>1)args.push(undefined);
            const ignored={[Symbol.toPrimitive](){throw new Error('ignored conversion');}};
            if(mode==='present')args.push(ignored);
            let result,caught=false;
            try{result=date[plan.name].apply(date,args);}catch(error){caught=error===raw;if(!caught)throw error;}
            PRINT(plan.name+':'+invalid+':'+mode+':'+caught+':'+result+':'+date.getTime()+':'+events.join('|'));
        }
        for(const plan of plans){
            let converted=false,threw=false;
            try{Date.prototype[plan.name].call({}, {valueOf(){converted=true;return 1;}});}catch(error){threw=error instanceof TypeError;}
            check(threw && !converted,'brand-before-conversion:'+plan.name);
            const missing=new Date(seed);check(Number.isNaN(missing[plan.name]()),'missing-required:'+plan.name);
        }
        const parts=['getTime','getUTCFullYear','toISOString','toJSON','setTime','setUTCHours'];
        for(const name of parts){
            const descriptor=Object.getOwnPropertyDescriptor(Date.prototype,name),events=[],date=new Date(seed);
            Object.defineProperty(Date.prototype,name,{get(){events.push('get');return function(value){events.push('call:'+value);return this===date?'replacement':'wrong';};},configurable:true});
            function argument(){events.push('arg');COLLECT;Object.defineProperty(Date.prototype,name,{value(){throw raw;},writable:true,configurable:true});return 7;}
            check(date[name](argument())==='replacement' && events.join('|')==='get|arg|call:7','saved-instance-method:'+name);
            Object.defineProperty(Date.prototype,name,descriptor);
        }
        const exact=new Date(0);
        check(exact.setUTCHours(80063993375,29,1,-288230376151711740)===29312,'setter-make-time-order');
        exact.setTime(0);check(Number.isNaN(exact.setUTCDate(213503982336)) && Number.isNaN(exact.getTime()),'date-overflow-clips');
        exact.setTime(0);check(exact.setUTCSeconds(-1,999.9)===-1,'negative-second-and-truncation');
        exact.setTime(NaN);exact.setUTCFullYear(0);check(exact.getUTCFullYear()===0,'full-year-no-offset');
        let tree={date:new Date(seed),leaf:raw};
        for(let depth=0;depth<512;depth++)tree={date:new Date(seed+depth),previous:tree};
        const owner={tree};tree=null;COLLECT;
        let cursor=owner.tree;while(cursor.previous){const date=cursor.date,before=date.getTime();const value=date.setUTCSeconds({valueOf(){date.setTime(0);return 7;}});if(value!==before-(before%60000)+7000+(before%1000))throw raw;cursor=cursor.previous;}
        check(cursor.leaf===raw,'deep-retained-date-owner-tree');PRINT('date-instance-complete');
    `;
}

test("Date instance calls retain ordinary lookup and setters consume the pre-coercion time value",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-date-instance-"));
    try{
        const source=subject(),referenceFile=path.join(temporary,"reference.mjs");await fs.writeFile(referenceFile,source.replaceAll("PRINT","print").replaceAll("COLLECT",""));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",
            'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:"pipe",stderr:"pipe",env:{...process.env,TZ:"UTC"}});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        // Node's year setters currently reread the receiver after ToNumber.
        // The pinned setUTCFullYear/setFullYear/setYear clauses capture t first.
        // Derive the affected UTC-zone calendar result independently from the
        // unchanged seed's month/day/time and the explicit primitive year plan.
        const expected=reference.stdout.toString().trimEnd().split("\n").map(line=>{
            const fields=line.split(":");
            if(["setUTCFullYear","setFullYear","setYear"].includes(fields[0]!) && fields[1]==="false" && (["absent","present"].includes(fields[2]!) || fields[0]==="setYear" && fields[2]==="undefined")){
                const legacy=fields[0]==="setYear",present=fields[2]==="present" && !legacy;
                const value=Date.UTC(legacy?1924:2001,present?11:0,present?3:2,3,4,5,6);
                fields[4]=String(value);fields[5]=String(value);return fields.join(":");
            }
            return line;
        });expect(expected.at(-1)).toBe("date-instance-complete");
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");await fs.writeFile(entry,source.replaceAll("PRINT",profile?"print":"console.log").replaceAll("COLLECT",profile && !noGc?"$262.gc()":""));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/date-instance.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,TZ:"UTC",GC_FREE_SPACE_DIVISOR:"100"}});
            if(native.exitCode!==0)throw new Error(JSON.stringify({profile,noGc,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString().slice(-3000)}));
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
