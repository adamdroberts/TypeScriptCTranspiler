import {expect, test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

// Source inference describes a declaration's apparent value, while ordinary
// invocation supplies its actual value. Node independently observes identity,
// Type and evaluation effects after that value crosses source ABI boundaries.
function subject(observation=false,noGc=false):string {
    const lines=[`import {Buffer} from 'node:buffer';
        const report=(...values:any[]):void=>{${observation ? "(globalThis as any).print(values.join(' '));" : "console.log(values.join(' '));"}};
        const collect=():void=>{${observation&&!noGc ? "(globalThis as any).$262.gc();" : ''}};
        const date=new Date(0),bytes=Buffer.from([1]);let expected:any;
        function declared(){return date.getTime();}
        const closure=()=>declared();
        function relay(){return closure();}
        function record(){return {value:declared()};}
        function collection(){return [relay()];}
        class Owner { value=declared(); read(){return this.value;} get result(){return this.value;} }
        function byteResult(){return bytes.readUInt8();}
        const byteClosure=()=>byteResult();
        async function suspended(){await Promise.resolve(0);return declared();}
        let ignoredEffects=0;
        function scalar(){declared();ignoredEffects++;return 42;}
        async function verify(){`];
    for(const [index,value] of ["'text'","({marker:true})","Symbol('result')","1n","undefined","NaN","-0","true","null"].entries()) {
        lines.push(`{expected=${value};
            Object.defineProperty(Date.prototype,'getTime',{value:()=>expected,writable:true,configurable:true});
            Object.defineProperty(Object.getPrototypeOf(bytes),'readUInt8',{value:()=>expected,writable:true,configurable:true});
            const owner=new Owner(),literal={value:declared()},array=[relay()],selected=true?record():literal;
            const actuals=[declared(),closure(),relay(),owner.value,owner.read(),owner.result,literal.value,array[0],selected.value,record().value,collection()[0],byteResult(),byteClosure()];
            collect();
            for(const actual of actuals)if(!Object.is(actual,expected)||typeof actual!==typeof expected)throw new Error('source-flow:${index}:'+typeof actual);
            const awaited=await suspended();collect();if(!Object.is(awaited,expected)||typeof awaited!==typeof expected)throw new Error('awaited-source-flow:${index}');
            if(scalar()!==42)throw new Error('unrelated-return');report('partition:${index}',true);}`);
    }
    lines.push(`expected={deep:true};Object.defineProperty(Date.prototype,'getTime',{value:()=>expected,writable:true,configurable:true});
        const deep=retained512();collect();if(!Object.is(deep,expected))throw new Error('deep-source-flow');
        report('deep-source-flow',true,'effects',ignoredEffects);}
        function retained0(){return date.getTime();}`);
    // One representative high-depth call/declaration dependency graph. No
    // depth-specific admission or lowering is part of the implementation.
    for(let depth=1;depth<=512;depth++)lines.push(`function retained${depth}(){return retained${depth-1}();}`);
    lines.push("verify().catch((error:any)=>{report('failure',error.message);throw error;});");
    return lines.join('\n');
}

test('ordinary native results retain actual values across inferred source ABI slots',async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-source-flow-'));
    try {
        const referenceFile=path.join(temporary,'reference.cjs');
        await fs.writeFile(referenceFile,ts.transpileModule(subject(),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS}}).outputText);
        const reference=Bun.spawnSync(['node','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:'pipe',stderr:'pipe'});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        const expected=reference.stdout.toString().trimEnd().split('\n');expect(expected.at(-1)).toBe('deep-source-flow true effects 9');
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,'main.ts'),output=path.join(directory,'program');await fs.writeFile(entry,subject(profile,noGc));
            const diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/source-flow.js#module',setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:'normal'});
            expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
