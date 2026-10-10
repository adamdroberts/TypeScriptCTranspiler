import Base,{value,mutate} from './owner.mjs';
import {events,reason} from './shared.mjs';
events.push('main:start');
const Parent:any=await Promise.resolve(Base);
class Derived extends Parent {read():number{return value}}
const owner:any=new Derived();
console.log('class:'+(owner.self()===owner&&owner instanceof Base&&owner.field===3));
const namespace=await import('./owner.mjs');mutate();
console.log('live:'+(namespace.value===8&&owner.read()===8));
try{await import('./failed.mjs')}catch(error){console.log('rejection:'+(error===reason))}
console.log(events.join(','));
