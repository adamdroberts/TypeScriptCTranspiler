import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';

test('ArrayBuffer storage snapshots survive native borrows and release their byte roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-arraybuffer-storage-gc-'));
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
static tsc_buffer_t* volatile borrow;
static void** byte_link;
static __attribute__((noinline)) void setup(void){
 tsc_array_buffer_t* volatile buffer=tsc_array_buffer_allocate(8,16,true);
 buffer->data[0]=17;
 tsc_data_view_t* volatile view=tsc_data_view_new(buffer,0,0,false);
 tsc_data_view_witness_t witness=tsc_data_view_witness(view);
 borrow=TSC_GC_MALLOC(sizeof(*borrow));memset(borrow,0,sizeof(*borrow));
 borrow->data=witness.data;borrow->data_owner=buffer->data;borrow->len=witness.length;
 byte_link=GC_MALLOC_ATOMIC(sizeof(void*));*byte_link=borrow->data_owner;
 if(GC_general_register_disappearing_link(byte_link,*byte_link)!=GC_SUCCESS)abort();
 tsc_array_buffer_resize_storage(buffer,0);tsc_array_buffer_detach(buffer);
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;++i)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) bool retained(void){return *byte_link&&borrow&&borrow->len==8&&borrow->data[0]==17;}
static __attribute__((noinline)) void release(void){borrow=NULL;}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);setup();collect();
 if(!retained())return 2;puts("borrowed-old-storage-retained:true");
 release();collect();if(*byte_link)return 3;
 puts("released-old-storage-collected:true");return 0;
}
`);
  const names=await fs.readdir(build),output=path.join(root,'program');const compiled=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({exitCode:compiled.exitCode,stderr:compiled.exitCode?compiled.stderr:''}).toEqual({exitCode:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});expect(native.stdout.toString()).toBe('borrowed-old-storage-retained:true\nreleased-old-storage-collected:true\n');
 }finally{await fs.rm(root,{recursive:true,force:true})}
},600_000);
