import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('next-tick worklist retains queued environments and releases consumed slots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-next-tick-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'queue-driver.c');await fs.writeFile(driver,`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static void** environment_link;
static int callbacks;
static void callback(void* environment){
 if(*(uintptr_t*)environment!=17)abort();
 ++callbacks;
}
static __attribute__((noinline)) void setup(void){
 uintptr_t* environment=GC_MALLOC(sizeof(*environment));*environment=17;
 environment_link=GC_MALLOC_ATOMIC(sizeof(void*));*environment_link=environment;
 if(GC_general_register_disappearing_link(environment_link,environment)!=GC_SUCCESS)abort();
 tsc_process_next_tick(callback,environment);
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) bool alive(void){return *environment_link!=NULL;}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect();
 if(!alive()||callbacks)return 2;
 puts("queued-environment-retained:true");
 tsc_process_drain_next_ticks();collect();
 if(alive()||callbacks!=1)return 3;
 puts("consumed-environment-released:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('queued-environment-retained:true\nconsumed-environment-released:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
