import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {invokeCc} from "../../src/link/cc";

const partitions = [
    {name:"chain",edges:[[1],[2],[]],failure:2},
    {name:"diamond",edges:[[1,2],[3],[3],[]],failure:3},
    {name:"cycle",edges:[[1],[2],[0]],failure:1},
    {name:"completed-sibling",edges:[[1,2],[],[]],failure:2},
    {name:"root",edges:[[1],[]],failure:0},
];

// An independent postorder graph walk identifies the first executing failure.
// The native probe consumes adjacency Lists through the actual Module graph.
function failingSource(edges:number[][],failure:number):number {
    const visited=new Set<number>(),pending=[{index:0,execute:false}];
    while(pending.length){
        const item=pending.pop()!;
        if(item.execute){if(item.index===failure)return item.index;continue;}
        if(visited.has(item.index))continue;
        visited.add(item.index);pending.push({index:item.index,execute:true});
        for(const index of [...edges[item.index]!].reverse())pending.push({index,execute:false});
    }
    throw new Error("generated graph has no executing failure");
}

test("Module errors retain their executing source across graph and Promise propagation",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-module-error-source-"));
    try{for(const noGc of [false,true]){
        const entry=path.join(directory,"main.ts"),build=path.join(directory,String(noGc));
        await fs.writeFile(entry,"export {};\n");
        expect((await compile({entry,output:path.join(directory,"unused"),buildDir:build,emitCOnly:true,noGc})).exitCode).toBe(0);
        const cases=partitions.flatMap(({name,edges,failure})=>[false,true].map(async=>{
            const expected=failingSource(edges,failure),offsets=[0],requests:number[]=[];
            for(const outgoing of edges){requests.push(...outgoing);offsets.push(requests.length);}
            return `{ const size_t offsets[]={${offsets}},requests[]={${requests}};
                verify(offsets,requests,${edges.length},${failure},${expected},${async});puts("${name}:${async}:true"); }`;
        })).join("\n");
        const driver=path.join(build,"module-error-driver.c");
        await fs.writeFile(driver,String.raw`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <assert.h>
static tsc_value_t reason;
static void* volatile reason_root;
static tsc_value_t complete(void){return tsc_value_undefined();}
static tsc_value_t fail(void){tsc_throw_value(reason);return tsc_value_undefined();}
static tsc_value_t reject(void){return tsc_value_promise(tsc_promise_reject(reason));}
static void verify(const size_t* offsets,const size_t* requests,size_t count,size_t failure,size_t expected,bool async){
    tsc_module_definition_t* definitions=TSC_GC_MALLOC(count*sizeof(*definitions));
    for(size_t index=0;index<count;index++)definitions[index]=(tsc_module_definition_t){
        .execute=index==failure?(async?reject:fail):complete,
        .requests=requests+offsets[index],.request_count=offsets[index+1]-offsets[index],
        .has_tla=async&&index==failure};
    tsc_module_graph_t* graph=tsc_module_graph_new(definitions,count);
    tsc_promise_t* first=tsc_module_evaluate(graph,0);
    tsc_run_event_loop();
    assert(tsc_promise_is_rejected(first)&&tsc_promise_reason(first)==reason);
    assert(tsc_module_error_source_index(graph,0)==expected);
    assert(tsc_module_evaluate(graph,0)==first);
    assert(tsc_module_error_source_index(graph,0)==expected);
    tsc_promise_t* source=tsc_module_evaluate(graph,failure);
    assert(tsc_promise_is_rejected(source)&&tsc_promise_reason(source)==reason);
    assert(tsc_module_error_source_index(graph,failure)==expected);
    // A dependency may already have failed before a different root imports it.
    graph=tsc_module_graph_new(definitions,count);
    source=tsc_module_evaluate(graph,failure);tsc_run_event_loop();
    assert(tsc_promise_is_rejected(source)&&tsc_module_error_source_index(graph,failure)==expected);
    first=tsc_module_evaluate(graph,0);tsc_run_event_loop();
    assert(tsc_promise_is_rejected(first)&&tsc_promise_reason(first)==reason);
    if(tsc_module_error_source_index(graph,0)!=expected)
        fprintf(stderr,"cached dependency source: count=%zu failure=%zu async=%d actual=%zu expected=%zu\n",count,failure,async,tsc_module_error_source_index(graph,0),expected);
    assert(tsc_module_error_source_index(graph,0)==expected);
}
int main(int argc,char** argv){
    tsc_bootstrap(argc,argv);reason=tsc_value_object(tsc_object_new());reason_root=tsc_value_gc_root(reason);
    ${cases}
    const size_t count=4096;
    size_t* offsets=TSC_GC_MALLOC((count+1)*sizeof(size_t));
    size_t* requests=TSC_GC_MALLOC(count*sizeof(size_t));
    for(size_t index=0;index<count;index++){offsets[index]=index;requests[index]=index+1;}
    offsets[count]=count-1;
    verify(offsets,requests,count,count-1,count-1,false);puts("deep-error-source:true");
    return 0;
}
`);
        const names=await fs.readdir(build),output=path.join(directory,"program-"+noGc);
        const linked=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith("tsc_")&&name.endsWith(".c")).map(name=>path.join(build,name))],output,includeDirs:[build],libs:[...(noGc?[]:["gc"]),"m","resolv","ssl","crypto","icui18n","icuuc","icudata","gmp"],extraFlags:noGc?["-DTSC_NO_GC=1"]:[]});
        expect({exitCode:linked.exitCode,stderr:linked.exitCode?linked.stderr:""}).toEqual({exitCode:0,stderr:""});
        const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120_000});
        expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
        expect(native.stdout.toString().trimEnd().split("\n")).toEqual([...partitions.flatMap(({name})=>[false,true].map(async=>`${name}:${async}:true`)),"deep-error-source:true"]);
    }}finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
