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
    return `export {};
        function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+':true');}
        function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
        let events='';let moduleTarget:any=0;
        function iterable(values:any[],cleanupFailure:any=null):any{return {[Symbol.iterator](){events+='I';let index=0;return {next(){events+='N';collect();return index<values.length?{value:values[index++],done:false}:{done:true};},return(){events+='C';collect();if(cleanupFailure)throw cleanupFailure;return {};}};}};}
        async function fallback(value:any):Promise<any>{events+='D';await Promise.resolve(0);collect();events+='d';return value;}
        const output:any={set value(value:any){events+='S';output.saved=value;}};
        async function receiver():Promise<any>{events+='R';await Promise.resolve(0);return output;}
        const targetKey:any={[Symbol.toPrimitive](){events+='K';collect();return 'value';}};
        async function key():Promise<any>{events+='E';await Promise.resolve(0);return targetKey;}
        function* generatorDefault(source:any):Generator<string,any,any>{let value:any=0;[value=yield 'pause']=source;return value;}
        function* generatorGlobal(source:any):Generator<any,any,any>{return [moduleTarget=yield]=source;}
        function* generatorNested(source:any):Generator<string,any,any>{let value:any=0;[[value=yield 'pause']]=source;return value;}
        async function* asyncGeneratorDefault(source:any):AsyncGenerator<string,any,any>{let value:any=0;[value=yield 'pause']=source;return value;}
        async function verify():Promise<void>{
            let first:any=0,nested:any=0,rest:any;
            events='';const source=iterable([undefined,5,{value:17},19,23]);
            const returned=([first=await fallback(11),,{value:nested},...rest]=source);
            check(first===11 && nested===17 && rest.join('|')==='19|23' && returned===source && events==='INDdNNNNN','awaited-assignment-iterator-and-rest');
            events='';const [declared=await fallback(29)]=iterable([undefined]);
            check(declared===29 && events==='INDdC','awaited-declaration-iterator-close');
            for(const value of [undefined,null,true,53,'text',67n,Symbol('value'),{},[71],()=>73] as any[]){
                events='';const [actual=await fallback(value)]=iterable([undefined]);
                check(actual===value && events==='INDdC','awaited-default-actual-value');
            }
            events='';const [undefinedDefault=await Promise.resolve(undefined)]=iterable([undefined]);
            check(undefinedDefault===undefined && events==='INC','awaited-void-default');
            events='';const propertySource=iterable([undefined]);
            [(await receiver())[await key()]=await fallback(31)]=propertySource;
            check(output.saved===31 && events==='IRENDdKSC','awaited-reference-before-step-default-put-close');
            const symbol=Symbol('source');const sourceKey:any={[Symbol.toPrimitive](){events+='P';collect();return symbol;}};
            const objectSource:any={get [symbol](){events+='G';collect();return undefined;},extra:37};
            events='';const objectResult=({[await Promise.resolve(sourceKey)]:(await receiver())[await key()]=await fallback(41),...rest}=objectSource);
            check(objectResult===objectSource && output.saved===41 && rest.extra===37 && Object.getOwnPropertySymbols(rest).length===0 && events==='PREGDdKS','saved-source-key-symbol-rest');
            const marker={tag:'failure'};
            events='';try{[first=await fallback(43)]=iterable([undefined],marker);throw 'missing close failure';}catch(error){check(error===marker && first===43 && events==='INDdC','normal-close-error-after-put');}
            events='';try{[first=await Promise.reject(marker)]=iterable([undefined],'cleanup');throw 'missing rejection';}catch(error){check(error===marker && events==='INC','rejected-default-close-precedence');}
            events='';try{[(await Promise.reject(marker) as any).value]=iterable([11]);throw 'missing reference rejection';}catch(error){check(error===marker && events==='IC','rejected-reference-before-step');}
            events='';const abrupt:any={[Symbol.iterator](){events+='I';return {next(){events+='N';throw marker;},return(){events+='C';return {};}};}};
            try{[first=await fallback(43)]=abrupt;throw 'missing next failure';}catch(error){check(error===marker && events==='IN','next-abrupt-no-close');}
            events='';const empty:any=iterable([]);([]=await Promise.resolve(empty));check(events==='IC','awaited-empty-array-close');
            for(const value of [null,undefined] as any[]){try{({}=await Promise.resolve(value));throw 'missing coercion';}catch(error){check(error instanceof TypeError,'awaited-empty-object-coercion');}}
            events='';const resumed=generatorDefault(iterable([undefined]));const pause=resumed.next();collect();const completed=resumed.next(marker);
            check(pause.value==='pause' && !pause.done && completed.value===marker && completed.done===true && events==='INC','yielded-default-next-close');
            events='';const globalSource=iterable([undefined]),globalGenerator=generatorGlobal(globalSource);const globalPause=globalGenerator.next(),globalComplete=globalGenerator.next(marker);
            check(globalPause.value===undefined && !globalPause.done && globalComplete.value===globalSource && globalComplete.done===true && moduleTarget===marker && events==='INC','yielded-module-reference-and-source-result');
            events='';const returnedGenerator=generatorDefault(iterable([undefined]));returnedGenerator.next();const injected=returnedGenerator.return(marker);
            check(injected.value===marker && injected.done===true && events==='INC','yielded-default-return-close');
            events='';const thrownGenerator=generatorDefault(iterable([undefined],'cleanup'));thrownGenerator.next();try{thrownGenerator.throw(marker);throw 'missing throw';}catch(error){check(error===marker && events==='INC','yielded-default-throw-close');}
            events='';const nestedGenerator=generatorNested(iterable([iterable([undefined],marker)],'outer cleanup'));nestedGenerator.next();
            try{nestedGenerator.return({tag:'return'});throw 'missing nested close';}catch(error){check(error===marker && events==='ININCC','yielded-nested-return-close-unwind');}
            events='';const asynchronous=asyncGeneratorDefault(iterable([undefined]));const asyncPause=await asynchronous.next();collect();const asyncCompleted=await asynchronous.next(marker);
            check(asyncPause.value==='pause' && !asyncPause.done && asyncCompleted.value===marker && asyncCompleted.done===true && events==='INC','async-yielded-default-next-close');
            let tree:any={};for(let index=0;index<${depth};index++)tree={child:tree};
            (${"{child:".repeat(depth)}{value:first=await fallback(47)}${"}".repeat(depth)}=tree);
            collect();check(first===47,'deep-suspending-binding-tree');
        }
        verify().catch((error:any)=>{${profile?'(globalThis as any).print':'console.log'}('failure:'+String(error));throw error;});`;
}

test("suspending patterns retain the canonical binding tree, Iterator Records and References",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-suspending-binding-tree-"));
    try{
        const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
        const referenceFile=path.join(temporary,"reference.cjs");await fs.writeFile(referenceFile,erase(subject(false,true),ts.ModuleKind.CommonJS));
        const reference=nodeReferenceSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-suspending-binding-tree:true");
        for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,typed?"main.ts":"main.mjs"),output=path.join(directory,"program"),diagnostics:string[]=[];
            const source=subject(profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
            const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/suspending-binding-tree.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
