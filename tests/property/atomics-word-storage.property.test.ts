import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('Native atomic words retain updates under contention and enforce sequential consistency',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-atomic-word-storage-'));
 try{for(const noGc of [false,true]){
  const build=path.join(root,String(noGc)),entry=path.join(root,'main.ts');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true,noGc});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'storage-driver.c');await fs.writeFile(driver,String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <pthread.h>
static tsc_array_buffer_t* volatile owner;
static const size_t widths[]={1,2,4,8};
static uint64_t sums[4],observed[2];
static pthread_barrier_t barrier;
static void* increment(void* argument){
 uintptr_t id=(uintptr_t)argument;uint64_t sum=0;
 for(size_t step=0;step<5000;++step)for(size_t slot=0;slot<sizeof(widths)/sizeof(widths[0]);++slot){
  uint64_t previous=tsc_atomic_word_update(owner->data+slot*8,widths[slot],TSC_ATOMIC_ADD,0,1);
  if(widths[slot]==8)sum+=previous;
 }
 sums[id]=sum;return NULL;
}
static void* exchange(void* argument){
 uintptr_t id=(uintptr_t)argument;
 for(size_t step=0;step<1000;++step){
  pthread_barrier_wait(&barrier);
  tsc_atomic_word_update(owner->data+id*4,4,TSC_ATOMIC_STORE,0,1);
  observed[id]=tsc_atomic_word_update(owner->data+(1-id)*4,4,TSC_ATOMIC_LOAD,0,0);
  pthread_barrier_wait(&barrier);
 }
 return NULL;
}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);owner=tsc_shared_array_buffer_allocate(32,32,false);
 if(!tsc_atomic_word_lock_free(4))return 1;
 pthread_t threads[4];for(uintptr_t id=0;id<4;++id)if(pthread_create(&threads[id],NULL,increment,(void*)id))return 2;
 for(size_t id=0;id<4;++id)if(pthread_join(threads[id],NULL))return 3;
 uint64_t total=20000,sum=0;for(size_t id=0;id<4;++id)sum+=sums[id];if(sum!=total*(total-1)/2)return 4;
 for(size_t slot=0;slot<sizeof(widths)/sizeof(widths[0]);++slot){uint64_t mask=widths[slot]==8?UINT64_MAX:(UINT64_C(1)<<(widths[slot]*8))-1;if(tsc_atomic_word_update(owner->data+slot*8,widths[slot],TSC_ATOMIC_LOAD,0,0)!=(total&mask))return 5;}
 puts("contended-words-preserve-updates-and-old-values:true");
 tsc_array_buffer_write_bits(owner,1,4,false,UINT64_C(0x10203040));
 if(tsc_array_buffer_read_bits(owner,1,4,false)!=UINT64_C(0x10203040)||tsc_array_buffer_read_bits(owner,1,4,true)!=UINT64_C(0x40302010)||tsc_array_buffer_read_bits(owner,1,1,true)!=0x10)return 9;
 pthread_barrier_init(&barrier,NULL,3);
 for(uintptr_t id=0;id<2;++id)if(pthread_create(&threads[id],NULL,exchange,(void*)id))return 6;
 for(size_t step=0;step<1000;++step){
  tsc_atomic_word_update(owner->data,4,TSC_ATOMIC_STORE,0,0);tsc_atomic_word_update(owner->data+4,4,TSC_ATOMIC_STORE,0,0);
  pthread_barrier_wait(&barrier);pthread_barrier_wait(&barrier);
  if(observed[0]==0&&observed[1]==0)return 7;
 }
 for(size_t id=0;id<2;++id)if(pthread_join(threads[id],NULL))return 8;
 pthread_barrier_destroy(&barrier);puts("sequential-consistency-forbids-both-old-loads:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program-'+noGc);
  const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread',...(noGc?['-DTSC_NO_GC=1']:[])]});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('contended-words-preserve-updates-and-old-values:true\nsequential-consistency-forbids-both-old-loads:true\n');
 }}finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
