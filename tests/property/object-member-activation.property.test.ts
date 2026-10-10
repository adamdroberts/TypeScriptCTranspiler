import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
    return `${strict?'export {};':''}
        function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+':true');}
        function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
        const key=Symbol('member');
        function factory(tag:any):any{return {
            tag,
            identity(){collect();return this;},
            [key]():any{return this;},
            get value():any{collect();return this.tag;},
            set value(value:any){collect();this.tag=value;},
            capture():any{return ()=>this;},
            // @ts-ignore -- ECMAScript permits new.target in MethodDefinition bodies.
            context(...values:any[]):any{return [this,arguments.length,new.target,()=>arguments.length];},
            async suspended(value:any):Promise<any>{await Promise.resolve(0);collect();return [this,value,()=>this];},
            *steps():Generator<any,any,any>{yield this;collect();return this;},
            async *asyncSteps():AsyncGenerator<any,any,any>{yield this;collect();return this;}
        };}
        class NativeReceiver{field=19;}
        const explicit={method(this:NativeReceiver,value:number):number{return this.field+value;}};
        const native={tag:101,identity(){return this;},add(amount:number):number{return this.tag+amount;}};
        async function verify():Promise<void>{
            const owner=factory(11),receiver:any={tag:17};
            check(owner.identity()===owner && owner[key]()===owner,'member-owner-identity');
            const alias=owner.identity;
            check(alias.call(receiver)===receiver && alias.bind(receiver)()===receiver && Reflect.apply(alias,receiver,[])===receiver,'borrowed-and-bound-receivers');
            const marker={token:23};
            check(Reflect.get(owner,'value',receiver)===17 && Reflect.set(owner,'value',marker,receiver) && receiver.tag===marker && owner.tag===11,'accessor-actual-receiver');
            const descriptor:any=Object.getOwnPropertyDescriptor(owner,'value');
            check(descriptor.get.call(receiver)===marker && descriptor.enumerable && descriptor.configurable,'accessor-closure-and-descriptor');
            for(const callable of [alias,descriptor.get,descriptor.set]){try{Reflect.construct(callable,[]);throw 'missing construct error';}catch(error){check(error instanceof TypeError,'member-non-constructability');}}
            const arrow=owner.capture.call(receiver);collect();check(arrow.call(owner)===receiver,'lexical-arrow-receiver');
            const context=owner.context.call(receiver,29,31,37);collect();
            check(context[0]===receiver && context[1]===3 && context[2]===undefined && context[3]()===3,'actual-arguments-and-new-target');
            for(const value of [undefined,null,true,41,'text',43n,Symbol('receiver'),{},[],()=>47] as any[]){
                const actual=alias.call(value);collect();
                check(${strict?'actual===value':'value==null?actual===globalThis:typeof value===\'object\'||typeof value===\'function\'?actual===value:typeof actual===\'object\'&&actual.valueOf()===value'},'receiver-value-kind');
            }
            const result=await owner.suspended.call(receiver,marker);collect();
            check(result[0]===receiver && result[1]===marker && result[2]()===receiver,'suspended-member-receiver');
            const generator=owner.steps.call(receiver);const pause=generator.next();collect();const completed=generator.next();
            check(pause.value===receiver && !pause.done && completed.value===receiver && completed.done===true,'generator-member-receiver');
            const asynchronous=owner.asyncSteps.call(receiver),asyncPause=await asynchronous.next();collect();const asyncCompleted=await asynchronous.next();
            check(asyncPause.value===receiver && !asyncPause.done && asyncCompleted.value===receiver && asyncCompleted.done===true,'async-generator-member-receiver');
            check(explicit.method.call(new NativeReceiver(),23)===42,'explicit-native-this-convention');
            check(native.identity()===native && native.add(2)===103,'native-structural-member-view');
            const inferredAlias:any=native.identity;check(inferredAlias.call(receiver)===receiver && inferredAlias.call(null)===${strict?'null':'globalThis'},'inferred-member-result-identity');
            let tree:any={owner,arrow};for(let index=0;index<512;index++)tree={child:tree};collect();
            let leaf=tree;for(let index=0;index<512;index++)leaf=leaf.child;
            check(leaf.owner.identity()===owner && leaf.arrow()===receiver,'deep-retained-member-owner-tree');
        }
        verify().catch((error:any)=>{${profile?'(globalThis as any).print':'console.log'}('failure:'+String(error));throw error;});`;
}

test("ordinary object members share actual activation values across native views and suspension",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-object-member-activation-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-retained-member-owner-tree:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/object-member-activation.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
