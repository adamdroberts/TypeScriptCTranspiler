import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

const source=`
    const plans=[
        {name:'object',make:()=>({key:'object'}),read:value=>value.key},
        {name:'array',make:()=>['array',7],read:value=>value.join(':')},
        {name:'string',make:()=>('token:').repeat(2048),read:value=>[value.length,value.slice(-6)]},
        {name:'bigint',make:()=>BigInt('123456789012345678901234567890'),read:value=>value.toString()},
        {name:'symbol',make:()=>Symbol('retained'),read:value=>value.description},
        {name:'date',make:()=>new Date(946782245006),read:value=>[value.getTime(),value.getUTCFullYear()]},
        {name:'regexp',make:()=>new RegExp('ab','gi'),read:value=>[value.source,value.flags,value.test('AB')]},
        {name:'function',make:()=>function(value){return this.key+value;},read:value=>value.call({key:'call:'},7)},
        {name:'wrapper',make:()=>new Number(7),read:value=>value.valueOf()},
        {name:'primitive',make:()=>undefined,read:value=>typeof value}
    ];
    function observe(plan){const local=plan.make();COLLECT;
        let garbage;for(let index=0;index<512;index++)garbage={key:index,array:[index,'discard']};COLLECT;
        return plan.name+':'+JSON.stringify(plan.read(local));}
    function escape(plan){const local=plan.make();return ()=>plan.name+':'+JSON.stringify(plan.read(local));}
    for(const plan of plans)PRINT(observe(plan));
    let tree=null;for(let depth=0;depth<512;depth++)tree={read:escape(plans[depth%plans.length]),previous:tree};
    const owner={tree};tree=null;COLLECT;let cursor=owner.tree,index=511;
    while(cursor){const plan=plans[index%plans.length],actual=cursor.read(),expected=observe(plan);if(actual!==expected)throw new Error('retained cell:'+plan.name);cursor=cursor.previous;index--;}
    PRINT('deep-retained-lexical-cells');`;

test('boxed lexical cells retain their decoded root after the last store and through escaped owners',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-cell-lifetime-'));
    try{
        const referenceFile=path.join(temporary,'reference.mjs');await fs.writeFile(referenceFile,source.replaceAll('COLLECT','').replaceAll('PRINT','print'));
        const reference=Bun.spawnSync(['node','--experimental-vm-modules','--no-warnings','-e',
            'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:'UTC'}});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,'main.mjs'),output=path.join(directory,'program');
            await fs.writeFile(entry,source.replaceAll('COLLECT',profile&&!noGc?'$262.gc()':'').replaceAll('PRINT',profile?'print':'console.log'));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/cell-lifetime.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:'UTC',GC_FREE_SPACE_DIVISOR:'100'}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;
            if(observation)expect(observation).toMatchObject({kind:'normal'});
            expect(observation?observation.stdout:native.stdout.toString()).toBe(reference.stdout.toString());
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
