import {expect,test} from 'bun:test';
import {finiteEvalScriptSourceGraph} from '../test262/native-host';
import {nodeReferenceSync} from './node-reference';

/* Every internal method a Proxy receives calls its handler's trap: user code
 * that runs at the operation that reached it. `k in p` (and through an
 * ordinary object whose prototype is p, and a name a with object supplies)
 * calls `has`; delete calls `deleteProperty`; for-in, an object rest element
 * and the natives that list keys call `ownKeys` and
 * `getOwnPropertyDescriptor`; Object.defineProperty and friends call
 * `defineProperty`; isPrototypeOf and Object.prototype.toString walk
 * `getPrototypeOf` and read through `get`; the integrity natives call
 * `isExtensible` and `preventExtensions`; Reflect forwards each. A handler
 * without the trap forwards to its target. A native whose steps the model
 * knows runs exactly their traps: Object.is none, Object.hasOwn and
 * hasOwnProperty the object's own descriptor (a key operand only its
 * conversion), Object.create nothing of its prototype; those shapes must
 * evaluate exactly what Node evaluates. Each generated Script evaluates
 * what the trap wrote; the graph must fail closed or contain every source
 * Node evaluates, and the shapes listed as finite must stay finite. 128
 * Proxies, each the target of the next with a `has` trap that asks its own
 * target, are the depth stress: every trap's result check walks the chain
 * below it, so the stress costs the square of its depth (docs/todo.md). */

const trap=(name:string,target='{}')=>`var g="0;";var p=new Proxy(${target},{${name}(...a){g="1;";return Reflect.${name}(...a)}});`;
const shapes:Record<string,string>={
 get:trap('get')+'p.x;',
 hasIn:trap('has')+'"x" in p;', hasWith:trap('has')+'with(p){typeof x}', hasInherited:trap('has')+'"x" in Object.create(p);',
 deleteProperty:trap('deleteProperty')+'delete p.x;', reflectDelete:trap('deleteProperty')+'Reflect.deleteProperty(p,"x");',
 ownKeysForIn:trap('ownKeys')+'for(var k in p);', restDestructure:trap('ownKeys')+'var {...rest}=p;',
 ownKeysKeys:trap('ownKeys')+'Object.keys(p);', getOwnPropertyDescriptors:trap('ownKeys')+'Object.getOwnPropertyDescriptors(p);',
 objectCreateProps:trap('ownKeys')+'Object.create(null,p);',
 gopdGet:trap('getOwnPropertyDescriptor')+'Object.getOwnPropertyDescriptor(p,"x");', reflectGopd:trap('getOwnPropertyDescriptor')+'Reflect.getOwnPropertyDescriptor(p,"x");',
 propertyIsEnumerable:trap('getOwnPropertyDescriptor')+'Object.prototype.propertyIsEnumerable.call(p,"x");',
 defineProperty:trap('defineProperty')+'Object.defineProperty(p,"x",{value:1,configurable:true});', defineProperties:trap('defineProperty')+'Object.defineProperties(p,{x:{value:1}});',
 getPrototypeOf:trap('getPrototypeOf')+'Object.getPrototypeOf(p);', isPrototypeOf:trap('getPrototypeOf')+'Object.prototype.isPrototypeOf.call(Array.prototype,p);',
 reflectGetProto:trap('getPrototypeOf')+'Reflect.getPrototypeOf(p);', setPrototypeOf:trap('setPrototypeOf')+'Object.setPrototypeOf(p,null);',
 isExtensible:trap('isExtensible')+'Object.isExtensible(p);', isFrozen:trap('isExtensible')+'Object.isFrozen(p);', isSealed:trap('isExtensible')+'Object.isSealed(p);',
 preventExtensions:trap('preventExtensions')+'Object.preventExtensions(p);', freeze:trap('preventExtensions')+'Object.freeze(p);', seal:trap('preventExtensions')+'Object.seal(p);',
 objectToString:trap('get')+'Object.prototype.toString.call(p);',
 set:trap('set')+'p.x=1;', apply:trap('apply','function(){}')+'p();', construct:trap('construct','function(){}')+'new p();',
 noTrapForwards:'var g="0;";var t=new Proxy({},{has(...a){g="1;";return Reflect.has(...a)}});var p=new Proxy(t,{});"x" in p;',
 hasOwnStatic:trap('getOwnPropertyDescriptor')+'Object.hasOwn(p,"x");', hasOwnPrototype:trap('getOwnPropertyDescriptor')+'Object.prototype.hasOwnProperty.call(p,"x");',
 hasOwnKey:'var g="0;";var p=new Proxy({},{get(t,k,r){g="1;";return Reflect.get(t,k,r)}});Object.hasOwn({},p);',
 propertyIsEnumerableKey:'var g="0;";var p=new Proxy({},{get(t,k,r){g="1;";return Reflect.get(t,k,r)}});Object.prototype.propertyIsEnumerable.call({},p);',
 createProps:trap('getOwnPropertyDescriptor','{x:{value:1}}')+'Object.create(null,p);', isPrototypeOfChain:trap('getPrototypeOf')+'Object.prototype.isPrototypeOf.call(Array.prototype,Object.create(p));',
 nestedTargetInvariant:'var g="0;";var t=new Proxy({},{getOwnPropertyDescriptor(...a){g="1;";return Reflect.getOwnPropertyDescriptor(...a)}});var p=new Proxy(t,{defineProperty(...a){return Reflect.defineProperty(...a)}});Object.defineProperty(p,"x",{value:1,configurable:true});',
 objectIsInert:trap('get')+'Object.is(p,p);', hasOwnInherited:trap('get')+'Object.hasOwn(Object.create(p),"x");', createPrototype:trap('get')+'Object.create(p);',
};
const exact=['objectIsInert','hasOwnInherited','createPrototype'];
const finite=['get','hasIn','hasWith','hasInherited','deleteProperty','reflectDelete','ownKeysForIn','restDestructure','getOwnPropertyDescriptors','objectCreateProps','gopdGet','reflectGopd','propertyIsEnumerable',
 'getPrototypeOf','isPrototypeOf','reflectGetProto','isExtensible','isFrozen','isSealed','preventExtensions','freeze','seal','objectToString',
 'propertyIsEnumerableKey','createProps','isPrototypeOfChain',...exact];

test('a Proxy runs the trap of every internal method an operation performs on it',()=>{
 const names=Object.keys(shapes);
 const oracle=nodeReferenceSync(['node','-e','const vm=require("node:vm");const out=[];for(const source of JSON.parse(process.argv[1])){const seen=[];vm.runInNewContext(source,{observe:value=>seen.push(value)});out.push(seen)}process.stdout.write(JSON.stringify(out))',
  JSON.stringify(names.map(name=>shapes[name]+'observe(g);'))],{stdout:'pipe',stderr:'pipe',timeout:60_000});
 expect({code:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({code:0,stderr:''});
 const observed:string[][]=JSON.parse(oracle.stdout.toString());
 const results=names.map((name,index)=>{
  const graph=finiteEvalScriptSourceGraph([{path:'main.js',source:shapes[name]+'eval(g);'}]);
  return {name,error:graph.error,sources:graph.directEvalSources.map(record=>record.source),node:observed[index]!};
 });
 // Sound: a finite graph contains every source Node evaluates.
 expect(results.filter(result=>result.error===null&&!result.node.every(value=>result.sources.includes(value)))).toEqual([]);
 // Precise: the listed shapes are finite, and the exact natives run no other trap.
 expect(results.filter(result=>finite.includes(result.name)&&result.error!==null).map(result=>result.name)).toEqual([]);
 expect(results.filter(result=>exact.includes(result.name)).map(result=>({name:result.name,sources:result.sources}))).toEqual(exact.map(name=>({name,sources:['0;']})));
},300_000);

test('128 Proxies whose has traps ask their targets stay finite',()=>{
 const lines=['var g="0;";var p0={};'];
 for(let index=1;index<=128;index++)lines.push(`var p${index}=new Proxy(p${index-1},{has(t,k){g="1;";return k in t}});`);
 lines.push('"x" in p128;eval(g);');
 const graph=finiteEvalScriptSourceGraph([{path:'deep.js',source:lines.join('\n')}]);
 expect({error:graph.error,sources:graph.directEvalSources.map(record=>record.source).sort()}).toEqual({error:null,sources:['0;','1;']});
},300_000);
