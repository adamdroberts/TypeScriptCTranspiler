import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function times():number[]{
    const values=[-8640000000000000,8640000000000000,-8640000000000001,8640000000000001,NaN,Infinity,-Infinity,-1000,-1,-0,0,1,999,1000];
    for(const year of [-10000,-9999,-1000,-999,-1,0,1,9,10,99,100,999,1000,9999,10000]){
        const date=new Date(0);date.setUTCFullYear(year,0,1);values.push(date.getTime(),date.getTime()-1);
    }
    let state=0x79da7e;for(let index=0;index<96;index++){state=(Math.imul(state,1664525)+1013904223)>>>0;values.push(Math.trunc((state/4294967296*2-1)*8640000000000000));}
    return values;
}
function literal(value:number):string{return Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':String(value);}
function subject(values:number[],profile:boolean,noGc:boolean):string{
    return `const times=[${values.map(literal)}],ISO=Date.prototype.toISOString;
        function inspect(value){const date=new Date(value);
            if(Number.isNaN(date.getTime())){let caught=false;try{ISO.call(date);}catch(error){caught=error instanceof RangeError;}if(!caught||date.toJSON()!==null)throw new Error('invalid ISO/JSON');return [date.toUTCString(),date.toDateString(),date.toString()];}
            const year=date.getUTCFullYear(),localYear=date.getFullYear(),iso=ISO.call(date),magnitude=String(Math.abs(year));
            const isoYear=year>=0&&year<=9999?magnitude.padStart(4,'0'):(year<0?'-':'+')+magnitude.padStart(6,'0');
            const civil=(year<0?'-':'')+magnitude.padStart(4,'0'),localCivil=(localYear<0?'-':'')+String(Math.abs(localYear)).padStart(4,'0');
            if(iso.slice(0,isoYear.length)!==isoYear||iso.charAt(isoYear.length)!=='-'||date.toJSON()!==iso)throw new Error('ISO sign/magnitude:'+year+':'+isoYear+':'+iso+':'+date.toJSON());
            if(!date.toUTCString().includes(' '+civil+' ')||!date.toDateString().endsWith(' '+localCivil))throw new Error('civil sign/magnitude:'+year+':'+civil+':'+localCivil+':'+date.toUTCString()+':'+date.toDateString());
            return [iso,date.toJSON(),date.toUTCString(),date.toDateString(),date.toString().replace(/ \\([^)]*\\)$/,'')];}
        const expected=[];for(const value of times){let text;try{text=JSON.stringify(inspect(value));}catch(error){PRINT('failure:'+value+':'+error.message);throw error;}expected.push(text);PRINT(text);}
        let tree=null;for(let depth=0;depth<512;depth++)tree={index:depth%times.length,previous:tree};const owner={tree,inspect,times,expected,ISO};tree=null;${profile&&!noGc?'$262.gc();':''}
        let cursor=owner.tree;while(cursor){try{const actual=JSON.stringify(owner.inspect(owner.times[cursor.index])),saved=owner.expected[cursor.index];if(actual!==saved)throw new Error('retained year format:'+cursor.index+':'+actual+':'+saved);}catch(error){PRINT('retained-failure:'+cursor.index+':'+error.message);throw error;}cursor=cursor.previous;}PRINT('deep-retained-year-text');`;
}

test('Date year text separates sign, magnitude and prescribed ISO/civil padding',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-date-text-'));
    try{
        const values=times(),expected=new Map<string,string[]>();
        for(const zone of ['UTC','Etc/GMT-1','Etc/GMT+1']){
            const entry=path.join(temporary,'reference.mjs');await fs.writeFile(entry,subject(values,false,true).replaceAll('PRINT','print'));
            const reference=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e','const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',entry],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone}});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});expected.set(zone,reference.stdout.toString().trimEnd().split('\n'));
        }
        expect(expected.get('UTC')![0]).toContain('-271821-04-20T00:00:00.000Z');expect(expected.get('UTC')![1]).toContain('+275760-09-13T00:00:00.000Z');
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);const entry=path.join(directory,'main.mjs'),output=path.join(directory,'program');await fs.writeFile(entry,subject(values,profile,noGc).replaceAll('PRINT',profile?'print':'console.log'));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/date-text.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            for(const [zone,reference] of expected){
                const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:zone,GC_FREE_SPACE_DIVISOR:'100'}});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});const actual=(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n');
                expect(reference.flatMap((value,index)=>actual[index]===value?[]:[{zone,index,expected:value,actual:actual[index]}]).slice(0,8)).toEqual([]);expect(actual.length).toBe(reference.length);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
