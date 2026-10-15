import {nodeReferenceSync} from './node-reference';
import {expect,test} from "bun:test";
import {mkdtemp,writeFile,rm,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compile} from "../../src/compile";
import {invokeCc} from "../../src/link/cc";
import {parseHostObservation} from "../test262/protocol";

const nativeFactories=`
function createIterator(realm,owner,kind,name){return realm[name].prototype[kind].call(owner);}
function nextFor(realm,name){return Object.getPrototypeOf(new realm[name]().entries()).next;}
`;
// The pinned CreateIteratorFromClosure/GeneratorResume/Yield algorithms
// retain the closure Realm. Installed Node's optimized Map/Set iterators
// instead allocate yields in next's Realm. Ordinary generators implement
// the required context split and provide an independent closure oracle.
const nodeFactories=`
function createIterator(realm,owner,kind,name){
 const make=realm.Function('owner','kind','return (function*(){for(const entry of owner.entries()){if(kind==="keys")yield entry[0];else if(kind==="values")yield entry[1];else yield [entry[0],entry[1]];}})();');
 const iterator=make(owner,kind);iterator.collectionBrand=name;realm.Object.setPrototypeOf(iterator,realm.Object.getPrototypeOf(new realm[name]().entries()));return iterator;
}
function nextFor(realm,name){
 const next=realm.Function('return Object.getPrototypeOf((function*(){})()).next;')();
 return realm.Function('next','brand','return function(){if(this.collectionBrand!==brand)throw new TypeError("wrong brand");return next.call(this);};')(next,name);
}
`;
function subject(depth:number,collect:boolean):string {
 return nativeFactories+`
function check(value,label){if(!value)throw label;}
const local=globalThis,a=$262.createRealm().global,b=$262.createRealm().global;
const realms=[local,a,b];
for(const name of ['Map','Set'])for(const kind of ['keys','values','entries'])for(const borrowed of [false,true]){
 const owner=name==='Map'?new local.Map([[1,2],[3,4]]):new local.Set([1,3]);
 const iterator=createIterator(a,owner,kind,name),methodRealm=borrowed?b:a,next=nextFor(methodRealm,name);
 check(Object.getPrototypeOf(iterator)===(Object.getPrototypeOf(createIterator(a,owner,kind,name))),'iterator-owner');
 const first=next.call(iterator);check(Object.getPrototypeOf(first)===a.Object.prototype,'yield-result-realm');
 if(kind==='entries')check(Object.getPrototypeOf(first.value)===a.Array.prototype,'yield-pair-realm');
 check(!first.done,'yield-state');
 owner.delete(3);if(name==='Map')owner.set(5,6);else owner.add(5);
 const second=next.call(iterator);check(!second.done&&Object.getPrototypeOf(second)===a.Object.prototype,'live-cursor');
 const value=kind==='entries'?second.value[0]:second.value;check(value===(kind==='values'&&name==='Map'?6:5),'live-value');
 const finish=next.call(iterator),completed=next.call(iterator);
 check(finish.done&&completed.done&&finish.value===undefined&&Object.getPrototypeOf(finish)===methodRealm.Object.prototype&&Object.getPrototypeOf(completed)===methodRealm.Object.prototype,'completion-method-realm');
 owner.clear();if(name==='Map')owner.set(7,8);else owner.add(7);check(next.call(iterator).done,'permanent-completion');
 let error;try{next.call({});}catch(caught){error=caught;}check(error instanceof methodRealm.TypeError,'validation-method-realm');
 const wrong=createIterator(a,name==='Map'?new local.Set():new local.Map(),'entries',name==='Map'?'Set':'Map');
 try{next.call(wrong);throw 'brand accepted';}catch(caught){check(caught instanceof methodRealm.TypeError,'brand-method-realm');}
 check(Object.getPrototypeOf({})===local.Object.prototype,'caller-restored');
 print(name+':'+kind+':'+borrowed+':true');
}
let graph=null;
for(let index=0;index<${depth};index++){
 const realm=realms[index%realms.length],other=realms[(index+1)%realms.length];
 const owner=new local.Map([[index,index+1]]);
 graph={iterator:createIterator(realm,owner,'entries','Map'),next:nextFor(other,'Map'),creation:realm,method:other,nextNode:graph};
}
${collect?'$262.gc();':''}
while(graph!==null){
 const value=graph.next.call(graph.iterator);
 check(Object.getPrototypeOf(value)===graph.creation.Object.prototype&&Object.getPrototypeOf(value.value)===graph.creation.Array.prototype,'retained-yield-realm');
 const finish=graph.next.call(graph.iterator);check(finish.done&&Object.getPrototypeOf(finish)===graph.method.Object.prototype,'retained-completion-realm');
 graph=graph.nextNode;
}
print('deep:true');check(Object.getPrototypeOf({})===local.Object.prototype,'deep-caller-restored');
`;
}
test("collection iterator closure Realm follows pinned generator context and survives retention",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"tsc2c-collection-iterator-realm-"));
 try{for(const typed of [false,true])for(const noGc of [false,true]){
  const source=subject(typed&&!noGc?4096:1,!noGc),reference=source.replace(nativeFactories,nodeFactories).replace('$262.gc();','');
  expect(reference).not.toBe(source);
  const node=nodeReferenceSync(['node','-e','const fs=require("node:fs"),vm=require("node:vm");globalThis.print=value=>fs.writeSync(1,String(value)+"\\n");globalThis.$262={createRealm(){return {global:vm.runInNewContext("globalThis")};}};vm.runInThisContext(fs.readFileSync(0,"utf8"));'],{stdin:Buffer.from(reference),stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:""});
  const entry=join(directory,'main-'+typed+'-'+noGc+(typed?'.ts':'.js')),output=join(directory,'program-'+typed+'-'+noGc),diagnostics:string[]=[];await writeFile(entry,(typed?'// @ts-nocheck\n':'')+source);
  const built=await compile({entry,output,noGc,buildDir:output+'-build',isolatedScriptRoots:[entry],initializationEntries:[entry],test262Observation:{kind:"test262-native-observation",scenarioId:"property/collection-iterator-realm#script",setupEntries:[],testEntry:entry,scriptEntries:[entry],async:false},diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:""});
  const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe",timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:""});const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString());
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);

// A native payload codec can throw while the closure resumes. This probe
// observes public Realm/error/completion behavior without inspecting cursor
// fields, and compares it with a throwing ordinary generator in Node.
test("collection resume errors keep their origin Realm and complete the closure",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"tsc2c-collection-resume-error-"));
 try{for(const noGc of [false,true]){
  const build=join(directory,'build-'+noGc),entry=join(directory,'empty.ts'),output=join(directory,'program-'+noGc);await writeFile(entry,'export {};\n');
  expect((await compile({entry,output,buildDir:build,emitCOnly:true,noGc})).exitCode).toBe(0);
  const driver=join(build,'realm-driver.c');await writeFile(driver,String.raw`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
static bool fail_box,reenter;
static tsc_realm_t* creation;
static tsc_value_t nested_next,nested_iterator,method_error_proto;
static tsc_value_t apply(tsc_value_t method,tsc_value_t receiver);
static tsc_value_t box_key(const void* data){
 if(reenter){
  TSC_TRY_FRAME(frame);tsc_try_push(&frame);
  if(!setjmp(frame.jb)){apply(nested_next,nested_iterator);abort();}
  if(!tsc_value_eq(tsc_value_get_prototype_of(tsc_current_error_value()),method_error_proto)||tsc_realm_current()!=creation)abort();tsc_try_pop();reenter=false;
 }
 if(fail_box){if(tsc_realm_current()!=creation)abort();tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("codec failure"));}
 return *(const tsc_value_t*)data;
}
static tsc_value_t apply(tsc_value_t method,tsc_value_t receiver){return tsc_value_apply_function(method,receiver,tsc_value_array(tsc_array_new(sizeof(tsc_value_t),0)));}
int main(int argc,char** argv){
 tsc_bootstrap(argc,argv);tsc_realm_t* caller=tsc_realm_current();creation=tsc_realm_new();tsc_realm_t* method_realm=tsc_realm_new();
 tsc_realm_swap(creation);
 tsc_value_t entries=tsc_value_get_prop(tsc_map_prototype_value(),tsc_str_from_cstr("entries"));
 tsc_value_t error_proto=tsc_value_get_prop(tsc_error_constructor_value(TSC_ERROR_TYPE),tsc_str_from_cstr("prototype"));
 void* volatile entries_root=tsc_value_gc_root(entries);void* volatile error_root=tsc_value_gc_root(error_proto);
 tsc_realm_swap(method_realm);
 tsc_value_t empty=tsc_value_map(tsc_map_new(sizeof(tsc_value_t),sizeof(tsc_value_t),TSC_KEY_VALUE,1));
 tsc_value_t local_entries=tsc_value_get_prop(tsc_map_prototype_value(),tsc_str_from_cstr("entries"));
 tsc_value_t next=tsc_value_get_prop(apply(local_entries,empty),tsc_str_from_cstr("next"));
 method_error_proto=tsc_value_get_prop(tsc_error_constructor_value(TSC_ERROR_TYPE),tsc_str_from_cstr("prototype"));
 tsc_value_t result_proto=tsc_value_object_prototype();void* volatile next_root=tsc_value_gc_root(next);void* volatile result_root=tsc_value_gc_root(result_proto);
 tsc_realm_swap(caller);
 tsc_map_t* map=tsc_map_new(sizeof(tsc_value_t),sizeof(tsc_value_t),TSC_KEY_VALUE,1);tsc_value_t key=tsc_value_num(1),value=tsc_value_num(2);tsc_map_set_raw(map,&key,&value);
 tsc_map_set_value_codecs(map,box_key,NULL,NULL,NULL);tsc_value_t iterator=apply(entries,tsc_value_map(map));void* volatile iterator_root=tsc_value_gc_root(iterator);
 TSC_TRY_FRAME(frame);tsc_try_push(&frame);fail_box=true;
 if(!setjmp(frame.jb)){apply(next,iterator);abort();}
 tsc_value_t error=tsc_current_error_value();if(!tsc_value_eq(tsc_value_get_prototype_of(error),error_proto)||tsc_realm_current()!=caller)abort();tsc_try_pop();
 fail_box=false;tsc_value_t done=apply(next,iterator);if(!tsc_value_is_truthy(tsc_value_get_prop(done,tsc_str_from_cstr("done")))||!tsc_value_eq(tsc_value_get_prototype_of(done),result_proto)||tsc_realm_current()!=caller)abort();
 nested_next=next;nested_iterator=apply(entries,tsc_value_map(map));void* volatile nested_root=tsc_value_gc_root(nested_iterator);reenter=true;
 tsc_value_t yielded=apply(next,nested_iterator);if(reenter||tsc_value_is_truthy(tsc_value_get_prop(yielded,tsc_str_from_cstr("done")))||tsc_realm_current()!=caller)abort();
 puts("reentrant:true");
 (void)nested_root;(void)entries_root;(void)error_root;(void)next_root;(void)result_root;(void)iterator_root;
 puts("origin:true\nrestored:true\ncompleted:true");return 0;
}
`);
  const names=await readdir(build);const linked=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp'],extraFlags:['-pthread','-DGC_THREADS=1',...(noGc?['-DTSC_NO_GC=1']:[])]});expect({code:linked.exitCode,stderr:linked.exitCode?linked.stderr:''}).toEqual({code:0,stderr:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  const node=nodeReferenceSync(['node','-e','const vm=require("node:vm"),a=vm.runInNewContext("globalThis"),b=vm.runInNewContext("globalThis");const recursive=a.Function("next","expected","return (function*(){try{next.call(this.iterator);}catch(error){if(!(error instanceof expected))throw error;}yield 1;})();")(b.Function("return Object.getPrototypeOf((function*(){})()).next;")(),b.TypeError);a.iterator=recursive;const recursiveNext=b.Function("return Object.getPrototypeOf((function*(){})()).next;")();const recursiveResult=recursiveNext.call(recursive);process.stdout.write("reentrant:"+(!recursiveResult.done)+"\\n");const generator=a.Function("return (function*(){throw new TypeError();})();")();const next=b.Function("return Object.getPrototypeOf((function*(){})()).next;")();let error;try{next.call(generator);}catch(value){error=value;}process.stdout.write("origin:"+(error instanceof a.TypeError)+"\\nrestored:"+(Object.getPrototypeOf({})===Object.prototype)+"\\ncompleted:"+next.call(generator).done+"\\n");'],{stdout:'pipe',stderr:'pipe'});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await rm(directory,{recursive:true,force:true});}
},600000);
