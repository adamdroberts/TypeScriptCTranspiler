import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function floorDivide(value: bigint, divisor: bigint): bigint {
    const quotient=value/divisor;
    return value<0n && value%divisor!==0n ? quotient-1n : quotient;
}

// Independent closed-form Gregorian model. The modeled normalized years have
// exact integral day coordinates and dense first-day time witnesses. Extreme
// cancellation in the source month remains legal; no C integer bound applies.
function calendarModel(args: readonly number[]): number {
    if(args.some(value=>!Number.isFinite(value)))return NaN;
    let fullYear=Math.trunc(args[0]!);
    if(fullYear>=0 && fullYear<=99)fullYear+=1900;
    const month=BigInt(Math.trunc(args[1]!));
    const quotient=floorDivide(month,12n);
    const normalizedYear=fullYear+Number(quotient);
    if(!Number.isFinite(normalizedYear))return NaN;
    if(Math.abs(normalizedYear)>1e12)throw new Error("outside closed-form witness partition");
    const year=BigInt(normalizedYear),normalizedMonth=Number(month-quotient*12n);
    const leap=year%400n===0n || (year%4n===0n && year%100n!==0n);
    const start=365n*(year-1970n)+floorDivide(year-1969n,4n)-floorDivide(year-1901n,100n)+floorDivide(year-1601n,400n);
    const monthStart=[0,31,59,90,120,151,181,212,243,273,304,334][normalizedMonth]!+(leap && normalizedMonth>=2?1:0);
    const day=(Number(start)+monthStart+Math.trunc(args[2]!))-1;
    const time=((Math.trunc(args[3]!)*3600000+Math.trunc(args[4]!)*60000)+Math.trunc(args[5]!)*1000)+Math.trunc(args[6]!);
    const result=day*86400000+time;
    return !Number.isFinite(result) || Math.abs(result)>8640000000000000 ? NaN : Math.trunc(result)===0?0:Math.trunc(result);
}

interface Probe {readonly label:string;readonly args:readonly number[];readonly expected:number;readonly node:boolean;}
function probes(): Probe[] {
    const result:Probe[]=[];
    function add(label:string,args:number[],node=true){result.push({label,args,expected:calendarModel(args),node});}
    for(const year of [-400,-100,-1,-0,0.9,99.9,100,1900,2000,2100,2400])for(const month of [-12.9,-1.9,1.9,12.9]){
        add(`calendar:${year}:${month}`,[year,month,29.9,-1.9,60.9,-1.9,-0.9]);
    }
    for(const milliseconds of [-1001.9,-999.9,-0.9,-0,0.9,999.9,1001.9]){
        add(`fractional:${milliseconds}`,[1970,0,1,0,0,-1,milliseconds]);
    }
    add('fp-make-time',[1970,0,1,80063993375,29,1,-288230376151711740]);
    add('fp-make-day',[1970,0,213503982336,0,0,0,-18446744073709552000]);
    for(const day of [-100000000,100000000])for(const offset of [-1,0,1]){
        add(`clip:${day}:${offset}`,[1970,0,day+1,0,0,0,offset]);
    }
    let state=0x75dace;
    function next(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state;}
    for(let index=0;index<96;index++){
        const year=(next()%600001)-300000,month=(next()%721)-360,day=(next()%4097)-2048;
        add(`generated:${index}`,[year+0.75,month+0.75,day+0.75,(next()%2001)-1000,(next()%201)-100,(next()%201)-100,(next()%4001)-2000]);
    }
    // Node applies its own early range bounds here. The exact mathematical
    // month quotient normalizes into an ordinary year under the pinned spec.
    for(const exponent of [57,100,500,1000])for(const sign of [-1,1]){
        const month=sign*2**exponent,quotient=Number(floorDivide(BigInt(month),12n));
        add(`exact-month-cancellation:${sign}:${exponent}`,[-quotient,month,1,0,0,0,0],false);
    }
    // At this magnitude the integral Day and DayFromYear spacing exceeds 31;
    // no binary64 difference can denote February's first-day coordinate.
    result.push({label:'missing-first-day-witness',args:[1e100,1,1,0,0,0,0],expected:NaN,node:false});
    for(const args of [[Number.MAX_VALUE,Number.MAX_VALUE,1,0,0,0,0],[1970,0,1,Number.MAX_VALUE,0,0,-Number.MAX_VALUE],[NaN,0,1,0,0,0,0]]){
        result.push({label:`nonfinite:${result.length}`,args,expected:NaN,node:true});
    }
    return result;
}

function literal(value:number):string {return Number.isNaN(value)?"NaN":value===Infinity?"Infinity":value===-Infinity?"-Infinity":Object.is(value,-0)?"-0":String(value);}
function subject(selected:readonly Probe[]):string {
    const records=selected.map(probe=>`{label:${JSON.stringify(probe.label)},args:[${probe.args.map(literal).join(',')}],expected:${literal(probe.expected)}}`);
    return `
        const probes=[${records.join(',\n')}],UTC=Date.UTC;
        function verify(probe){const value=UTC.apply(undefined,probe.args);if(!Object.is(value,probe.expected))throw new Error(probe.label+':'+value+':'+probe.expected);}
        for(const probe of probes){verify(probe);PRINT(probe.label);}
        let tree=null;
        for(let depth=0;depth<512;depth++)tree={probe:probes[depth%probes.length],previous:tree};
        const owner={tree,UTC};tree=null;COLLECT;
        let cursor=owner.tree;while(cursor){if(owner.UTC!==UTC)throw new Error('owner');verify(cursor.probe);cursor=cursor.previous;}
        PRINT('deep-calendar-worklist');PRINT('date-calendar-complete');
    `;
}

test("UTC calendar normalization preserves exact month arithmetic and every Number rounding point",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-date-calendar-"));
    try{
        const cases=probes();expect(cases.find(probe=>probe.label==='fp-make-time')!.expected).toBe(29312);expect(cases.find(probe=>probe.label==='fp-make-day')!.expected).toBe(34447360);
        const referenceFile=path.join(temporary,"reference.mjs");await fs.writeFile(referenceFile,subject(cases.filter(probe=>probe.node)).replaceAll("PRINT","print").replaceAll("COLLECT",""));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",
            'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:"pipe",stderr:"pipe"});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=[...cases.map(probe=>probe.label),'deep-calendar-worklist','date-calendar-complete'];
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");
            await fs.writeFile(entry,subject(cases).replaceAll("PRINT",profile?"print":"console.log").replaceAll("COLLECT",profile && !noGc?"$262.gc()":""));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/date-calendar.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
