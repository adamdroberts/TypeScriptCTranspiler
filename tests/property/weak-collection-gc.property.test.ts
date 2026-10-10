import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('weak collection values close reachable edges and release an unreachable cycle',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-weak-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'weak-driver.c');await fs.writeFile(driver,`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static tsc_value_t map_value;
static void* volatile map_root;
static void* volatile key_root;
static void** volatile key_link;
static void** volatile value_link;
static tsc_array_t* actuals(tsc_value_t key,tsc_value_t value){
 void* volatile key_anchor=tsc_value_gc_root(key);void* volatile value_anchor=tsc_value_gc_root(value);
 tsc_array_t* list=tsc_array_new(sizeof(tsc_value_t),2);tsc_array_use_value_storage(list);tsc_array_push_raw(list,&key);tsc_array_push_raw(list,&value);
 (void)key_anchor;(void)value_anchor;return list;
}
static __attribute__((noinline)) void setup(void){
 map_value=tsc_value_construct(tsc_weak_map_constructor_value(),tsc_value_array(tsc_array_new(sizeof(tsc_value_t),0)));map_root=tsc_value_gc_root(map_value);
 tsc_value_t key=tsc_value_object(tsc_object_new());void* volatile key_anchor=tsc_value_gc_root(key);
 tsc_value_t value=tsc_value_object(tsc_object_new());void* volatile value_anchor=tsc_value_gc_root(value);
 (void)tsc_value_set_prop(value,tsc_str_from_lit("key",3),key);
 key_root=key_anchor;key_link=GC_MALLOC_ATOMIC(sizeof(void*));*key_link=key_anchor;
 value_link=GC_MALLOC_ATOMIC(sizeof(void*));*value_link=value_anchor;
 if(GC_general_register_disappearing_link(key_link,*key_link)!=GC_SUCCESS)abort();
 if(GC_general_register_disappearing_link(value_link,*value_link)!=GC_SUCCESS)abort();
 tsc_value_t setter=tsc_value_get_prop(map_value,tsc_str_from_lit("set",3));
 (void)tsc_value_apply_function(setter,map_value,tsc_value_array(actuals(key,value)));
 (void)key_anchor;(void)value_anchor;
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static void collect_without_old_frames(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect_without_old_frames();
 if(!*key_link||!*value_link)return 2;
 puts("reachable-key-retains-cycle:true");key_root=NULL;collect_without_old_frames();
 if(*key_link||*value_link)return 3;
 puts("unreachable-key-releases-cycle:true");
 if(!map_root)return 4;return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('reachable-key-retains-cycle:true\nunreachable-key-releases-cycle:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
