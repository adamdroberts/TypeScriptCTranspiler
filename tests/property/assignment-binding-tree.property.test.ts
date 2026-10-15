import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(profile:boolean,noGc:boolean):string{
    const depth=256;
    const actuals=["({marker:true})","'actual'","Symbol('actual')","1n","undefined","NaN","-0"].map((value,index)=>`
        {expected=${value};Object.defineProperty(Date.prototype,'getTime',{value:()=>expected,configurable:true,writable:true});
        let scalar:number=0;const owner={value:0};
        [scalar]=[date.getTime()];({value:owner.value}={value:date.getTime()});
        collect();check(Object.is(scalar,expected) && Object.is(owner.value,expected),'actual-write:${index}');}
    `).join("\n");
    return `export {};
        function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+':true');}
        function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
        let first:any=0,next:any=0,rest:any;
        const source:any=[undefined,5,{value:17},19,23];
        const returned=([first=11,,{value:next},...rest]=source);
        check(first===11 && next===17 && rest.join('|')==='19|23' && returned===source,'array-result-identity');
        const record:any={nested:{value:29},extra:31};
        const returnedObject=({nested:{value:first},...rest}=record);
        check(first===29 && rest.extra===31 && returnedObject===record,'object-result-identity');
        ({first=37}={} as any);[...[first,...rest]]=[41,43,47];
        check(first===41 && rest.join('|')==='43|47','shorthand-and-nested-array-rest');
        let events='';const output:any={set value(value:any){events+='S';output.saved=value;}};
        const key:any={[Symbol.toPrimitive](){events+='K';collect();return 'value';}};
        function receiver():any{events+='R';collect();return output;}
        function targetKey():any{events+='E';return key;}
        function fallback():number{events+='D';collect();return 53;}
        const iterable:any={[Symbol.iterator](){events+='I';return {next(){events+='N';collect();return {value:undefined,done:false};},return(){events+='C';collect();return {};}};}};
        [receiver()[targetKey()]=fallback()]=iterable;
        check(output.saved===53 && events==='IRENDKSC','array-reference-step-default-put-close');
        events='';const objectSource:any={get value(){events+='G';collect();return undefined;},extra:59};
        function sourceKey():string{events+='P';return 'value';}
        ({[sourceKey()]:receiver()[targetKey()]=fallback(),...rest}=objectSource);
        check(output.saved===53 && rest.extra===59 && events==='PREGDKS','object-reference-get-default-put-rest');
        const symbol=Symbol('selected');const symbolSource:any={[symbol]:61,extra:67};
        ({[symbol]:first,...rest}=symbolSource);
        check(first===61 && rest.extra===67 && Object.getOwnPropertySymbols(rest).length===0,'symbol-key-rest');
        events='';const marker={};function failure():any{events+='F';collect();throw marker;}
        try{[receiver()[targetKey()]=failure()]=iterable;}catch(error){check(error===marker && events==='IRENFC','abrupt-default-close');}
        events='';function badReceiver():any{events+='B';throw marker;}
        try{[badReceiver().value]=iterable;}catch(error){check(error===marker && events==='IBC','abrupt-reference-close');}
        events='';[]=iterable;check(events==='IC','empty-array-close');
        for(const value of [null,undefined]){try{({}=value as any);throw 'missing object coercion';}catch(error){check(error instanceof TypeError,'empty-object-coercion');}}
        const frozen:any=Object.freeze({value:0});events='';
        try{[frozen.value]=iterable;}catch(error){check(error instanceof TypeError && events==='INC','strict-write-close');}
        const fixed=71;events='';
        try{[fixed as any]=iterable;}catch(error){check(error instanceof TypeError && events==='INC','immutable-write-close');}
        const date=new Date(0);let expected:any;${actuals}
        async function suspended():Promise<void>{let retained:any=0;const values:any=await Promise.resolve([{token:73}]);[retained]=values;await Promise.resolve(0);collect();check(retained.token===73,'assignment-between-suspensions');}
        suspended().then(()=>{
            let tree:any=79;for(let index=0;index<${depth};index++)tree={child:tree};
            (${"{child:".repeat(depth)}first${"}".repeat(depth)}=tree);collect();check(first===79,'deep-assignment-binding-tree');
        }).catch((error:any)=>{${profile?'(globalThis as any).print':'console.log'}('failure:'+String(error));throw error;});`;
}

test("assignment References and declarations consume one binding tree",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-assignment-binding-tree-"));
    try{
        const erased=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
        const referenceFile=path.join(temporary,"reference.cjs");await fs.writeFile(referenceFile,erased(subject(false,true),ts.ModuleKind.CommonJS));
        const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-assignment-binding-tree:true");
        for(const typed of [false,true])for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,typed?"main.ts":"main.mjs"),output=path.join(directory,"program"),diagnostics:string[]=[];
            const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erased(source,ts.ModuleKind.ESNext));
            const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/assignment-binding-tree.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
