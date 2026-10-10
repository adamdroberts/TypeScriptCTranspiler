import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('weak reference jobs and finalization cells follow collector liveness',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-weak-lifetime-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'weak-driver.c');  await fs.writeFile(driver,`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static tsc_value_t ref_value,registry_value;
static void* volatile ref_root;
static void* volatile registry_root;
static tsc_value_t live_token;
static void* volatile live_token_root;
static void** volatile ref_link;
static void** volatile target_link;
static void** volatile token_link;
static void** volatile holding_link;
static int cleaned;
static tsc_array_t* actuals(tsc_value_t a,tsc_value_t b,tsc_value_t c,size_t n){
 void* volatile ar=tsc_value_gc_root(a);void* volatile br=tsc_value_gc_root(b);void* volatile cr=tsc_value_gc_root(c);
 tsc_array_t* args=tsc_array_new(sizeof(tsc_value_t),n);tsc_array_use_value_storage(args);
 if(n)tsc_array_push_raw(args,&a);if(n>1)tsc_array_push_raw(args,&b);if(n>2)tsc_array_push_raw(args,&c);(void)ar;(void)br;(void)cr;return args;
}
static tsc_value_t call(tsc_value_t owner,const char* name,tsc_array_t* args){return tsc_value_apply_function(tsc_value_get_prop(owner,tsc_str_from_cstr(name)),owner,tsc_value_array(args));}
static void** link_to(tsc_value_t value){void* volatile root=tsc_value_gc_root(value);void** link=GC_MALLOC_ATOMIC(sizeof(void*));*link=root;if(GC_general_register_disappearing_link(link,*link)!=GC_SUCCESS)abort();return link;}
static tsc_value_t cleanup(void* env,tsc_value_t receiver,tsc_array_t* args){
 (void)env;if(!tsc_value_is_undefined(receiver)||!args||args->len!=1||!tsc_value_is_object(TSC_ARR(tsc_value_t,args,0)))abort();++cleaned;return tsc_value_undefined();
}
static __attribute__((noinline)) void setup(void){
 tsc_value_t target=tsc_value_object(tsc_object_new());void* volatile anchor=tsc_value_gc_root(target);ref_link=link_to(target);
 ref_value=tsc_value_construct(tsc_weak_ref_constructor_value(),tsc_value_array(actuals(target,tsc_value_undefined(),tsc_value_undefined(),1)));ref_root=tsc_value_gc_root(ref_value);
 tsc_value_t callback=tsc_value_function_named_kind(cleanup,NULL,NULL,1,tsc_str_from_cstr("cleanup"),TSC_FUNCTION_IDENTITY_BUILTIN);void* volatile callback_anchor=tsc_value_gc_root(callback);
 registry_value=tsc_value_construct(tsc_finalization_registry_constructor_value(),tsc_value_array(actuals(callback,tsc_value_undefined(),tsc_value_undefined(),1)));registry_root=tsc_value_gc_root(registry_value);
 tsc_value_t final_target=tsc_value_object(tsc_object_new());void* volatile target_anchor=tsc_value_gc_root(final_target);target_link=link_to(final_target);
 tsc_value_t holding=tsc_value_object(tsc_object_new());void* volatile holding_anchor=tsc_value_gc_root(holding);holding_link=link_to(holding);
 tsc_value_t token=tsc_value_object(tsc_object_new());void* volatile token_anchor=tsc_value_gc_root(token);token_link=link_to(token);
 (void)call(registry_value,"register",actuals(final_target,holding,token,3));
 live_token=tsc_value_object(tsc_object_new());live_token_root=tsc_value_gc_root(live_token);
 (void)call(registry_value,"register",actuals(final_target,tsc_value_num(2),live_token,3));
 (void)call(registry_value,"register",actuals(final_target,tsc_value_num(3),live_token,3));
 (void)anchor;(void)callback_anchor;(void)target_anchor;(void)holding_anchor;(void)token_anchor;
}
/* Erase inactive test frames, so conservative GC sees live roots rather than
 * decoded pointers left by setup and the cleanup callback. */
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) bool links(bool ref,bool target,bool token,bool holding){return !!*ref_link==ref&&!!*target_link==target&&!!*token_link==token&&!!*holding_link==holding;}
static __attribute__((noinline)) bool deref_missing(void){return tsc_value_is_undefined(call(ref_value,"deref",actuals(tsc_value_undefined(),tsc_value_undefined(),tsc_value_undefined(),0)));}
static __attribute__((noinline)) bool keep_again(void){return !deref_missing();}
static __attribute__((noinline)) bool unregister_pending(void){return call(registry_value,"unregister",actuals(live_token,tsc_value_undefined(),tsc_value_undefined(),1))==tsc_value_bool(true)&&call(registry_value,"unregister",actuals(live_token,tsc_value_undefined(),tsc_value_undefined(),1))==tsc_value_bool(false);}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect();
 if(!links(true,false,false,true)||cleaned)return 2;
 puts("same-job-keeps-ref-and-defers-cleanup:true");
 tsc_weak_job_checkpoint();if(!keep_again()||!unregister_pending())return 6;collect();
 if(!links(true,false,false,true)||cleaned)return 7;
 tsc_weak_job_checkpoint();collect();
 if(!links(false,false,false,true)||!deref_missing()||cleaned)return 3;
 puts("job-end-releases-ref-and-weak-token:true");
 tsc_drain_microtasks();if(cleaned!=1)return 4;
 collect();if(!links(false,false,false,false))return 5;
 puts("cleanup-holds-value-until-callback:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('same-job-keeps-ref-and-defers-cleanup:true\njob-end-releases-ref-and-weak-token:true\ncleanup-holds-value-until-callback:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
