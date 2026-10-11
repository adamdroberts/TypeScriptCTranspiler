import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('SharedArrayBuffer storage publishes racing growth and retains its stable synchronized block',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-shared-buffer-storage-'));
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
#include <sys/mman.h>
#ifndef TSC_NO_GC
#include <gc/gc_mark.h>
#endif
static tsc_array_buffer_t* volatile owner;
static uint8_t* original;
static unsigned failed;
static pthread_barrier_t barrier;
static tsc_array_buffer_t* volatile probe_source;
static tsc_array_buffer_t* volatile probe_target;
static bool probe_armed;
void __real_tsc_array_buffer_write_bits(tsc_array_buffer_t*,size_t,size_t,bool,uint64_t);
/* A deterministic competing write after the first target byte distinguishes
 * live reads from alias snapshots without relying on thread scheduling. */
void __wrap_tsc_array_buffer_write_bits(tsc_array_buffer_t* buffer,size_t offset,size_t width,bool little,uint64_t raw){
 __real_tsc_array_buffer_write_bits(buffer,offset,width,little,raw);
 if(probe_armed&&buffer==probe_target&&offset==0){probe_armed=false;__real_tsc_array_buffer_write_bits(probe_source,7,1,true,17);}
}
static tsc_value_t make_view(tsc_array_buffer_t* buffer){
 tsc_value_t constructor=tsc_typed_array_constructor_value(TSC_ELEMENT_Uint8Array);
 tsc_array_t* volatile args=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(args);
 tsc_value_t value=tsc_value_array_buffer(buffer);tsc_array_push_raw(args,&value);
 return tsc_value_construct_with_new_target(constructor,tsc_value_array(args),constructor);
}
static bool copy_order(bool alias){
 probe_source=tsc_shared_array_buffer_allocate(8,8,false);
 probe_target=alias?probe_source:tsc_shared_array_buffer_allocate(8,8,false);
 for(size_t i=0;i<8;++i)__real_tsc_array_buffer_write_bits(probe_source,i,1,true,i+1);
 tsc_value_t source=make_view(probe_source),target=make_view(probe_target);
 void* volatile source_root=tsc_value_gc_root(source);void* volatile target_root=tsc_value_gc_root(target);
 tsc_array_t* volatile args=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(args);tsc_array_push_raw(args,&source);
 probe_armed=true;(void)tsc_value_invoke(target,tsc_str_from_cstr("set"),args);
 bool valid=!probe_armed&&tsc_array_buffer_read_bits(probe_target,7,1,true)==(alias?8:17);
 if(!valid)fprintf(stderr,"copy-order alias=%d armed=%d last=%llu\n",alias,probe_armed,(unsigned long long)tsc_array_buffer_read_bits(probe_target,7,1,true));
 probe_source=NULL;probe_target=NULL;(void)source_root;(void)target_root;return valid;
}
static void* worker(void* parameter){
 uintptr_t id=(uintptr_t)parameter;pthread_barrier_wait(&barrier);
 for(size_t step=0;step<4096;++step){
  size_t requested=8+step*4+id;
  bool changed=tsc_shared_array_buffer_grow_storage(owner,requested);
  size_t current=tsc_array_buffer_length(owner);
  if(current<requested||(!changed&&current<=requested)||owner->data!=original)__atomic_store_n(&failed,1,__ATOMIC_RELAXED);
  uint64_t pattern=id&1?UINT64_C(0xaaaaaaaa55555555):UINT64_C(0x55555555aaaaaaaa);
  tsc_array_buffer_write_bits(owner,0,8,true,pattern);
  uint64_t observed=tsc_array_buffer_read_bits(owner,0,8,true);
  if(observed!=UINT64_C(0xaaaaaaaa55555555)&&observed!=UINT64_C(0x55555555aaaaaaaa))__atomic_store_n(&failed,1,__ATOMIC_RELAXED);
 }
 return NULL;
}
#ifndef TSC_NO_GC
static tsc_data_view_t* volatile kept;
static void** block_link;
static uint8_t* mapping;
static __attribute__((noinline)) void setup(void){
 tsc_array_buffer_t* volatile buffer=tsc_shared_array_buffer_allocate(8,16,true);
 tsc_array_buffer_write_bits(buffer,0,1,true,17);mapping=buffer->data;
 kept=tsc_data_view_new(buffer,0,0,false);
 block_link=GC_MALLOC_ATOMIC(sizeof(void*));*block_link=buffer->shared_storage;
 if(GC_general_register_disappearing_link(block_link,*block_link)!=GC_SUCCESS)abort();
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();GC_invoke_finalizers();}
static __attribute__((noinline)) bool retained(void){return *block_link&&kept&&tsc_array_buffer_read_bits(kept->buffer,0,1,true)==17;}
static __attribute__((noinline)) void release(void){kept=NULL;}
#endif
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);owner=tsc_shared_array_buffer_allocate(8,16392,true);original=owner->data;
 pthread_t threads[4];pthread_barrier_init(&barrier,NULL,4);
 for(uintptr_t id=0;id<4;++id)if(pthread_create(&threads[id],NULL,worker,(void*)id))return 1;
 for(size_t id=0;id<4;++id)if(pthread_join(threads[id],NULL))return 2;
 pthread_barrier_destroy(&barrier);
 if(failed||tsc_array_buffer_length(owner)!=16391||owner->data!=original)return 3;
 if(!tsc_shared_array_buffer_grow_storage(owner,16392)||tsc_shared_array_buffer_grow_storage(owner,16391))return 4;
 if(tsc_array_buffer_read_bits(owner,16391,1,true)!=0)return 5;
 puts("racing-growth-stable-scalar-storage:true");
 if(!copy_order(false)||!copy_order(true))return 9;
 puts("distinct-block-live-read-aliased-block-snapshot:true");
#ifndef TSC_NO_GC
 setup();collect();if(!retained())return 6;
 release();collect();if(*block_link)return 7;
 unsigned char resident;if(mincore(mapping,1,&resident)!=-1||errno!=ENOMEM)return 8;
 puts("retained-view-released-shared-mapping:true");
#endif
 return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program-'+noGc);
  const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread','-fno-lto',...(noGc?['-DTSC_NO_GC=1']:[])],linkFlags:['-Wl,--wrap=tsc_array_buffer_write_bits']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('racing-growth-stable-scalar-storage:true\ndistinct-block-live-read-aliased-block-snapshot:true\n'+(noGc?'':'retained-view-released-shared-mapping:true\n'));
 }}finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
