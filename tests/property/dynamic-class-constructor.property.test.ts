import {nodeReferenceSync} from './node-reference';
import {expect,test} from 'bun:test';
import ts from 'typescript';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(profile:boolean,noGc:boolean,stress:boolean):string {
 const protocols=['plain','async','generator','async-generator'],forms=['declaration','named-expression','anonymous-expression'];
 const factories=protocols.flatMap(protocol=>forms.map(form=>{
  const name=`make_${protocol.replaceAll('-','_')}_${form.replaceAll('-','_')}`,inner=form==='declaration'?'Local':form==='named-expression'?'Named':'new.target';
  const members=`field=label;constructor([value=label,{nested:{input}}={nested:{input:label}}]:any[]=[],...tail:any[]){this.value=value;this.input=input;this.tail=tail;this.target=new.target;this.arguments=arguments;this.inner=${inner};this.reader=()=>[this,value,input,tail,new.target,${inner}];}`;
  const definition=form==='declaration'?`class Local {${members}}const Saved=Local;Local=Symbol('outer');`:`const Saved=class ${form==='named-expression'?'Named':''} {${members}};`;
  return {protocol,name,source:`${protocol==='plain'?'function':protocol==='async'?'async function':protocol==='generator'?'function*':'async function*'} ${name}(label:any):any{${protocol==='plain'?'':protocol==='async'?'await Promise.resolve(0);':'yield "pause";'}${definition}${protocol==='plain'||protocol==='async'?'return':'yield'} Saved;}`};
 }));
 const nesting=stress?256:2,binding='{owner:'.repeat(nesting)+'value'+'}'.repeat(nesting),input='{owner:'.repeat(nesting)+'label'+'}'.repeat(nesting);
 return `// @ts-nocheck
 const host=globalThis;
 function output(value:any):void{${profile?'host.print':'console.log'}(value);}
 function collect():void{${profile&&!noGc?'host.$262.gc();':''}}
 function check(value:boolean,label:string):void{if(!value)throw label;output(label+':true');}
 ${factories.map(factory=>factory.source).join('\n')}
 const factories:any[]=[${factories.map(factory=>`{protocol:'${factory.protocol}',factory:${factory.name}}`).join(',')}];
 const label=Symbol('label'),marker=Symbol('marker'),events:any[]=[];let valid=true;
 function field(receiver:any):any{events.push('field');collect();return label;}
 function fallback():any{events.push('parameter');return label;}
 const Ordered:any=class Named {first=field(this);constructor(value:any=fallback(),observed:any=this.first,target:any=new.target){events.push('body');this.value=value;this.observed=observed;this.target=target;this.inner=Named;}};
 const ordered:any=new Ordered();check(events.join(',')==='field,parameter,body'&&ordered.value===label&&ordered.observed===label&&ordered.target===Ordered&&ordered.inner===Ordered&&Ordered.length===0,'fields-before-parameter-defaults-and-body');
 class Native {first=field(this);value:any;observed:any;target:any;constructor(value:any=fallback(),observed:any=this.first,target:any=new.target){events.push('body');this.value=value;this.observed=observed;this.target=target;}}events.length=0;const native:any=new Native();check(events.join(',')==='field,parameter,body'&&native.value===label&&native.observed===label&&native.target===Native,'native-base-fields-before-defaults');
 function metadata(before:boolean):any{return before?class {static ['length'](){return marker;}constructor(first:any,second:any=label,...tail:any[]){this.input=first;}}:class {constructor(first:any,second:any=label,...tail:any[]){this.input=first;}static ['length'](){return marker;}};}
 check(metadata(true).length()===marker&&metadata(false).length()===marker,'constructor-metadata-before-static-members');
 const replacement:any={label},returns:any[]=[undefined,null,false,0,1n,'primitive',marker,replacement,[label],()=>label,new Map([[marker,label]]),Promise.resolve(label)];
 for(const result of returns){const Constructor:any=class {field=label;constructor(){return result;}};const owner:any=new Constructor();const object=result!==null&&(typeof result==='object'||typeof result==='function');valid=valid&&(object?owner===result:owner.field===label&&Object.getPrototypeOf(owner)===Constructor.prototype);}
 check(valid,'constructor-object-and-primitive-return-completions');
 const Forward:any=class {constructor(first:any=later,later:any=label){this.value=first;}};let caught=false;try{new Forward();}catch(error){caught=error instanceof ReferenceError;}
 check(caught,'constructor-forward-formal-tdz');
 const StrictDefault:any=class {constructor(value:any=(()=>{try{arguments.callee;return false;}catch(error){return error instanceof TypeError;}})()){this.strict=value;}};check(new StrictDefault().strict,'strict-arguments-before-constructor-defaults');
 const frozen=Symbol('frozen');caught=false;const Strict:any=class {constructor(input:any){input.value=label;}};try{new Strict(Object.freeze({value:frozen}));}catch(error){caught=error instanceof TypeError;}check(caught,'constructor-body-is-strict');
 const stopped=Symbol('stopped');events.length=0;let failure:any;const Abrupt:any=class {field=(()=>{events.push('field');throw stopped;})();constructor(value:any=fallback()){events.push('body');}};try{new Abrupt();}catch(error){failure=error;}
 check(failure===stopped&&events.join(',')==='field','abrupt-field-stops-constructor-parameters');
 const Other:any=class {};const Reflected:any=class Named {field=label;constructor(value:any,target:any=new.target){this.value=value;this.target=target;this.reader=()=>[Named,new.target,this];}};
 const reflected:any=Reflect.construct(Reflected,[marker],Other),reflection=reflected.reader();check(Object.getPrototypeOf(reflected)===Other.prototype&&reflected.field===label&&reflected.value===marker&&reflected.target===Other&&reflection[0]===Reflected&&reflection[1]===Other&&reflection[2]===reflected,'reflect-construct-callee-new-target-and-receiver');
 const Computed:any=class {field=label;['constructor'](){this.called=marker;}};const computed:any=new Computed();computed.constructor();check(computed.field===label&&computed.called===marker,'computed-constructor-name-remains-an-ordinary-method');
 function deep():any{return class Deep {constructor(${binding}:any,target:any=new.target,...tail:any[]){this.value=value;this.target=target;this.tail=tail;this.read=()=>[Deep,this,value,target,tail];}};}
 async function main():Promise<void>{
  for(const row of factories){let Constructor:any;if(row.protocol==='plain')Constructor=row.factory(label);else if(row.protocol==='async')Constructor=await row.factory(label);else if(row.protocol==='generator'){const iterator=row.factory(label);iterator.next();Constructor=iterator.next().value;}else{const iterator=row.factory(label);await iterator.next();Constructor=(await iterator.next()).value;}
   const omitted:any=new Constructor(),input:any=[marker,{nested:{input:1n}}],owner:any=new Constructor(input,label,marker),read=owner.reader();collect();
   valid=valid&&Constructor.length===0&&omitted.value===label&&omitted.input===label&&owner.value===marker&&owner.input===1n&&owner.field===label&&owner.target===Constructor&&owner.inner===Constructor&&owner.arguments[0]===input&&owner.arguments[1]===label&&owner.arguments[2]===marker&&owner.tail[0]===label&&owner.tail[1]===marker&&read[0]===owner&&read[1]===marker&&read[2]===1n&&read[3]===owner.tail&&read[4]===Constructor&&read[5]===Constructor;
  }
  check(valid,'constructor-patterns-defaults-rest-captures-and-suspending-factories');
  const Deep:any=deep(),owner:any=new Deep(${input},undefined,marker,label);let node:any={owner,Deep};for(let depth=0;depth<${stress?8192:8};depth++)node={previous:node};collect();for(let depth=0;depth<${stress?8192:8};depth++)node=node.previous;
  const result=node.owner.read();check(node.owner.value===label&&node.owner.target===node.Deep&&node.owner.tail[0]===marker&&node.owner.tail[1]===label&&result[0]===node.Deep&&result[1]===node.owner&&result[2]===label&&result[3]===node.Deep&&result[4]===node.owner.tail,'deep-dynamic-constructor-owner-graph');
 }main();
 `;
}

test('Dynamic constructors share the canonical formals and invocation record',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-dynamic-class-constructor-'));
 const erase=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 try{
  const plans=[true,false].flatMap(typed=>[false,true].flatMap(profile=>[false,true].map(noGc=>({typed,profile,noGc,stress:false}))));plans.push({typed:true,profile:true,noGc:false,stress:true});
  const expected=new Map<string,string[]>();
  for(const key of new Set(plans.map(plan=>`${plan.profile}-${plan.stress}-${plan.typed}`))){
   const [profile,stress]=key.split('-').map(value=>value==='true');
   const entry=path.join(temporary,`reference-${key}.mjs`);await fs.writeFile(entry,erase(subject(profile!,true,stress!)));
   const reference=nodeReferenceSync(['node','-e','const fs=require("node:fs");console.log=(value)=>fs.writeSync(1,String(value)+"\\n");globalThis.print=console.log;import(process.argv[1]);',entry],{stdout:'pipe',stderr:'pipe',timeout:120_000});
   expect({exitCode:reference.exitCode,stderr:reference.stderr.toString()}).toEqual({exitCode:0,stderr:''});const lines=reference.stdout.toString().trimEnd().split('\n');expect(lines.at(-1)).toBe('deep-dynamic-constructor-owner-graph:true');expected.set(key,lines);
  }
  for(const {typed,profile,noGc,stress} of plans){
   const directory=path.join(temporary,`${typed}-${profile}-${noGc}-${stress}`);await fs.mkdir(directory);const entry=path.join(directory,typed?'main.ts':'main.mjs'),output=path.join(directory,'program'),diagnostics:string[]=[];
   const source=subject(profile,noGc,stress);await fs.writeFile(entry,typed?source:erase(source));
   const result=await compile({entry,output,noGc,moduleRoots:[entry],initializationEntries:[entry],buildDir:path.join(directory,'build'),...(profile?{test262Observation:{kind:'test262-native-observation' as const,scenarioId:'property/dynamic-class-constructor.js#module',setupEntries:[],testEntry:entry,async:false}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
   expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000,env:{...process.env,GC_FREE_SPACE_DIVISOR:'100'}});
   expect({typed,profile,noGc,stress,exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({typed,profile,noGc,stress,exitCode:0,stderr:''});
   const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect({typed,profile,noGc,stress,...observation}).toMatchObject({typed,profile,noGc,stress,kind:'normal',scenarioId:'property/dynamic-class-constructor.js#module'});
   expect({typed,profile,noGc,stress,lines:(observation?observation.stdout??'':native.stdout.toString()).trimEnd().split('\n')}).toEqual({typed,profile,noGc,stress,lines:expected.get(`${profile}-${stress}-${typed}`)!});
  }
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
},600_000);
