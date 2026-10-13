import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {invokeCc} from '../../src/link/cc';
import {parseHostObservation} from '../test262/protocol';
import {generateE2eCaseSource} from '../e2e/generated-cases';
function subject(collect:boolean):string{return `
export {};
function check(value,label){if(!value)throw label}
const target=new EventTarget(),add=target.addEventListener,remove=target.removeEventListener,dispatch=target.dispatchEvent;
for(const options of [undefined,null,false,true,{},function(){}]){const current=new EventTarget();let count=0;const listener=()=>count++;current.addEventListener('value',listener,options);current.dispatchEvent(new Event('value'));current.removeEventListener('value',listener,options);current.dispatchEvent(new Event('value'));check(count===1,'option-domain')}
for(const options of [0,1,'x',Symbol('x'),17n]){let caught=false;try{target.addEventListener('value',()=>{},options)}catch(error){caught=error instanceof TypeError}check(caught,'option-invalid')}
let reads=[];const options=new Proxy({},{get(owner,key){reads.push(typeof key==='symbol'?key.description:key);return undefined}});let conversions=0;const type={toString(){conversions++;return 'ordered'}};
add.call(target,type,()=>{},options);console.log('order:',reads.join(','),conversions);
reads=[];add.call(target,type,null,options);console.log('null:',reads.join(','),conversions);
reads=[];remove.call(target,type,null,options);check(reads.length===0&&conversions===1,'remove-null-before-options');
const marker={};let late=0;try{add.call(target,{toString(){late++;return 'late'}},()=>{},{get once(){throw marker},get capture(){late++;return false}})}catch(error){check(error===marker,'option-abrupt')};check(late===0,'option-before-type');
let captured=0;const listener=()=>captured++;add.call(target,'capture',listener,{capture:false});Reflect.apply(add,target,['capture',listener,{capture:true}]);add.call(target,'capture',listener,{capture:true,once:true});dispatch.call(target,new Event('capture'));remove.call(target,'capture',listener,true);dispatch.call(target,new Event('capture'));check(captured===3,'capture-key');
let onceCalls=0;const onceListener=()=>{onceCalls++;target.dispatchEvent(new Event('once'))};const onceOptions={get once(){return 'truthy'},get capture(){return 0}};add.call(target,'once',onceListener,onceOptions);target.dispatchEvent(new Event('once'));target.dispatchEvent(new Event('once'));check(onceCalls===1,'once-before-reentrant-callback');
let trace=[];const mutations=new EventTarget(),later=()=>trace.push('later'),fresh=()=>trace.push('fresh');mutations.addEventListener('change',()=>{trace.push('first');mutations.removeEventListener('change',later);mutations.addEventListener('change',later);mutations.addEventListener('change',fresh)});mutations.addEventListener('change',later);mutations.dispatchEvent(new Event('change'));console.log('mutation:',trace.join(','));
const passive=new EventTarget();passive.addEventListener('passive',event=>event.preventDefault(),{passive:true});check(passive.dispatchEvent(new Event('passive',{cancelable:true})),'passive-cancel');
let handled=0;const object={handleEvent(event){check(this===object&&event.target===target&&arguments.length===1,'object-receiver');handled++}};add.call(target,'object',object);target.dispatchEvent(new Event('object'));object.handleEvent=function(){handled+=2};target.dispatchEvent(new Event('object'));remove.call(target,'object',object);check(handled===3,'live-object-handler');
const empty={};add.call(target,'empty',empty);target.dispatchEvent(new Event('empty'));remove.call(target,'empty',empty);
const originalController=AbortController;check(originalController.name==='AbortController'&&originalController.length===0,'controller-metadata');let controllerActuals=0;const capturedController=new originalController(++controllerActuals,undefined);check(controllerActuals===1&&capturedController instanceof originalController,'controller-actuals');class DerivedController extends originalController{}check(new DerivedController() instanceof DerivedController,'controller-new-target');let controllerPrototypeReads=0;const controllerNewTarget=new Proxy(function(){},{get(owner,key,receiver){if(key==='prototype')controllerPrototypeReads++;return Reflect.get(owner,key,receiver)}});Reflect.construct(originalController,[],controllerNewTarget);check(controllerPrototypeReads===1,'controller-prototype-read');let controllerCallRejected=false;try{originalController()}catch(error){controllerCallRejected=error instanceof TypeError}check(controllerCallRejected,'controller-requires-new');
let signalHandler;const externalSignal={get aborted(){return false},addEventListener(type,listener,options){check(type==='abort'&&listener.length===0&&options.once&&Object.getPrototypeOf(options)===null,'signal-actuals');signalHandler=listener}};let externalCalls=0;add.call(target,'external',()=>externalCalls++,{signal:externalSignal});target.dispatchEvent(new Event('external'));signalHandler();target.dispatchEvent(new Event('external'));check(externalCalls===1,'actual-signal-method');
const controller=new AbortController();const proxiedSignal=new Proxy(controller.signal,{});add.call(target,'proxied-signal',()=>{},{signal:proxiedSignal});let cancelled=0;add.call(target,'signal',()=>cancelled++,{signal:controller.signal});${collect?'$262.gc();':''}target.dispatchEvent(new Event('signal'));controller.abort();target.dispatchEvent(new Event('signal'));check(cancelled===1,'signal-removal');
let badAbort=false;try{controller.abort.call({})}catch(error){badAbort=error instanceof TypeError}check(badAbort,'abort-receiver');
const borrowedController=new AbortController();controller.abort.call(borrowedController,'borrowed');check(borrowedController.signal.aborted&&borrowedController.signal.reason==='borrowed','borrowed-controller-receiver');
const stopped=new AbortController();stopped.abort();let touched=0;add.call(target,{toString(){touched++;return 'stopped'}},17,{signal:stopped.signal});check(touched===0,'aborted-before-listener-and-type');
for(const signal of [null,false,0,{}]){let rejected=false;try{add.call(target,'invalid',()=>{},{signal})}catch(error){rejected=error instanceof TypeError}check(rejected,'signal-brand')}
let actuals='';Object.defineProperty(target,'addEventListener',{get(){actuals+='G';return function(...args){actuals+='C';check(this===target&&args.length===5,'mutable-callee-actuals')}}});target.addEventListener((actuals+='A','x'),...(actuals+='S',[()=>{},undefined,17,19]));check(actuals==='GASC','complete-actual-order');
new EventTarget().addEventListener('inline',()=>{},{capture:undefined,get once(){return false}});
console.log('event-target-actuals:',true);
`;}
test('EventTarget actual dictionaries and retained registrations agree with Node',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-event-target-actuals-'));
 try{for(const typed of [false,true])for(const noGc of [false,true])for(const profile of [false,true]){
  const deep=!typed&&!noGc&&!profile?generateE2eCaseSource('{"generator":"event-target-actuals-depth","depth":4096}','property/event_target_actuals_depth'):'';
  const source=subject(profile&&!noGc)+deep,program=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const directory=path.join(temporary,`${typed}-${noGc}-${profile}`);await fs.mkdir(directory);const oracle=path.join(directory,'oracle.mjs');await fs.writeFile(oracle,program.replaceAll('$262.gc();',''));
  const node=Bun.spawnSync(['node','--no-warnings','-e','const fs=require("node:fs");console.log=(...values)=>fs.writeSync(1,values.map(String).join(" ")+"\\n");import(process.argv[1]);',oracle],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
  const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];await fs.writeFile(entry,(typed?'// @ts-nocheck\n':'')+(typed?source:program)+`\n{let closed=false;try{new EventTarget().addEventListener('private',()=>{},new Proxy({},{get(owner,key){return typeof key==='symbol'&&key.description==='kWeak'?{}:undefined}}))}catch(error){closed=error instanceof TypeError&&error.message==='Node-private EventTarget listener flags are not represented'}if(!closed)throw 'private listener representation';}\n`);
  const built=await compile({entry,output,noGc,buildDir:path.join(directory,'build'),...(profile?{moduleRoots:[entry],initializationEntries:[entry],test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/event-target-actuals#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});expect({code:built.exitCode,diagnostics:diagnostics.join('')}).toEqual({code:0,diagnostics:''});
  const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});
  if(profile){const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');expect(observation.stdout).toBe(node.stdout.toString())}else expect(native.stdout.toString()).toBe(node.stdout.toString());
 }}finally{await fs.rm(temporary,{recursive:true,force:true})}
},900000);

test('signal cancellation retains registered payloads without retaining abandoned targets',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-event-target-gc-'));
 try{
  const entry=path.join(temporary,'main.ts'),build=path.join(temporary,'build');await fs.writeFile(entry,'export {};\n');const emitted=await compile({entry,output:path.join(temporary,'unused'),buildDir:build,emitCOnly:true});expect(emitted.exitCode).toBe(0);
  const driver=path.join(build,'event-target-driver.c');await fs.writeFile(driver,`
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
#include <gc/gc_mark.h>
static tsc_value_t controller, live_target;
static void* volatile controller_root;
static void* volatile live_target_root;
static void** volatile target_link;
static void** volatile payload_link;
static int invoked;
static tsc_array_t* actuals(tsc_value_t a,tsc_value_t b,tsc_value_t c,size_t n){void* volatile ar=tsc_value_gc_root(a);void* volatile br=tsc_value_gc_root(b);void* volatile cr=tsc_value_gc_root(c);tsc_array_t* args=tsc_array_new(sizeof(tsc_value_t),n);if(n)tsc_array_push_value(args,a);if(n>1)tsc_array_push_value(args,b);if(n>2)tsc_array_push_value(args,c);(void)ar;(void)br;(void)cr;return args;}
static tsc_value_t call(tsc_value_t owner,const char* name,tsc_array_t* args){return tsc_value_apply_function(tsc_value_get_prop(owner,tsc_str_from_cstr(name)),owner,tsc_value_array(args));}
static void** link_to(void* pointer){void** link=GC_MALLOC_ATOMIC(sizeof(void*));*link=pointer;if(GC_general_register_disappearing_link(link,GC_base(pointer))!=GC_SUCCESS)abort();return link;}
static tsc_value_t callback(void* env,tsc_value_t receiver,tsc_array_t* args){if(env||!tsc_value_is_object(receiver)||!args||args->len!=1)abort();invoked++;return tsc_value_undefined();}
static __attribute__((noinline)) void setup(void){
 controller=tsc_abort_controller_new();controller_root=tsc_value_gc_root(controller);
 tsc_value_t target=tsc_value_event_target(tsc_event_target_new());void* volatile target_root=tsc_value_gc_root(target);target_link=link_to((void*)target_root);
 tsc_object_t* payload=tsc_object_new();payload_link=link_to(payload);
 tsc_object_set(payload,tsc_str_from_cstr("handleEvent"),tsc_value_function_builtin_named(callback,NULL,1,tsc_str_from_cstr("listener")));
 tsc_value_t listener=tsc_value_object(payload);void* volatile listener_root=tsc_value_gc_root(listener);
 tsc_object_t* options=tsc_object_new();tsc_object_set(options,tsc_str_from_cstr("signal"),tsc_value_get_prop(controller,tsc_str_from_cstr("signal")));
 call(target,"addEventListener",actuals(tsc_value_string(tsc_str_from_cstr("retained")),listener,tsc_value_object(options),3));live_target=target;live_target_root=(void*)target_root;(void)listener_root;
}
static __attribute__((noinline)) void scrub(void){volatile uintptr_t unused[4096];for(size_t i=0;i<4096;i++)unused[i]=0;}
static __attribute__((noinline)) void collect(void){scrub();GC_clear_stack(NULL);GC_gcollect();}
static __attribute__((noinline)) bool links(bool alive){return (!!*target_link==alive)&& (!!*payload_link==alive);}
static __attribute__((noinline)) void dispatch(void){call(live_target,"dispatchEvent",actuals(tsc_value_event(tsc_event_new(tsc_str_from_cstr("retained"),false)),tsc_value_undefined(),tsc_value_undefined(),1));}
int main(int argc,char** argv){tsc_bootstrap(argc,argv);setup();collect();if(!links(true))return 2;dispatch();if(invoked!=1)return 3;live_target=tsc_value_undefined();live_target_root=NULL;collect();if(!links(false))return 4;call(controller,"abort",actuals(tsc_value_undefined(),tsc_value_undefined(),tsc_value_undefined(),0));puts("signal-target-and-payload-lifetime:true");return 0;}
`);
  const names=await fs.readdir(build),output=path.join(temporary,'program');const linked=await invokeCc({sources:[driver,...names.filter(name=>name.startsWith('tsc_')&&name.endsWith('.c')).map(name=>path.join(build,name))],output,includeDirs:[build],libs:['gc','m','resolv','ssl','crypto','icui18n','icuuc','icudata','gmp']});expect({code:linked.exitCode,stderr:linked.exitCode?linked.stderr:''}).toEqual({code:0,stderr:''});const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120000});expect({code:native.exitCode,stderr:native.stderr.toString()}).toEqual({code:0,stderr:''});expect(native.stdout.toString()).toBe('signal-target-and-payload-lifetime:true\n');
 }finally{await fs.rm(temporary,{recursive:true,force:true})}
},600000);
