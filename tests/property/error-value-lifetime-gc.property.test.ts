import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('native Error value fields retain their decoded GC edges',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-error-values-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'error-driver.c');await fs.writeFile(driver,String.raw`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static tsc_error_t* volatile owner;
static void*** volatile links;
static size_t link_count;
static void** link_to(tsc_value_t value){
 void* volatile root=tsc_value_gc_root(value);void** link=GC_MALLOC_ATOMIC(sizeof(void*));*link=root;
 if(GC_general_register_disappearing_link(link,*link)!=GC_SUCCESS)abort();return link;
}
static __attribute__((noinline)) void setup_cause(void){
 links=GC_MALLOC(sizeof(*links));link_count=1;
 tsc_value_t value=tsc_value_object(tsc_object_new());void* volatile root=tsc_value_gc_root(value);links[0]=link_to(value);
 owner=tsc_aggregate_error_new_cause(tsc_array_new(sizeof(tsc_value_t),1),tsc_str_from_cstr("retained"),value);(void)root;
}
static __attribute__((noinline)) void setup_fields(void){
 link_count=TSC_ERROR_VALUE_FIELD_COUNT;links=GC_MALLOC(link_count*sizeof(*links));owner=tsc_error_new(tsc_str_from_cstr("fields"));
 for(size_t field=0;field<link_count;++field){
  tsc_value_t value=tsc_value_object(tsc_object_new());void* volatile root=tsc_value_gc_root(value);
  tsc_error_set_value_field(owner,(tsc_error_value_field_t)field,value);links[field]=link_to(value);(void)root;
 }
}
static __attribute__((noinline)) void replace_fields(void){
 for(size_t field=0;field<link_count;++field)tsc_error_set_value_field(owner,(tsc_error_value_field_t)field,tsc_value_num(field));
}
static __attribute__((noinline)) void setup_projected(void){
 setup_fields();(void)tsc_value_error(owner);
}
static __attribute__((noinline)) void replace_projected(void){
 static const char* names[]={
#define TSC_ERROR_VALUE_FIELD(name, property, enumerable) #property,
#include "tsc_error_values.def"
#undef TSC_ERROR_VALUE_FIELD
 };
 tsc_value_t object=tsc_value_error(owner);void* volatile root=tsc_value_gc_root(object);
 for(size_t field=0;field<link_count;++field)tsc_value_set_prop(object,tsc_str_from_cstr(names[field]),tsc_value_num(field));
 (void)root;
}
static __attribute__((noinline)) void setup_deep(void){
 owner=tsc_error_new(tsc_str_from_cstr("base"));
 for(size_t depth=0;depth<4096;++depth)owner=tsc_error_new_named_cause(tsc_str_from_cstr("Error"),tsc_str_from_cstr("node"),tsc_value_error(owner));
}
static __attribute__((noinline)) bool deep_valid(void){
 tsc_error_t* cursor=owner;size_t depth=0;
 while(!tsc_value_is_undefined(cursor->cause)){cursor=tsc_value_as_error(cursor->cause);++depth;}
 return depth==4096;
}
static __attribute__((noinline)) bool live(bool expected){for(size_t index=0;index<link_count;++index)if(!!*links[index]!=expected)return false;return true;}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t words[4096];for(size_t i=0;i<4096;++i)words[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static size_t diagnostic_calls;
static tsc_value_t diagnostic_getter(void* env,tsc_value_t receiver){(void)env;(void)receiver;++diagnostic_calls;return tsc_value_undefined();}
static __attribute__((noinline)) bool diagnostic_valid(void){
 owner=tsc_error_new(tsc_str_from_cstr("before"));tsc_value_t value=tsc_value_error(owner);
 tsc_value_set_prop(value,tsc_str_from_cstr("message"),tsc_value_string(tsc_str_from_cstr("after")));
 tsc_value_set_prop(value,tsc_str_from_cstr("name"),tsc_value_string(tsc_str_from_cstr("Renamed")));
 if(!tsc_str_eq(tsc_value_diagnostic_string(value),tsc_str_from_cstr("Renamed: after")))return false;
 tsc_object_define_accessor(owner->object,tsc_str_from_cstr("message"),diagnostic_getter,NULL,true,NULL,NULL,false,false,true,true,true);
 return tsc_str_eq(tsc_value_diagnostic_string(value),tsc_str_from_cstr("Renamed"))&&diagnostic_calls==0;
}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);if(!diagnostic_valid())return 13;owner=NULL;setup_cause();collect();if(!live(true))return 2;owner=NULL;collect();if(!live(false))return 3;
 setup_fields();collect();if(!live(true))return 4;replace_fields();collect();if(!live(false))return 5;
 setup_projected();collect();if(!live(true))return 6;replace_projected();collect();if(!live(false))return 7;
 setup_deep();collect();if(!deep_valid())return 8;
 puts("error-value-retention:true");puts("replacement-and-owner-release:true");puts("projection-transfers-roots:true");puts("deep-error-chain:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');
  const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});
  expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
  expect(native.stdout.toString()).toBe('error-value-retention:true\nreplacement-and-owner-release:true\nprojection-transfers-roots:true\ndeep-error-chain:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
