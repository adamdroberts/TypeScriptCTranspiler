import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('Runtime agents isolate execution state, jobs and waiter completion and release retired roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-runtime-agent-'));
 try{for(const threaded of [false,true])for(const noGc of [false,true]){
  const build=path.join(root,String(threaded)+'-'+noGc),entry=path.join(root,'main.ts');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true,noGc});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'agent-driver.c');await fs.writeFile(driver,String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <pthread.h>
#ifndef TSC_NO_GC
#include <gc/gc_mark.h>
#endif
typedef struct node {
 tsc_agent_t* agent;tsc_realm_t* realm;tsc_environment_t* environment;tsc_parse_unit_t* unit;
 tsc_promise_t* promise;struct node* next;size_t observed,expected;uint64_t module_order;bool policy;
} node_t;
static tsc_agent_t* primary;
static unsigned primary_jobs;
static const char generated_storage_key;
typedef struct {size_t value;void* owner;} generated_storage_t;
static generated_storage_t* generated_storage(void){return tsc_agent_storage(&generated_storage_key,sizeof(generated_storage_t));}
static void primary_job(void* unused){(void)unused;if(tsc_agent_current()!=primary)abort();++primary_jobs;}
#ifdef TSC_THREADS
static void* legacy_worker(void* env){
 if(tsc_realm_current()!=env||tsc_agent_owns_jobs())abort();
 if(generated_storage()->value!=71)abort();
 tsc_queue_microtask(primary_job,NULL);
 tsc_agent_t* agent=tsc_agent_swap(NULL);tsc_agent_release(agent);return NULL;
}
#endif
static tsc_value_t switch_probe(void* env,tsc_value_t receiver,tsc_array_t* args){
 (void)receiver;(void)args;void* checkpoint=tsc_value_callee_checkpoint();
 if(!checkpoint||tsc_value_is_undefined(tsc_value_current_callee()))abort();
 tsc_agent_t* previous=tsc_agent_swap(env);
 if(tsc_value_callee_checkpoint()||!tsc_value_is_undefined(tsc_value_current_callee()))abort();
 tsc_agent_swap(previous);if(tsc_value_callee_checkpoint()!=checkpoint)abort();
 return tsc_value_undefined();
}
static void check_execution_state(void){
 if(tsc_agent_next_module_async_evaluation_order()!=0)abort();
 tsc_agent_t* other=tsc_agent_new();
 generated_storage_t* original_storage=generated_storage();original_storage->value=71;
 tsc_agent_t* original_agent=tsc_agent_swap(other);
 generated_storage_t* independent_storage=generated_storage();
 if(independent_storage==original_storage||independent_storage->value)abort();
 independent_storage->value=23;
 tsc_realm_t* stored_realm=tsc_realm_current();tsc_realm_swap(tsc_realm_new());
 if(generated_storage()!=independent_storage||generated_storage()->value!=23)abort();
 tsc_realm_swap(stored_realm);tsc_agent_swap(original_agent);
 if(generated_storage()!=original_storage||generated_storage()->value!=71)abort();
 tsc_call_activation_t first={0},second={0};
 tsc_call_activation_push(&first,NULL,tsc_value_num(1),tsc_value_undefined());
 tsc_agent_t* previous=tsc_agent_swap(other);
 if(tsc_agent_next_module_async_evaluation_order()!=0)abort();
 tsc_realm_t* original_realm=tsc_realm_current();tsc_realm_t* another_realm=tsc_realm_new();tsc_realm_swap(another_realm);
 if(tsc_agent_next_module_async_evaluation_order()!=1)abort();
 tsc_realm_swap(original_realm);
 tsc_call_activation_push(&second,NULL,tsc_value_num(2),tsc_value_undefined());
 if(tsc_value_as_num(tsc_call_receiver())!=2)abort();
 tsc_agent_swap(previous);if(tsc_value_as_num(tsc_call_receiver())!=1||tsc_agent_next_module_async_evaluation_order()!=1)abort();
 tsc_agent_swap(other);tsc_call_activation_pop(&second);tsc_agent_swap(previous);tsc_call_activation_pop(&first);
 tsc_try_frame_t outer={0},inner={0};tsc_try_push(&outer);
 if(setjmp(outer.jb))abort();
 tsc_agent_swap(other);tsc_try_push(&inner);if(inner.prev)abort();
 if(!setjmp(inner.jb))tsc_throw_value(tsc_value_num(7));
 if(tsc_value_as_num(tsc_current_error_value())!=7)abort();
 tsc_try_pop();tsc_agent_swap(previous);tsc_try_pop();
 tsc_value_t probe=tsc_value_function_builtin_named(switch_probe,other,0,tsc_str_from_cstr("probe"));
 tsc_value_apply_function(probe,tsc_value_undefined(),tsc_value_array(tsc_array_new(sizeof(tsc_value_t),0)));
 tsc_agent_release(other);
}
static void job(void* env){node_t* node=env;
 if(tsc_agent_current()!=node->agent||tsc_realm_current()!=node->realm||tsc_environment_current()!=node->environment||tsc_parse_unit_current()!=node->unit||tsc_atomics_can_block()!=node->policy)abort();
 ++node->observed;
}
static const char module_node_key;
static tsc_value_t module_leaf(void){return tsc_value_promise(((node_t*)tsc_realm_state_get(&module_node_key))->promise);}
static tsc_value_t module_parent(void){job(tsc_realm_state_get(&module_node_key));return tsc_value_undefined();}
static const size_t module_parent_requests[]={1};
static const tsc_module_definition_t module_definitions[]={
 {module_parent,module_parent_requests,1,false},{module_leaf,NULL,0,true}
};
static void second_job(void* env){job(env);tsc_queue_microtask(job,env);}
static node_t* make_node(tsc_array_buffer_t* storage,size_t jobs,bool policy){
 node_t* node=TSC_GC_MALLOC(sizeof(*node));memset(node,0,sizeof(*node));node->agent=tsc_agent_new();node->policy=policy;
 tsc_agent_t* previous=tsc_agent_swap(node->agent);node->realm=tsc_realm_current();
 node->environment=tsc_environment_new(NULL,true);tsc_environment_swap(node->environment);
 node->unit=tsc_parse_unit_new();tsc_parse_unit_swap(node->unit);tsc_atomics_set_can_block(policy);
 for(size_t i=0;i<jobs;++i){tsc_queue_microtask(second_job,node);node->expected+=2;}
 tsc_process_next_tick(job,node);tsc_set_immediate(job,node);tsc_set_timeout(job,node,0);node->expected+=3;
 double cancelled=tsc_set_timeout(job,node,0);tsc_clear_timeout(cancelled);
 node->promise=tsc_promise_pending();tsc_promise_add_callback(node->promise,job,node);++node->expected;
 tsc_realm_state_set(&module_node_key,node);
 tsc_module_graph_t* graph=tsc_module_graph_new(module_definitions,2);
 tsc_promise_t* completion=tsc_module_evaluate(graph,0);
 if(!tsc_promise_is_pending(completion)||tsc_module_evaluate(graph,0)!=completion||tsc_agent_next_module_async_evaluation_order()!=2)abort();
 node->module_order=3;
 tsc_promise_add_callback(completion,job,node);node->expected+=2;
 tsc_atomic_waiter_t* waiter=tsc_atomic_waiter_new(storage->shared_storage,storage->data,0,4,0,INFINITY,node->promise);
 if(tsc_atomic_waiter_begin(waiter)!=TSC_WAIT_PENDING)abort();
 tsc_agent_swap(previous);return node;
}
static void run_node(node_t* node){
 tsc_agent_t* previous=tsc_agent_swap(node->agent);
 if(tsc_agent_next_module_async_evaluation_order()!=node->module_order++)abort();
 tsc_run_event_loop();
 if(tsc_agent_next_module_async_evaluation_order()!=node->module_order++)abort();
 if(node->observed!=node->expected||tsc_promise_is_pending(node->promise))abort();
 tsc_agent_swap(previous);
}
static void* thread_run(void* env){node_t* node=env;tsc_agent_swap(node->agent);tsc_runtime_lock();run_node(node);tsc_runtime_unlock();tsc_agent_swap(NULL);return NULL;}
static void check_graph(size_t length,bool concurrent){
 tsc_array_buffer_t* volatile storage=tsc_shared_array_buffer_allocate(8,8,false);node_t* volatile head=NULL;
 unsigned seed=length+17;
 for(size_t i=0;i<length;++i){seed=seed*1664525u+1013904223u;node_t* node=make_node(storage,(seed>>16)%5,(seed&1)!=0);node->next=head;head=node;}
 if(tsc_atomic_waiter_notify(storage->shared_storage,0,INFINITY)!=length)abort();
 tsc_atomics_schedule_completions();
 for(node_t* cursor=head;cursor;cursor=cursor->next)if(!tsc_promise_is_pending(cursor->promise)||cursor->observed)abort();
 if(primary_jobs)abort();
 if(concurrent){
  pthread_t* threads=malloc(length*sizeof(*threads));size_t i=0;
  for(node_t* cursor=head;cursor;cursor=cursor->next)if(pthread_create(&threads[i++],NULL,thread_run,cursor))abort();
  for(i=0;i<length;++i)if(pthread_join(threads[i],NULL))abort();free(threads);
 }else for(node_t* cursor=head;cursor;cursor=cursor->next)run_node(cursor);
 for(node_t* cursor=head;cursor;cursor=cursor->next)tsc_agent_release(cursor->agent);
 if(tsc_atomic_waiter_count(storage->shared_storage,0)||primary_jobs)abort();
}
#ifndef TSC_NO_GC
static void **realm_link,**block_link,**promise_link,**storage_link;
static tsc_agent_t* volatile retired;
static __attribute__((noinline)) void setup_storage_root(tsc_agent_t* agent){
 tsc_agent_t* previous=tsc_agent_swap(agent);generated_storage()->owner=TSC_GC_MALLOC(64);
 storage_link=GC_MALLOC_ATOMIC(sizeof(void*));*storage_link=generated_storage()->owner;tsc_agent_swap(previous);
 if(GC_general_register_disappearing_link(storage_link,*storage_link)!=GC_SUCCESS)abort();
}
static __attribute__((noinline)) void setup_retired(void){
 tsc_array_buffer_t* buffer=tsc_shared_array_buffer_allocate(8,8,false);node_t* node=make_node(buffer,1,true);retired=node->agent;
 realm_link=GC_MALLOC_ATOMIC(sizeof(void*));*realm_link=node->realm;
 block_link=GC_MALLOC_ATOMIC(sizeof(void*));*block_link=buffer->shared_storage;
 promise_link=GC_MALLOC_ATOMIC(sizeof(void*));*promise_link=node->promise;
 setup_storage_root(node->agent);
 if(GC_general_register_disappearing_link(realm_link,*realm_link)!=GC_SUCCESS||GC_general_register_disappearing_link(block_link,*block_link)!=GC_SUCCESS||GC_general_register_disappearing_link(promise_link,*promise_link)!=GC_SUCCESS)abort();
}
static __attribute__((noinline)) void collect(void){volatile uintptr_t scrub[4096];for(size_t i=0;i<4096;++i)scrub[i]=0;GC_clear_stack(NULL);GC_gcollect();GC_invoke_finalizers();}
static __attribute__((noinline)) bool retained(void){return *realm_link&&*block_link&&*promise_link&&*storage_link;}
#endif
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);primary=tsc_agent_current();tsc_realm_t* primary_realm=tsc_realm_current();tsc_atomics_set_can_block(false);
 check_execution_state();
 tsc_queue_microtask(primary_job,NULL);
 tsc_promise_t* volatile fulfilled=tsc_promise_resolve(tsc_value_num(1));
 tsc_promise_t* volatile rejected=tsc_promise_reject(tsc_value_num(2));
 tsc_promise_add_callback(fulfilled,primary_job,NULL);tsc_promise_add_callback(rejected,primary_job,NULL);
 if(primary_jobs)return 8;
 for(size_t n=0;n<9;++n)check_graph(n,false);
#ifdef TSC_THREADS
 check_graph(7,true);
#endif
 puts("agent-state-jobs-waiters-isolated:true");
 check_graph(4096,false);puts("deep-retained-agent-graph:true");
 if(tsc_realm_current()!=primary_realm||tsc_atomics_can_block())return 1;
 tsc_drain_microtasks_and_next_ticks();if(primary_jobs!=3)return 2;
#ifdef TSC_THREADS
 pthread_t legacy;if(pthread_create(&legacy,NULL,legacy_worker,primary_realm)||pthread_join(legacy,NULL))return 5;
 if(primary_jobs!=3)return 6;
 tsc_run_event_loop();if(primary_jobs!=4)return 7;
#endif
#ifndef TSC_NO_GC
 setup_retired();collect();if(!retained())return 3;
 tsc_agent_release(retired);collect();if(*realm_link||*block_link||*promise_link||*storage_link){fprintf(stderr,"retired roots: realm=%d block=%d promise=%d storage=%d\n",!!*realm_link,!!*block_link,!!*promise_link,!!*storage_link);return 4;}
 puts("retired-agent-roots-released:true");
#endif
 return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program-'+threaded+'-'+noGc);
  const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread','-DGC_THREADS=1',...(threaded?['-DTSC_THREADS=1']:[]),...(noGc?['-DTSC_NO_GC=1']:[])]});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({threaded,noGc,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({threaded,noGc,exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('agent-state-jobs-waiters-isolated:true\ndeep-retained-agent-graph:true\n'+(noGc?'':'retired-agent-roots-released:true\n'));
 }}finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
