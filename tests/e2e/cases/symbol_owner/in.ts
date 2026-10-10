// @ts-nocheck
import {create,registered,registryKey,delayed,show} from './owner';
const original=Symbol,events:any[]=[],marker={token:67};
const input={[original.toPrimitive](hint:any){events.push(hint);return 'description';}};
console.log(create(input).description,events.join('|'),registered(17)===original.for('17'),registryKey(original('local'))===undefined);
let error:any;try{registryKey({});}catch(caught){error=caught;}console.log(error instanceof TypeError);
const tag=original.toStringTag,brand=Object.prototype.toString,saved=Object.getOwnPropertyDescriptor(original.prototype,tag),symbol=original('payload');
delete original.prototype[tag];console.log(Reflect.apply(brand,symbol,[]),Reflect.apply(brand,Object(symbol),[]));Object.defineProperty(original.prototype,tag,saved);
Object.defineProperty(Number.prototype,tag,{get(){return typeof this==='object'?'Boxed':'Primitive';},configurable:true});console.log(Reflect.apply(brand,17,[]));delete Number.prototype[tag];
Symbol={get iterator(){events.push('key');return 'chosen';}};
class Computed { [Symbol.iterator](){return marker;} }
const instance:any=new Computed();Symbol=original;console.log(instance.chosen()===marker,instance.chosen.name,events.at(-1)==='key');
Symbol={iterator:'length'};const array:any[]=[];console.log(Symbol.iterator in array);Symbol=original;
const savedString=Object.getOwnPropertyDescriptor(original.prototype,'toString');original.prototype.toString=function(){return marker;};console.log(show(symbol)===marker);Object.defineProperty(original.prototype,'toString',savedString);
Symbol=function(value:any){return value;};console.log(create(marker)===marker);const pending=delayed(marker);Symbol=original;
async function observe():Promise<void>{const result=await pending;console.log(result===marker);}observe();
