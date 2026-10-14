import {expect,test} from 'bun:test';
import {mkdtemp,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';
import {jobQueueInput} from '../e2e/generated-cases';

test('cross-thread queue retains live payloads and clears consumed roots through one FIFO drain',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tsc2c-cross-queue-roots-'));
 try{for(const noGc of [false,true]){
  const entry=join(root,'main.ts'),build=join(root,String(noGc));await writeFile(entry,jobQueueInput(4096));
  expect((await compile({entry,output:entry+'-unused',buildDir:build,emitCOnly:true,noGc})).exitCode).toBe(0);
  const driver=join(build,'queue-driver.c');await writeFile(driver,String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_core.c"
#include <pthread.h>
typedef struct {size_t index;} payload_t;
static size_t observed;static bool reenter;
static void inspect_unused(void){
 tsc_cross_entry_t zero={0};for(size_t index=g_cross_len;index<g_cross_cap;++index)
  if(memcmp(g_cross_queue+index,&zero,sizeof(zero))){fprintf(stderr,"consumed queue slot retains payload\n");abort();}
}
static void callback(void* env){payload_t* payload=env;if(payload->index!=observed++)abort();inspect_unused();
 if(reenter&&observed==1){payload_t* next=TSC_GC_MALLOC(sizeof(*next));*next=(payload_t){.index=1};tsc_cross_post((tsc_cross_entry_t){.kind=TSC_CROSS_MICROTASK,.fn=callback,.env=next});}
}
static void* post(void* length){
 size_t count=(size_t)(uintptr_t)length;
 for(size_t index=0;index<count;++index){payload_t* payload=TSC_GC_MALLOC(sizeof(*payload));*payload=(payload_t){.index=index};tsc_queue_microtask(callback,payload);}
 tsc_agent_t* carrier=tsc_agent_swap(NULL);if(carrier)tsc_agent_release(carrier);return NULL;
}
static void verify(size_t length,bool nested){
 observed=0;reenter=nested;pthread_t worker;if(pthread_create(&worker,NULL,post,(void*)(uintptr_t)length)||pthread_join(worker,NULL))abort();
 if(g_cross_len!=length||observed)abort();for(size_t index=0;index<length;++index)if(!g_cross_queue[index].env)abort();
 tsc_run_event_loop();if(observed!=length+(nested?1:0)||g_cross_len)abort();inspect_unused();
}
static void inspect_immediates(void){
 tsc_immediate_entry_t zero={0};for(size_t index=0;index<g_immediate_len;++index)if(g_immediate_queue[index].canceled&&g_immediate_queue[index].env){fprintf(stderr,"cancelled immediate retains payload\n");abort();}
 for(size_t index=g_immediate_len;index<g_immediate_cap;++index)if(memcmp(g_immediate_queue+index,&zero,sizeof(zero))){fprintf(stderr,"consumed immediate retains payload\n");abort();}
}
static void immediate_callback(void* env){payload_t* payload=env;if(payload->index!=observed++)abort();
 if(reenter&&observed==1){payload_t* next=TSC_GC_MALLOC(sizeof(*next));*next=(payload_t){.index=1};tsc_set_immediate(immediate_callback,next);}
}
static void verify_immediates(size_t length,bool nested,bool cancel){
 observed=0;reenter=nested;for(size_t index=0;index<length;++index){payload_t* payload=TSC_GC_MALLOC(sizeof(*payload));*payload=(payload_t){.index=index};double id=tsc_set_immediate(immediate_callback,payload);if(cancel)tsc_clear_immediate(id);}
 inspect_immediates();tsc_run_event_loop();if(!cancel&&observed!=length+(nested?1:0))abort();if(cancel&&observed)abort();
 tsc_drain_immediates();inspect_immediates();
}
static double cancelled_id;
static void cancel_later(void* unused){(void)unused;++observed;tsc_clear_immediate(cancelled_id);inspect_immediates();}
static void verify_cancellation(void){
 observed=0;tsc_set_immediate(cancel_later,NULL);payload_t* payload=TSC_GC_MALLOC(sizeof(*payload));*payload=(payload_t){.index=1};cancelled_id=tsc_set_immediate(immediate_callback,payload);
 tsc_run_event_loop();if(observed!=1)abort();inspect_immediates();
}
static void verify_kind(tsc_cross_kind_t kind){
 observed=0;reenter=false;payload_t* payload=TSC_GC_MALLOC(sizeof(*payload));*payload=(payload_t){.index=0};
 tsc_cross_post((tsc_cross_entry_t){.kind=kind,.fn=callback,.env=payload,.delay=0});
 tsc_run_event_loop();if(kind==TSC_CROSS_RAW_TIMEOUT){tsc_drain_timeouts();tsc_drain_microtasks_and_next_ticks();}if(observed!=1||g_cross_len)abort();inspect_unused();
}
static void settle(bool reject){
 tsc_promise_t* promise=tsc_promise_pending();tsc_object_t* value=tsc_object_new();
 tsc_cross_post_settle(promise,tsc_value_object(value),reject);if(!tsc_promise_is_pending(promise)||g_cross_len!=1)abort();
 tsc_run_event_loop();inspect_unused();if(promise->state!=(reject?TSC_PROMISE_REJECTED:TSC_PROMISE_FULFILLED)||tsc_value_gc_root(promise->result)!=value)abort();
}
int main(int argc,char** argv){tsc_bootstrap(argc,argv);tsc_realm_current();generated_main(argc,argv);verify(0,false);verify(1,false);verify(1,true);verify(4096,false);const tsc_cross_kind_t kinds[]={TSC_CROSS_MICROTASK,TSC_CROSS_NEXT_TICK,TSC_CROSS_IMMEDIATE,TSC_CROSS_TIMEOUT,TSC_CROSS_RAW_TIMEOUT};for(size_t index=0;index<sizeof(kinds)/sizeof(*kinds);++index)verify_kind(kinds[index]);settle(false);settle(true);verify_immediates(0,false,false);verify_immediates(1,true,false);verify_immediates(3,false,true);verify_immediates(4096,false,false);verify_cancellation();puts("cross-thread-queue-payloads:true");return 0;}
`);
  const names=await readdir(build),output=join(root,'program-'+noGc);
  const built=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')&&name!=='tsc_core.c').map(name=>join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread','-DGC_THREADS=1','-DTSC_THREADS=1',...(noGc?['-DTSC_NO_GC=1']:[])]});expect({code:built.exitCode,stderr:built.exitCode?built.stderr:''}).toEqual({code:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({noGc,code:native.exitCode,stderr:native.stderr.toString(),stdout:native.stdout.toString()}).toEqual({noGc,code:0,stderr:'',stdout:'jobs: 4096\ncross-thread-queue-payloads:true\n'});
 }
 }finally{await rm(root,{recursive:true,force:true})}
},600000);
