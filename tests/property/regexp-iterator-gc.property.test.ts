import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('Completed RegExp iterators release matchers and input strings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-regexp-iterator-gc-'));
 try{
  const entry=path.join(root,'main.ts'),build=path.join(root,'build');await fs.writeFile(entry,'export {};\n');
  const emitted=await compile({entry,output:path.join(root,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'storage-driver.c');await fs.writeFile(driver,
`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include "tsc_regexp_api.c"
#include <gc/gc_mark.h>
static tsc_object_t* volatile retained_iterator;
static void **matcher_link, **string_link;
static __attribute__((noinline)) void setup(void){
 tsc_str_t* volatile input=tsc_str_from_cstr("a retained regexp input");
 tsc_regexp_t* volatile native=tsc_regexp_new(tsc_str_from_lit("a",1),tsc_str_from_lit("g",1));
 tsc_value_t regexp=tsc_value_regexp(native);void* volatile regexp_root=tsc_value_gc_root(regexp);
 tsc_array_t* volatile args=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_push_value(args,tsc_value_string(input));
 tsc_value_t iterator=tsc_regexp_match_all_apply(NULL,regexp,args);retained_iterator=value_ptr(iterator);
 regexp_string_iterator_t* state=retained_iterator->class_ptr;
 matcher_link=GC_MALLOC_ATOMIC(sizeof(void*));*matcher_link=state->matcher_gc_root;
 string_link=GC_MALLOC_ATOMIC(sizeof(void*));*string_link=state->string;
 if(GC_general_register_disappearing_link(matcher_link,*matcher_link)!=GC_SUCCESS||GC_general_register_disappearing_link(string_link,*string_link)!=GC_SUCCESS)abort();
 (void)regexp_root;
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) void complete(void){tsc_value_t iterator=tsc_value_object(retained_iterator);tsc_value_t next=tsc_value_get_prop(iterator,tsc_str_from_lit("next",4));tsc_array_t* args=tsc_array_new(sizeof(tsc_value_t),0);for(;;){tsc_value_t result=tsc_value_apply_function(next,iterator,tsc_value_array(args));if(tsc_value_is_truthy(tsc_value_get_prop(result,tsc_str_from_lit("done",4))))break;}}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect();if(!*matcher_link||!*string_link)return 2;puts("pending-regexp-roots-retained:true");
 complete();collect();if(*matcher_link||*string_link||!retained_iterator)return 3;
 puts("completed-regexp-roots-collected:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')&&name!=='tsc_regexp_api.c').map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('pending-regexp-roots-retained:true\ncompleted-regexp-roots-collected:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
