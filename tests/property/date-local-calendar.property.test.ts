import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

interface Probe {label:string;method:string;args:number[];referenceMonth?:number;invalid?:boolean;}
function probes():Probe[]{
    const records:Probe[]=[];
    const add=(label:string,args:number[],method='construct'):void=>{records.push({label,method,args});};
    for(const year of [-400,-1,0.9,99.9,100,1900,2000,2100,2400])for(const month of [-12.9,-1.9,1.9,12.9]){
        add(`calendar:${year}:${month}`,[year,month,29.9,-1.9,60.9,-1.9,-0.9]);
    }
    add('negative-epoch-second',[1969,11,31,23,59,59,0]);
    add('fractional-milliseconds',[1970,0,1,0,0,-1,999.9]);
    add('ordered-time-number',[1970,0,1,80063993375,29,1,-288230376151711740]);
    add('ordered-day-number',[1970,0,213503982336,0,0,0,-18446744073709552000]);
    add('setter-ordered-number',[80063993375,29,1,-288230376151711740],'setHours');
    for(const day of [-100000000,100000000])for(const hours of [-1,0,1])add(`clip:${day}:${hours}`,[1970,0,day+1,hours,0,0,0]);
    for(const method of ['setFullYear','setMonth','setDate','setHours','setMinutes','setSeconds','setMilliseconds','setYear']){
        for(const value of [-1001.9,-1.9,0.9,99.9,1001.9,NaN,Infinity])add(`${method}:${value}`,[value],method);
    }
    for(const method of ['setFullYear','setYear'])for(const value of [-1,0,99,2001,NaN]){
        records.push({label:`invalid:${method}:${value}`,method,args:[value],invalid:true});
    }
    let state=0x78da7e;
    const next=():number=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
    for(let index=0;index<64;index++)add(`generated:${index}`,[(next()%600001)-300000,(next()%721)-360,(next()%4097)-2048,(next()%2001)-1000,(next()%201)-100,(next()%201)-100,(next()%4001)-2000]);
    // Node bounds huge source components before the pinned mathematical month
    // normalization. Independently reduce the exact integer quotient/remainder
    // to year zero, then ask Node only about that ordinary local calendar date.
    for(const exponent of [57,100,500,1000])for(const sign of [-1,1]){
        const month=sign*2**exponent,m=BigInt(month),q=m>=0n?m/12n:-((-m+11n)/12n);
        const args=[-Number(q),month,1,0,0,0,0],referenceMonth=Number(m-q*12n);
        records.push({label:`exact-month:${sign}:${exponent}`,method:'construct',args,referenceMonth});
        records.push({label:`exact-month-setter:${sign}:${exponent}`,method:'setFullYear',args:args.slice(0,3),referenceMonth});
    }
    return records;
}
function literal(value:number):string{return Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':String(value);}
function subject(records:Probe[],oracle:boolean,observation:boolean,noGc:boolean):string{
    const data=records.map(probe=>`{label:${JSON.stringify(probe.label)},method:${JSON.stringify(probe.method)},args:[${probe.args.map(literal)}],referenceMonth:${probe.referenceMonth??'undefined'},invalid:${!!probe.invalid}}`);
    return `const probes=[${data.join(',')}];
        function evaluate(probe){
            if(${oracle}&&probe.referenceMonth!==undefined){const date=new Date(0);if(probe.method==='construct')date.setHours(0,0,0,0);return date.setFullYear(0,probe.referenceMonth,1);}
            if(probe.method==='construct')return new Date(...probe.args).getTime();
            const date=new Date(probe.invalid?NaN:0);return date[probe.method].apply(date,probe.args);
        }
        const results=[];for(const probe of probes){const value=evaluate(probe);results.push(value);PRINT(probe.label+' '+String(value)+' '+Object.is(value,-0));}
        let tree=null;for(let depth=0;depth<512;depth++)tree={index:depth%probes.length,previous:tree};
        const owner={tree,probes,results,evaluate};tree=null;${observation&&!noGc?'$262.gc();':''}
        let cursor=owner.tree;while(cursor){if(!Object.is(owner.evaluate(owner.probes[cursor.index]),owner.results[cursor.index]))throw new Error('retained calendar result');cursor=cursor.previous;}
        PRINT('deep-local-calendar-worklist');`;
}

test('local construction and setters compose exact calendar Numbers before time-zone conversion',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-date-local-'));
    try{
        const records=probes(),expected=new Map<string,string[]>();
        for(const zone of ['UTC','Etc/GMT-1','Etc/GMT+1']){
            const entry=path.join(temporary,'reference.mjs');await fs.writeFile(entry,subject(records,true,false,true).replaceAll('PRINT','print'));
            const reference=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e','const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',entry],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone}});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});expected.set(zone,reference.stdout.toString().trimEnd().split('\n'));
        }
        expect(expected.get('UTC')).toContain('negative-epoch-second -1000 false');expect(expected.get('UTC')).toContain('ordered-time-number 29312 false');
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,'main.mjs'),output=path.join(directory,'program');
            await fs.writeFile(entry,subject(records,false,profile,noGc).replaceAll('PRINT',profile?'print':'console.log'));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/date-local.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            for(const [zone,reference] of expected){
                const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone,GC_FREE_SPACE_DIVISOR:'100'}});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
                const actual=(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n');
                expect(reference.flatMap((value,index)=>actual[index]===value?[]:[{zone,index,expected:value,actual:actual[index]}]).slice(0,12)).toEqual([]);expect(actual.length).toBe(reference.length);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
