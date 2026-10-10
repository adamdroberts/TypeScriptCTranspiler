import {expect,test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

function subject(strict:boolean,profile:boolean,noGc:boolean):string{
    const depth=128;
    const pattern="[".repeat(depth)+"leaf = fallback()"+"]".repeat(depth);
    return `${strict?'export {};':''}
        function check(value:boolean,label:string):void{if(!value)throw label;${profile?'(globalThis as any).print':'console.log'}(label+':true');}
        function collect():void{${profile&&!noGc?'(globalThis as any).$262.gc();':''}}
        const marker={token:11},key=Symbol('key');let effects=0,events='';
        const keyInput:any={[Symbol.toPrimitive]():any{events+='K';return key;}};
        function fallback():any{effects++;collect();return marker;}
        const owner={
            marker,
            defaults(value:number=fallback(),later:any=value):any{collect();return [value,later,this,arguments.length];},
            retained(first:any=fallback(),capture:any=()=>first):any{return capture;},
            rest(first:number=fallback(),...tail:number[]):any{collect();return [first,tail,arguments.length];},
            pattern([first=fallback(),,[nested],...tail]:any):any{collect();return [first,nested,tail];},
            object({[keyInput]:selected=fallback(),nested:{value=fallback()},...rest}:any):any{collect();return [selected,value,rest];},
            close([first=fallback()]:any):any{return first;},
            reject([first=fail()]:any):any{return first;},
            // ECMAScript reads the later formal's uninitialized binding; TS rejects the source statically.
            // @ts-ignore
            tdz(first:any=second,second:any=53):any{return first;},
            captured(first:any=()=>second,second:any=fallback()):any{return first;},
            body(value:any=marker,read:any=()=>value):any{var value:any=59;return [value,read()];},
            async asyncBody(value:any=marker,read:any=()=>value):Promise<any>{var value:any=59;await Promise.resolve(0);return [value,read()];},
            *generatorBody(value:any=marker,read:any=()=>value):Generator<any,any,any>{var value:any=59;yield value;return read();},
            simpleBody(value:number):any{var value:number=59;return [value,arguments[0]];},
            mapped(value:number):any{arguments[0]=marker;const changed=value;value=17;return [changed,arguments[0]];},
            unmapped(value:number=fallback()):any{arguments[0]=23;return [value,arguments[0]];},
            missing(value:number):any{arguments[0]=marker;return [value,arguments.length];},
            context(this:any,value:any=[this,arguments.length]):any{return value;},
            async suspended(value:number=fallback(),capture:any=()=>value):Promise<any>{await Promise.resolve(0);collect();return [value,capture()];},
            *steps(value:number=fallback()):Generator<any,any,any>{yield value;collect();return value;},
            async *asyncSteps(value:number=fallback()):AsyncGenerator<any,any,any>{yield value;collect();return value;},
            async asyncReject(value:any=fail()):Promise<any>{return value;},
            *generatorReject(value:any=fail()):Generator<any,any,any>{yield value;},
            deep(${pattern}:any):any{return leaf;}
        };
        function fail():any{events+='D';throw marker;}
        function iterable(values:any[]):any{return {[Symbol.iterator]():any{events+='I';let index=0;return {next():any{events+='N';return index<values.length?{value:values[index++],done:false}:{done:true};},return():any{events+='C';return {};}};}};}
        async function verify():Promise<void>{
            const omitted=owner.defaults();check(omitted[0]===marker&&omitted[1]===marker&&omitted[2]===owner&&omitted[3]===0,'evaluated-default-and-actual-list');
            for(const value of [null,false,0,'',29n,key,marker,[],()=>31] as any[]){const actual=owner.defaults.call(owner,value);check(actual[0]===value&&actual[1]===value,'actual-value-kind');}
            const before=effects;check(owner.defaults(undefined)[0]===marker&&effects===before+1,'explicit-undefined-default');
            const capture=owner.retained();collect();check(capture()===marker,'retained-formal-cell');
            const rest:any=Reflect.apply(owner.rest,owner,[undefined,marker,key,null]);collect();check(rest[0]===marker&&rest[1][0]===marker&&rest[1][1]===key&&rest[1][2]===null&&rest[2]===4,'rest-actual-values');
            events='';const array=owner.pattern(iterable([undefined,99,[37],marker,key]));check(array[0]===marker&&array[1]===37&&array[2][0]===marker&&array[2][1]===key&&events==='INNNNNN','iterator-pattern-hole-nesting-rest');
            const other=Symbol('other');const source:any={nested:{},extra:41};source[other]=marker;
            events='';const object=owner.object(source);check(object[0]===marker&&object[1]===marker&&object[2].extra===41&&object[2][other]===marker&&!(key in object[2])&&!('nested' in object[2])&&events==='K','computed-symbol-and-object-rest');
            events='';check(owner.close(iterable([marker]))===marker&&events==='INC','normal-iterator-close');
            events='';try{owner.reject(iterable([undefined]));throw 'missing';}catch(error){check(error===marker&&events==='INDC','abrupt-default-close');}
            try{owner.tdz();throw 'missing';}catch(error){check(error instanceof ReferenceError,'later-formal-tdz');}
            const later=owner.captured();collect();check(later()===marker,'closure-sees-initialized-later-formal');
            const body=owner.body();check(body[0]===59&&body[1]===marker,'separate-parameter-and-body-bindings');
            const asyncBody=await owner.asyncBody();check(asyncBody[0]===59&&asyncBody[1]===marker,'async-separate-parameter-and-body-bindings');
            const generatorBody=owner.generatorBody();check(generatorBody.next().value===59&&generatorBody.next().value===marker,'generator-separate-parameter-and-body-bindings');
            const simpleBody=owner.simpleBody(61);check(simpleBody[0]===59&&simpleBody[1]===${strict?'61':'59'},'simple-shared-parameter-and-body-bindings');
            const mapped=owner.mapped(43);check(${strict?'mapped[0]===43&&mapped[1]===marker':'mapped[0]===marker&&mapped[1]===17'},'strict-or-mapped-arguments');
            const unmapped=owner.unmapped();check(unmapped[0]===marker&&unmapped[1]===23,'non-simple-unmapped-arguments');
            const missing:any=Reflect.apply(owner.missing,owner,[]);check(missing[0]===undefined&&missing[1]===0,'missing-actual-has-no-argument-alias');
            const context=owner.context();check(context[0]===owner&&context[1]===0,'default-this-and-arguments');
            const delayed=await owner.suspended();collect();check(delayed[0]===marker&&delayed[1]===marker,'async-retained-formals');
            const generator=owner.steps();check(generator.next().value===marker&&generator.next().value===marker,'generator-formal-initialization');
            const asynchronous=owner.asyncSteps();check((await asynchronous.next()).value===marker&&(await asynchronous.next()).value===marker,'async-generator-formal-initialization');
            try{await owner.asyncReject();throw 'missing';}catch(error){check(error===marker,'async-default-abrupt-rejection');}
            try{owner.generatorReject();throw 'missing';}catch(error){check(error===marker,'generator-default-abrupt-call');}
            let tree:any=undefined;for(let index=0;index<${depth};index++)tree=[tree];collect();check(owner.deep(tree)===marker,'deep-formal-binding-tree');
        }
        verify().catch((error:any)=>{${profile?'(globalThis as any).print':'console.log'}('failure:'+String(error));throw error;});`;
}

test("object member formals share actual Lists and canonical BindingInitialization",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-object-member-formals-"));
    const erase=(source:string,module:ts.ModuleKind)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module}}).outputText;
    try{
        for(const strict of [false,true]){
            const referenceFile=path.join(temporary,`reference-${strict}.cjs`);await fs.writeFile(referenceFile,erase(subject(strict,false,true),ts.ModuleKind.CommonJS));
            const reference=Bun.spawnSync(["node","-e",'const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.join(" ")+"\\n");require(process.argv[1]);',referenceFile],{stdout:"pipe",stderr:"pipe",timeout:120_000});
            expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const expected=reference.stdout.toString().trimEnd().split("\n");expect(expected.at(-1)).toBe("deep-formal-binding-tree:true");
            for(const typed of [true,false])for(const profile of [false,true])for(const noGc of [false,true]){
                const directory=path.join(temporary,`${strict}-${typed}-${profile}-${noGc}`);await fs.mkdir(directory);
                const entry=path.join(directory,typed?"main.ts":strict?"main.mjs":"main.js"),output=path.join(directory,"program"),diagnostics:string[]=[];
                const source=subject(strict,profile,noGc);await fs.writeFile(entry,typed?source:erase(source,ts.ModuleKind.ESNext));
                const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(strict?{moduleRoots:[entry]}:{}),initializationEntries:[entry],
                    ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/object-member-formals.js#"+(strict?"module":"sloppy"),setupEntries:[],testEntry:entry,async:false,scriptEntries:strict?[]:[entry]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
                expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
                const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
                expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
                const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
                expect((observation?observation.stdout??'':native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
