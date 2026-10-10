import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile=false,noGc=true):string{
    const source=`const report=(...values:any[]):void=>{PRINT(values.join(' '));};
        function check(condition:any,label:string):void{if(!condition)throw new Error(label);report(label);}
        const initial=Date,descriptor=Object.getOwnPropertyDescriptor(globalThis,'Date')!,raw={},ignored:any={[Symbol.toPrimitive](){throw raw;}};
        check(typeof Date(ignored)==='string','plain-ignores-coercion');
        const events:string[]=[];
        function argument(label:string,value:any):any{events.push('arg:'+label);return {valueOf(){events.push('coerce:'+label);COLLECT;return value;}};}
        const converted=new Date(argument('year',2000),argument('month',0),argument('day',2),argument('hour',3),argument('minute',4),argument('second',5),argument('ms',6),ignored);
        check(converted.getTime()===946782245006&&events.join('|')==='arg:year|arg:month|arg:day|arg:hour|arg:minute|arg:second|arg:ms|coerce:year|coerce:month|coerce:day|coerce:hour|coerce:minute|coerce:second|coerce:ms','all-actuals-before-conversion');
        const copied:any=new Date(12345);Object.defineProperty(copied,Symbol.toPrimitive,{value:()=>{throw raw;},configurable:true});
        check(new Date(copied).getTime()===12345,'copy-slot-before-hooks');
        const prototype={marker:'alternate'};
        const alternate:any=new Proxy(function(){},{get(target:any,key:any){if(key==='prototype'){events.push('prototype');COLLECT;return prototype;}return Reflect.get(target,key);}});
        events.length=0;
        const reflected:any=Reflect.construct(initial,[{valueOf(){events.push('convert');COLLECT;return 12345;}}],alternate);
        check(Object.getPrototypeOf(reflected)===prototype&&initial.prototype.getTime.call(reflected)===12345&&events.join('|')==='convert|prototype','conversion-before-prototype');
        events.length=0;let caught=false;
        try{Reflect.construct(initial,[{valueOf(){events.push('convert');throw raw;}}],alternate);}catch(error){caught=error===raw;}
        check(caught&&events.join('|')==='convert','abrupt-before-prototype');
        const values:any[]=['string',({marker:true}),Symbol('value'),1n,undefined,NaN,42];
        for(const expected of values){
            Object.defineProperty(globalThis,'Date',{value:()=>expected,writable:true,configurable:true});
            const result=Date(),alias=result;
            check(Object.is(result,expected)&&Object.is(alias,expected)&&typeof alias===typeof expected,'actual-plain-result:'+typeof expected);
        }
        for(const value of [null,Symbol('noncallable'),({}),17]){
            Object.defineProperty(globalThis,'Date',{value,writable:true,configurable:true});
            let callCaught=false,constructCaught=false,effects=0;
            function effect():any{effects++;return 0;}
            try{Date(effect());}catch(error){callCaught=error instanceof TypeError;}
            try{new Date(effect());}catch(error){constructCaught=error instanceof TypeError;}
            check(typeof Date===typeof value&&callCaught&&constructCaught&&effects===2,'ordinary-invalid-target:'+typeof value+':'+typeof Date+':'+callCaught+':'+constructCaught+':'+effects);
        }
        Object.defineProperty(globalThis,'Date',{value:()=>({}),writable:true,configurable:true});
        let arrowCaught=false;try{new Date();}catch(error){arrowCaught=error instanceof TypeError;}
        check(arrowCaught,'ordinary-nonconstructor');
        Reflect.deleteProperty(globalThis,'Date');events.length=0;
        function missingArgument():any{events.push('argument');return 0;}
        let missing=false;try{Date(missingArgument());}catch(error){missing=error instanceof ReferenceError;}
        check(typeof Date==='undefined'&&missing&&events.length===0,'ordinary-missing-reference');
        events.length=0;
        const expected:any={saved:true};
        const replacement:any=function(value:any):any{events.push('invoke:'+value);return expected;};
        Object.defineProperty(globalThis,'Date',{get(){events.push('lookup');return replacement;},configurable:true});
        function replace():any{events.push('argument');COLLECT;Object.defineProperty(globalThis,'Date',{value:()=>{throw raw;},writable:true,configurable:true});return 'saved';}
        const saved=Date(replace());check(saved===expected&&events.join('|')==='lookup|argument|invoke:saved','saved-plain-callee');
        events.length=0;
        Object.defineProperty(globalThis,'Date',{get(){events.push('lookup');return replacement;},configurable:true});
        const constructed=new Date(replace());check(constructed===expected&&events.join('|')==='lookup|argument|invoke:saved','saved-constructor');
        let observed=0;const sideEffect:any=function():any{observed++;return expected;};
        Object.defineProperty(globalThis,'Date',{value:sideEffect,writable:true,configurable:true});
        const unused=Date();const unusedNew=new Date();check(observed===2,'unused-invocation-effects');
        const D=Date,conditional=true?D:initial;
        const retained=new D(),called=conditional();COLLECT;
        check(retained===expected&&called===expected,'retained-constructor-owner');
        check(new globalThis.Date()===expected&&globalThis.Date()===expected,'global-property-owner');
        const key='Date';check(new globalThis[key]()===expected&&globalThis[key]()===expected,'computed-global-owner');
        Object.defineProperty(globalThis,'Date',descriptor);
        let tree:any=null;for(let depth=0;depth<512;depth++)tree={value:ignored,previous:tree};const owner={tree,initial};tree=null;COLLECT;
        const source:any={[Symbol.iterator](){let cursor=owner.tree,index=0;return {next(){if(index<7)return {value:[2000,0,1,0,0,0,0][index++],done:false};if(cursor){const value=cursor.value;cursor=cursor.previous;return {value,done:false};}return {done:true};}};}};
        check(new Date(...source).getTime()===946684800000&&typeof Date(...source)==='string','deep-retained-actual-list');`;
    return source.replaceAll('PRINT',profile?'(globalThis as any).print':'console.log').replaceAll('COLLECT',profile&&!noGc?'(globalThis as any).$262.gc()':'');
}

test('Date entry invocation shares saved ordinary owners, actual results, actual Lists and allocation order',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-date-entry-'));
    try{
        const referenceFile=path.join(temporary,'reference.cjs');await fs.writeFile(referenceFile,ts.transpileModule(subject(),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS}}).outputText);
        const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:'UTC'}});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const expected=reference.stdout.toString().trimEnd().split('\n');
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,'main.ts'),output=path.join(directory,'program');await fs.writeFile(entry,subject(profile,noGc));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/date-entry.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,TZ:'UTC',GC_FREE_SPACE_DIVISOR:'100'}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
            expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
