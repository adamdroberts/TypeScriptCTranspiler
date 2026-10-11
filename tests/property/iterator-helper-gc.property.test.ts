import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('Completed Iterator helpers release captured records while retaining their owner',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-iterator-helper-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'storage-driver.c');await fs.writeFile(driver,
`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static tsc_object_t* volatile retained_helper;
static void** source_link;
static tsc_value_t next(void* env,tsc_value_t receiver,tsc_array_t* args){(void)env;(void)receiver;(void)args;return tsc_iterator_result(tsc_value_num(1),false);}
static tsc_value_t callback(void* env,tsc_value_t receiver,tsc_array_t* args){(void)env;(void)receiver;return TSC_ARR(tsc_value_t,args,0);}
static __attribute__((noinline)) void setup(void){
 tsc_object_t* volatile source=tsc_object_new();
 tsc_object_define(source,tsc_str_from_lit("next",4),tsc_value_function_builtin_named(next,NULL,0,tsc_str_from_lit("next",4)),true,true,true);
 source_link=GC_MALLOC_ATOMIC(sizeof(void*));*source_link=source;
 if(GC_general_register_disappearing_link(source_link,*source_link)!=GC_SUCCESS)abort();
 tsc_array_t* volatile args=tsc_array_new(sizeof(tsc_value_t),1);
 tsc_array_push_value(args,tsc_value_function_builtin_named(callback,NULL,1,tsc_str_from_lit("callback",8)));
 tsc_value_t method=tsc_value_get_prop(tsc_iterator_prototype_value(),tsc_str_from_lit("map",3));
 tsc_value_t helper=tsc_value_apply_function(method,tsc_value_object(source),tsc_value_array(args));retained_helper=value_ptr(helper);
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) bool retained(void){return *source_link&&retained_helper&&retained_helper->iterator_helper;}
static __attribute__((noinline)) void complete(void){tsc_value_t helper=tsc_value_object(retained_helper);tsc_value_t method=tsc_value_get_prop(helper,tsc_str_from_lit("return",6));(void)tsc_value_apply_function(method,helper,tsc_value_array(tsc_array_new(sizeof(tsc_value_t),0)));}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect();
 if(!retained())return 2;puts("pending-source-retained:true");
 complete();collect();if(*source_link||!retained_helper)return 3;
 puts("completed-source-collected:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('pending-source-retained:true\ncompleted-source-collected:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
