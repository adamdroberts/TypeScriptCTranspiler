import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// Source element collection versus runtime descriptor mutations are independent
// semantic partitions. All generated members use the same definition lowering.
function subject(): string {
    const members: string[] = [];
    const probes: string[] = [];
    for (const kind of ["field", "method", "accessor"]) {
        for (const spelling of ["plain", "with_$", "unicode_λ", ""]) {
            const key = JSON.stringify(`${kind}_${spelling}`);
            members.push(kind === "field" ? `static ${key} = {kind:${JSON.stringify(kind)}};`
                : kind === "method" ? `static ${key}(argument) { return this.marker + argument; }`
                : `static get ${key}() { return this.marker; } static set ${key}(value) { this.marker=value; }`);
            probes.push(`memberPartition(${key},${JSON.stringify(kind)});`);
        }
    }
    return `
        function check(value,label){if(!value)throw new Error(label);PRINT(label);}
        const events=[];
        class StaticOwner {
            static first=(events.push('first:'+Object.hasOwn(this,'later')),this.identity());
            static backing=3;
            static uninitialized;
            static { events.push('block:'+StaticOwner.backing+':'+Object.hasOwn(this,'later')); }
            static later=(events.push('later'),this.backing+1);
            static marker=10;
            static { let captured=20; this.firstCapture=()=>captured++; }
            static { let captured=40; this.secondCapture=()=>captured++; }
            static activation({value}= {value:2}, ...rest){return [this,arguments.length,value,rest.join('|')];}
            static functionValue(){return function(){return this;};}
            static get value(){events.push('get');return this.backing;}
            static set value(next){events.push('set:'+next);this.backing=next;}
            static identity(){return this;}
            static internalName(){return StaticOwner;}
            static [Symbol.iterator](){return this;}
            static get [Symbol.toStringTag](){return this.marker;}
            ${members.join("\n")}
        }
        const alias=StaticOwner,receiver={backing:30,marker:20};
        check(events.join('|')==='first:false|block:3:false|later','initialization-order');
        check(alias.first===alias && alias.identity()===alias && alias.internalName()===alias,'class-name-and-this');
        check(alias.firstCapture()===20 && alias.secondCapture()===40 && alias.firstCapture()===21,'static-block-cells');
        const activation=alias.activation.call(receiver,{value:7},8,9),defaultActivation=alias.activation();
        check(activation[0]===receiver && activation[1]===3 && activation[2]===7 && activation[3]==='8|9' && defaultActivation[0]===alias && defaultActivation[1]===0 && defaultActivation[2]===2 && defaultActivation[3]==='','ordinary-static-activation');
        const detached=alias.functionValue();check(detached()===undefined,'class-body-strictness');
        check(alias.uninitialized===undefined && Object.hasOwn(alias,'uninitialized'),'undefined-field');
        const descriptor=Object.getOwnPropertyDescriptor(alias,'value');
        check(!descriptor.enumerable && descriptor.configurable && descriptor.get.name==='get value' && descriptor.get.length===0 && descriptor.set.name==='set value' && descriptor.set.length===1,'accessor-descriptor');
        check(descriptor.get.call(receiver)===30 && Reflect.get(alias,'value',receiver)===30,'accessor-receiver');
        Reflect.set(alias,'value',31,receiver);check(receiver.backing===31 && alias.backing===3,'setter-receiver');
        check(alias.identity.call(receiver)===receiver && alias.identity.call(undefined)===undefined,'method-receiver');
        check(alias[Symbol.iterator].call(receiver)===receiver && alias[Symbol.iterator].name==='[Symbol.iterator]' && Reflect.get(alias,Symbol.toStringTag,receiver)===20,'symbol-static-members');
        class InheritedOwner extends StaticOwner { static tag=this; }
        check(Object.getPrototypeOf(InheritedOwner)===alias && InheritedOwner.tag===InheritedOwner && InheritedOwner.identity()===InheritedOwner && InheritedOwner.value===3,'inherited-static-receiver');
        InheritedOwner.value=50;
        check(InheritedOwner.backing===50 && alias.backing===3 && Object.hasOwn(InheritedOwner,'backing'),'inherited-field-shadow');
        events.length=0;StaticOwner.value+=(events.push('rhs'),2);
        check(alias.value===5 && events.join('|')==='get|rhs|set:5|get','reference-order');
        let constructible=false;try{new alias.identity();constructible=true;}catch(error){if(!(error instanceof TypeError))throw error;}
        check(!constructible,'static-method-not-constructible');
        class ReplacedStatic {
            static get value(){throw new Error('replaced accessor');}
            static value=7;
            static value=9;
            static method(){return 1;}
            static method(){return 2;}
        }
        check(ReplacedStatic.value===9 && ReplacedStatic.method()===2 && Object.getOwnPropertyDescriptor(ReplacedStatic,'value').get===undefined,'source-ordered-member-replacement');
        const original=descriptor.get,raw={};
        Object.defineProperty(alias,'value',{get(){throw raw;},configurable:true});
        let caught=false;try{StaticOwner.value;}catch(error){caught=error===raw;}
        check(caught && Object.getOwnPropertyDescriptor(alias,'value').get!==original,'retained-accessor-mutation');
        Object.defineProperty(alias,'backing',{value:'boxed',writable:false,configurable:true});
        check(StaticOwner.backing==='boxed' && Object.getOwnPropertyDescriptor(StaticOwner,'backing').writable===false,'retained-field-mutation');
        let rejected=false;try{StaticOwner.backing=99;}catch(error){rejected=error instanceof TypeError;}
        check(rejected && alias.backing==='boxed','readonly-direct-reference');
        delete StaticOwner.later;check(!Object.hasOwn(alias,'later') && StaticOwner.later===undefined,'deleted-field-stays-deleted');
        StaticOwner.later={restored:true};check(alias.later.restored,'field-recreation');
        function memberPartition(key,kind){
            const owner=StaticOwner,own=Object.getOwnPropertyDescriptor(owner,key);
            if(kind==='field')check(own.value.kind===kind && own.writable && own.enumerable && own.configurable,'generated-field:'+key);
            if(kind==='method')check(own.value.call(receiver,7)===27 && own.writable && !own.enumerable && own.configurable && own.value.length===1,'generated-method:'+key);
            if(kind==='accessor'){check(own.get.call(receiver)===receiver.marker && !own.enumerable && own.configurable,'generated-accessor:'+key);own.set.call(receiver,20);}
            Object.defineProperty(owner,key,{value:{replacement:key},writable:true,enumerable:true,configurable:true});
            check(owner[key].replacement===key && StaticOwner[key].replacement===key,'generated-retained-mutation:'+key);
        }
        ${probes.join("\n")}
        function referencePartition(keyKind,operation,abrupt){
            const events=[],key=keyKind==='symbol'?Symbol('reference'):'reference',raw={};let value=operation==='nullish'?null:1;
            const referencedName=keyKind==='object'?{[Symbol.toPrimitive](hint){events.push('key:'+hint);return key;}}:key;
            Object.defineProperty(StaticOwner,key,{get(){events.push('get');if(abrupt==='get')throw raw;return value;},set(next){events.push('set:'+next);value=next;},configurable:true});
            function rhs(){events.push('rhs');if(abrupt==='rhs')throw raw;return 2;}
            let caught=false;
            try{if(operation==='add')StaticOwner[referencedName]+=rhs();
                else if(operation==='or')StaticOwner[referencedName]||=rhs();
                else if(operation==='nullish')StaticOwner[referencedName]??=rhs();
                else StaticOwner[referencedName]++;}
            catch(error){caught=error===raw;}
            PRINT('reference:'+keyKind+':'+operation+':'+abrupt+':'+caught+':'+value+':'+events.join('|'));
            delete StaticOwner[key];
        }
        for(const keyKind of REFERENCE_KEY_KINDS)for(const operation of ['add','or','nullish','update'])for(const abrupt of ['none','get','rhs'])referencePartition(keyKind,operation,abrupt);
        let tree={leaf:raw};
        for(let index=0;index<512;index++)tree={owner:alias,previous:tree};
        alias.retained=tree;tree=null;COLLECT;
        let retained=StaticOwner.retained;
        for(let index=0;index<512;index++){if(retained.owner!==alias)throw raw;retained=retained.previous;}
        check(retained.leaf===raw,'deep-retained-static-owner-tree');
        PRINT('static-owner-complete');
    `;
}

test("native static elements and every later Reference share the retained constructor descriptor owner",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-static-owner-"));
    try{
        const source=subject();
        const referenceFile=path.join(temporary,"reference.mjs");await fs.writeFile(referenceFile,source.replaceAll("PRINT","print").replaceAll("COLLECT","").replace("REFERENCE_KEY_KINDS","['string','symbol']"));
        const reference=Bun.spawnSync(["node","--experimental-vm-modules","--no-warnings","-e",
            'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});',referenceFile],{stdout:"pipe",stderr:"pipe"});
        expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        const oracle=reference.stdout.toString().trimEnd().split("\n");expect(oracle.at(-1)).toBe("static-owner-complete");
        // The pinned GetValue/PutValue store the converted ReferencedName.
        // Node 26 still repeats object ToPropertyKey at the write. Model that
        // normative partition independently; Node supplies the stable-key and
        // class descriptor/activation observations above.
        const objectReferences:string[]=[];
        for(const operation of ["add","or","nullish","update"])for(const abrupt of ["none","get","rhs"]){
            let value:number|null=operation==="nullish"?null:1,caught=false;
            const effects=["key:string","get"];
            if(abrupt==="get")caught=true;
            else if(operation==="update"){value=2;effects.push("set:2");}
            else if(operation!=="or"){
                effects.push("rhs");
                if(abrupt==="rhs")caught=true;
                else{value=operation==="add"?3:2;effects.push("set:"+value);}
            }
            objectReferences.push(`reference:object:${operation}:${abrupt}:${caught}:${value}:${effects.join("|")}`);
        }
        const expected=[...oracle.slice(0,-2),...objectReferences,...oracle.slice(-2)];
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");
            await fs.writeFile(entry,source.replaceAll("PRINT",profile?"print":"console.log").replaceAll("COLLECT",profile && !noGc?"$262.gc()":"").replace("REFERENCE_KEY_KINDS","['string','symbol','object']"));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/class-static-owner.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",env:{...process.env,GC_FREE_SPACE_DIVISOR:"100"}});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            expect((observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);


test("unrepresented static keys fail at the canonical class member boundary",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-static-key-boundary-"));
    try{
        for(const member of ["static [key()]() {}", "static #private() {}"]){
            const entry=path.join(temporary,"main.mjs");
            await fs.writeFile(entry,`const key=()=>"dynamic"; class Owner { ${member} } console.log(Owner);`);
            const diagnostics:string[]=[];
            const result=await compile({entry,output:path.join(temporary,"program"),emitCOnly:true,diagnosticWriter:message=>diagnostics.push(message)});
            expect(result.exitCode).not.toBe(0);
            expect(diagnostics.join("")).toContain("class member key is outside the canonical definition plan");
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
});
