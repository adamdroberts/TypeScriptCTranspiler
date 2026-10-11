import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('Native waiters share sync/async FIFO wakeups, cross-thread completions and release terminal roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-atomic-waiter-storage-'));
 try{for(const threaded of [false,true])for(const noGc of [false,true]){
  const build=path.join(root,String(threaded)+'-'+noGc),entry=path.join(root,'main.ts');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true,noGc});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'waiter-driver.c');await fs.writeFile(driver,String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <pthread.h>
#include <time.h>
#include <sys/mman.h>
#ifndef TSC_NO_GC
#include <gc/gc_mark.h>
#endif
static tsc_array_buffer_t* volatile owner;
static tsc_atomic_waiter_t* volatile sync_record;
static tsc_atomic_wait_status_t sync_result;
static unsigned completed;
static double keepalive;
static void promise_done(void* unused){(void)unused;++completed;tsc_clear_timeout(keepalive);}
static void noop(void* unused){(void)unused;}
static void* blocking(void* unused){(void)unused;sync_result=tsc_atomic_waiter_suspend(sync_record);return NULL;}
static void* notify_thread(void* unused){(void)unused;struct timespec delay={0,2000000};nanosleep(&delay,NULL);if(tsc_atomic_waiter_notify(owner->shared_storage,0,1)!=1)abort();return NULL;}
#ifdef TSC_THREADS
static void* locked_notify(void* unused){(void)unused;tsc_runtime_lock();if(tsc_atomic_waiter_notify(owner->shared_storage,8,1)!=1)abort();tsc_runtime_unlock();return NULL;}
#endif
#ifndef TSC_NO_GC
static tsc_atomic_waiter_t* volatile kept_record;
static void **block_link,**promise_link;
static uint8_t* mapping;
static __attribute__((noinline)) void setup(void){
 tsc_array_buffer_t* volatile buffer=tsc_shared_array_buffer_allocate(8,16,true);mapping=buffer->data;
 tsc_promise_t* volatile promise=tsc_promise_pending();
 kept_record=tsc_atomic_waiter_new(buffer->shared_storage,buffer->data,0,4,0,100000,promise);
 block_link=GC_MALLOC_ATOMIC(sizeof(void*));*block_link=buffer->shared_storage;
 promise_link=GC_MALLOC_ATOMIC(sizeof(void*));*promise_link=promise;
 if(GC_general_register_disappearing_link(block_link,*block_link)!=GC_SUCCESS||GC_general_register_disappearing_link(promise_link,*promise_link)!=GC_SUCCESS)abort();
 if(tsc_atomic_waiter_begin(kept_record)!=TSC_WAIT_PENDING)abort();tsc_atomic_waiter_schedule(kept_record);
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();GC_invoke_finalizers();}
static __attribute__((noinline)) bool retained(void){return *block_link&&*promise_link;}
static __attribute__((noinline)) void finish(void){if(tsc_atomic_waiter_notify(*block_link,0,1)!=1)abort();tsc_atomics_schedule_completions();tsc_drain_microtasks_and_next_ticks();}
#endif
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);owner=tsc_shared_array_buffer_allocate(16,32,true);
 sync_record=tsc_atomic_waiter_new(owner->shared_storage,owner->data,0,4,0,INFINITY,NULL);
 if(tsc_atomic_waiter_begin(sync_record)!=TSC_WAIT_PENDING)return 1;
 tsc_promise_t* volatile async_promise=tsc_promise_pending();
 tsc_atomic_waiter_t* volatile async_record=tsc_atomic_waiter_new(owner->shared_storage,owner->data,0,8,0,INFINITY,async_promise);
 if(tsc_atomic_waiter_begin(async_record)!=TSC_WAIT_PENDING)return 2;
 pthread_t thread;if(pthread_create(&thread,NULL,blocking,NULL))return 3;
 if(tsc_atomic_waiter_notify(owner->shared_storage,0,1)!=1||pthread_join(thread,NULL)||sync_result!=TSC_WAIT_OK||!tsc_promise_is_pending(async_promise))return 4;
 if(tsc_atomic_waiter_count(owner->shared_storage,0)!=1||tsc_atomic_waiter_notify(owner->shared_storage,0,1)!=1)return 5;
 tsc_atomics_schedule_completions();tsc_drain_microtasks_and_next_ticks();if(tsc_promise_is_pending(async_promise)||tsc_atomic_waiter_count(owner->shared_storage,0))return 6;
 puts("mixed-sync-async-location-fifo:true");
 tsc_promise_t* volatile cross_promise=tsc_promise_pending();tsc_promise_add_callback(cross_promise,promise_done,NULL);
 tsc_atomic_waiter_t* volatile cross_record=tsc_atomic_waiter_new(owner->shared_storage,owner->data,0,4,0,INFINITY,cross_promise);
 if(tsc_atomic_waiter_begin(cross_record)!=TSC_WAIT_PENDING)return 7;
 keepalive=tsc_set_timeout(noop,NULL,1000);if(pthread_create(&thread,NULL,notify_thread,NULL))return 8;
 struct timespec before,after;clock_gettime(CLOCK_MONOTONIC,&before);tsc_run_event_loop();clock_gettime(CLOCK_MONOTONIC,&after);
 if(pthread_join(thread,NULL)||completed!=1||tsc_promise_is_pending(cross_promise)||after.tv_sec-before.tv_sec>1)return 9;
 puts("foreign-notify-wakes-owning-agent-completion:true");
#ifdef TSC_THREADS
 tsc_atomic_waiter_t* volatile locked_record=tsc_atomic_waiter_new(owner->shared_storage,owner->data,8,4,0,INFINITY,NULL);
 if(tsc_atomic_waiter_begin(locked_record)!=TSC_WAIT_PENDING)return 13;
 tsc_runtime_lock();tsc_runtime_lock();
 if(pthread_create(&thread,NULL,locked_notify,NULL)||tsc_atomic_waiter_suspend(locked_record)!=TSC_WAIT_OK)return 14;
 size_t restored=tsc_runtime_suspend();tsc_runtime_resume(restored);if(restored!=2)return 15;
 tsc_runtime_unlock();tsc_runtime_unlock();if(pthread_join(thread,NULL))return 16;
 puts("recursive-runtime-locks-released-and-restored:true");
#endif
#ifndef TSC_NO_GC
 setup();collect();if(!retained())return 10;
 finish();collect();if(*block_link||*promise_link)return 11;
 unsigned char resident;if(mincore(mapping,1,&resident)!=-1||errno!=ENOMEM)return 12;
 puts("pending-roots-retained-terminal-roots-released:true");
#endif
 return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program-'+threaded+'-'+noGc);
  const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread','-DGC_THREADS=1',...(threaded?['-DTSC_THREADS=1']:[]),...(noGc?['-DTSC_NO_GC=1']:[])]});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({threaded,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({threaded,noGc,exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('mixed-sync-async-location-fifo:true\nforeign-notify-wakes-owning-agent-completion:true\n'+(threaded?'recursive-runtime-locks-released-and-restored:true\n':'')+(noGc?'':'pending-roots-retained-terminal-roots-released:true\n'));
 }}finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
