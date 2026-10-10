import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// The parameter/default collection is normative; the actual argument List has
// no shape restriction. Calendar arithmetic is a separate semantic partition.
function subject(): string {
    return `
        function check(condition,label){if(!condition)throw new Error(label);PRINT(label);}
        const UTC=Date.UTC,parse=Date.parse,now=Date.now,raw={};
        const defaults=[1971,0,1,0,0,1,2];
        function numeric(label,value,events){return {[Symbol.toPrimitive](hint){events.push(label+':'+hint);return value;}};}
        for(let omitted=0;omitted<=defaults.length;omitted++){
            const list=defaults.slice(0,omitted);
            PRINT('presence:'+omitted+':'+UTC.apply(null,list));
            PRINT('spread:'+omitted+':'+Date.UTC(...list));
        }
        for(let position=0;position<defaults.length;position++)for(const value of [undefined,null,false,'2']){
            const list=defaults.slice();list[position]=value;
            PRINT('explicit:'+position+':'+String(value)+':'+UTC.apply({},list));
        }
        check(UTC.bind(raw,1971)()===31536000000 && UTC.call(raw,1971)===31536000000,'receiver-independent');
        for(const nonfinite of [NaN,Infinity,-Infinity]){
            const events=[];
            const result=Date.UTC(numeric('year',nonfinite,events),numeric('month',0,events),numeric('day',1,events));
            check(Number.isNaN(result) && events.join('|')==='year:number|month:number|day:number','nonfinite-keeps-converting:'+nonfinite);
        }
        for(const abrupt of ['raw','symbol','bigint']){
            const events=[];let caught=false;
            const failing={[Symbol.toPrimitive](hint){events.push('failure:'+hint);if(abrupt==='raw')throw raw;return abrupt==='symbol'?Symbol():1n;}};
            try{Date.UTC(numeric('year',1971,events),failing,numeric('unvisited',1,events));}
            catch(error){caught=abrupt==='raw'?error===raw:error instanceof TypeError;}
            check(caught && events.join('|')==='year:number|failure:number','conversion-abrupt:'+abrupt);
        }
        const events=[];
        function argument(label,value){events.push('arg:'+label);return value;}
        const ignored={[Symbol.toPrimitive](){throw raw;}};
        check(Date.UTC(argument('year',numeric('year',1971,events)),argument('month',numeric('month',0,events)),1,0,0,0,0,argument('ignored',ignored))===31536000000 && events.join('|')==='arg:year|arg:month|arg:ignored|year:number|month:number','all-arguments-before-conversion');
        events.length=0;
        check(Date.parse(argument('text',{[Symbol.toPrimitive](hint){events.push('text:'+hint);return '1970-01-01T00:00:01.000Z';}}),argument('ignored',ignored))===1000 && events.join('|')==='arg:text|arg:ignored|text:string','parse-string-hint');
        let parseCaught=false;try{parse(Symbol());}catch(error){parseCaught=error instanceof TypeError;}
        check(parseCaught && Number.isNaN(parse()) && typeof now.call(raw,ignored)==='number','parse-and-now-boundaries');
        for(const name of ['UTC','parse','now']){
            const descriptor=Object.getOwnPropertyDescriptor(Date,name),original=descriptor.value,events=[];
            Object.defineProperty(Date,name,{get(){events.push('get');return function(value){events.push('call:'+value);return this===Date?17:0;};},configurable:true});
            function argument(){events.push('arg');Object.defineProperty(Date,name,{value(){throw raw;},writable:true,configurable:true});return 3;}
            const value=name==='UTC'?Date.UTC(argument()):name==='parse'?Date.parse(argument()):Date.now(argument());
            check(value===17 && events.join('|')==='get|arg|call:3','saved-method:'+name);
            Object.defineProperty(Date,name,{value(){events.push('unused');},writable:true,configurable:true});
            if(name==='UTC'){const unused=Date.UTC(1971);}else if(name==='parse'){const unused=Date.parse('ignored');}else{const unused=Date.now();}
            check(events.at(-1)==='unused','observable-unused-call:'+name);
            Object.defineProperty(Date,name,descriptor);
            check(Date[name]===original,'restored-method:'+name);
        }
        let constructed=false;try{Reflect.construct(UTC,[]);constructed=true;}catch(error){if(!(error instanceof TypeError))throw error;}
        check(!constructed && UTC.name==='UTC' && UTC.length===7,'static-callable-metadata');
        let tree={value:ignored};
        for(let depth=0;depth<2048;depth++)tree={previous:tree,value:ignored,owner:UTC};
        const retained=tree;tree=null;COLLECT;
        const iterable={ [Symbol.iterator](){let cursor=retained,index=0;return {next(){if(index<defaults.length)return {value:defaults[index++],done:false};if(cursor.previous){const value=cursor.value;checkOwner(cursor.owner);cursor=cursor.previous;return {value,done:false};}return {done:true};}};}};
        function checkOwner(owner){if(owner!==UTC)throw raw;}
        check(Date.UTC(...iterable)===UTC.apply(null,defaults),'deep-actual-list-retention');
        PRINT('date-static-complete');
    `;
}

test("Date statics share ordinary lookup and one presence-sensitive argument/default collection",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-date-static-"));
    try{
        const source=subject(),referenceFile=path.join(temporary,"reference.mjs");
        await fs.writeFile(referenceFile,source.replaceAll("PRINT","print").replaceAll("COLLECT",""));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",
            'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:"pipe",stderr:"pipe"});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("date-static-complete");
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");
            await fs.writeFile(entry,source.replaceAll("PRINT",profile?"print":"console.log").replaceAll("COLLECT",profile && !noGc?"$262.gc()":""));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/date-static.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
