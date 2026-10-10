import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function inputs():string[]{
    const result:string[]=[];
    const years=['0000','0099','2000','-000001','+010000','+000000'],timeForms=['','T00:00','T12:34:56','T23:59:59.123'],zones=['','Z','+01:30','-01:15'];
    for(let index=0;index<96;index++){
        const calendar=[years[index%years.length]!,'02','28'].slice(0,index%3+1).join('-'),time=timeForms[Math.floor(index/3)%timeForms.length]!;
        result.push(calendar+time+(time?zones[Math.floor(index/12)%zones.length]!:''));
    }
    result.push('1995-02-04T24:00Z','1995-02-04T24:00:00.000','2020-02-31T00:00Z',
        '-271821-04-20T00:00:00.000Z','+275760-09-13T00:00:00.000Z',
        '-271821-04-19T23:00:00-01:00','+275760-09-13T01:00:00+01:00',
        '1970-01-01T00:00:00.'+'1234567890'.repeat(819)+'Z',
        '1970-01-01t00:00:00.1z','1970-01-01T00:00:00.12Z');
    result.push('-000000-03-31T00:45Z','-000000-03-31T01:45',
        '-271821-04-19T23:59:59.999Z','+275760-09-13T00:00:00.001Z',
        '2020-00-01T00:00Z','2020-13-01T00:00Z','2020-01-00T00:00Z','2020-01-32T00:00Z',
        '2020-01-01T25:00Z','2020-01-01T00:60Z','2020-01-01T00:00:60Z',
        '2020-01-01T24:00:00.001Z','2020-01-01T24:01Z','2020-01-01T00:00+24:00',
        '2020-01-01T00:00+00:60','2020-01-01T00:00:00.Z','2020-01-01T00:00:.000Z',
        '2020-01-01T00:00Z\u0000','2020-01-01T00:00\uff3a','not a date');
    return result;
}
function timestamps():number[]{
    const values=[-8640000000000000,8640000000000000,-1000,0,1000];
    for(const year of [-10000,-1,0,99,2000,9999,10000]){const date=new Date(0);date.setUTCFullYear(year);values.push(date.getTime());}
    let state=0x81da7e;for(let index=0;index<32;index++){state=(Math.imul(state,1664525)+1013904223)>>>0;values.push(Math.trunc((state/4294967296*2-1)*8640000000000)*1000);}
    return values;
}
function subject(texts:string[],values:number[]):string{
    return `const texts=${JSON.stringify(texts)},values=${JSON.stringify(values)},parse=Date.parse;
        function inspect(text){const hints=[],input={[Symbol.toPrimitive](hint){hints.push(hint);COLLECT;return text;}};
            const parsed=parse.call(null,input),constructed=new Date(input).getTime();
            if(!Object.is(parsed,constructed)||hints.join('|')!=='string|default')throw new Error('parse/construct/coercion:'+text);
            return String(parsed);}
        const expected=[];for(const text of texts){const actual=inspect(text);expected.push(actual);PRINT(actual);}
        ROUNDTRIP
        let tree=null;for(let depth=0;depth<512;depth++)tree={index:depth%texts.length,previous:tree};
        const owner={tree,parse,inspect,texts,expected};tree=null;COLLECT;let cursor=owner.tree;
        while(cursor){const text=owner.texts[cursor.index],parsed=owner.parse(text);if(String(parsed)!==owner.expected[cursor.index]||!Object.is(parsed,new Date(text).getTime()))throw new Error('retained parse');cursor=cursor.previous;}
        PRINT('deep-retained-date-text');`;
}
const roundtrip=`for(const value of values){const date=new Date(value);
    for(const text of [date.toISOString(),date.toUTCString(),date.toString()]){
        if(parse(text)!==value||new Date(text).getTime()!==value)throw new Error('runtime text roundtrip:'+value+':'+text+':'+parse(text));}}
    PRINT('runtime-produced-text-roundtrip');`;

test('Date text grammar projects optional fields, expanded years and runtime text through one calendar record',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-date-parse-'));
    try{
        const texts=inputs(),values=timestamps(),expected=new Map<string,string[]>();
        for(const zone of ['UTC','Etc/GMT-1','Etc/GMT+1']){
            // Node rejects negative civil-year text. The native roundtrip below
            // instead uses independent millisecond values required by the pin.
            const entry=path.join(temporary,'reference.mjs');await fs.writeFile(entry,subject(texts,values).replace('ROUNDTRIP',"PRINT('runtime-produced-text-roundtrip');").replaceAll('COLLECT','').replaceAll('PRINT','print'));
            const reference=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',
                'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',entry],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone}});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});// The selected implementation-specific grammar rejects embedded NUL
            // rather than Node's truncating legacy fallback.
            const lines=reference.stdout.toString().trimEnd().split('\n');
            for(let index=0;index<texts.length;index++)if(texts[index]!.includes('\u0000'))lines[index]='NaN';
            expected.set(zone,lines);
        }
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,'main.mjs'),output=path.join(directory,'program');
            await fs.writeFile(entry,subject(texts,values).replace('ROUNDTRIP',roundtrip).replaceAll('COLLECT',profile&&!noGc?'$262.gc()':'').replaceAll('PRINT',profile?'print':'console.log'));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/date-parse.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            for(const [zone,reference] of expected){
                const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone,GC_FREE_SPACE_DIVISOR:'100'}});
                if(native.exitCode!==0)throw new Error(JSON.stringify({profile,noGc,zone,exitCode:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString().slice(-1500)}));
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
                if(observation)expect(observation).toMatchObject({kind:'normal'});
                const actual=(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n');
                expect(reference.flatMap((value,index)=>actual[index]===value?[]:[{zone,index,text:texts[index],expected:value,actual:actual[index]}]).slice(0,4)).toEqual([]);expect(actual.length).toBe(reference.length);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
