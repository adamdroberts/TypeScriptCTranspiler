// @ts-nocheck
import {create,construct,of,delayed,delayedNew} from './owner';
const original=Array,marker={token:73},events:any[]=[],prototype=original.prototype;
const sparse=construct(4294967295);console.log(sparse.length===4294967295,Reflect.ownKeys(sparse).join('|')==='length',create(marker)[0]===marker);
const desc=Object.getOwnPropertyDescriptor(original,'prototype');console.log(!desc.writable,!desc.enumerable,!desc.configurable,!Reflect.set(original,'prototype',marker));
const target=new Proxy(function Target(){},{get(object,key,receiver){if(key==='prototype'){events.push('prototype');return prototype;}return Reflect.get(object,key,receiver);}});let error:any;try{Reflect.construct(original,[-1],target);}catch(caught){error=caught;}console.log(error instanceof RangeError,events.join('|'));
Array=function(value:any){return {value};};console.log(create(marker).value===marker,construct(marker).value===marker);const call=delayed(marker),construction=delayedNew(marker);Array=original;
Array={of(value:any){return {value};},prototype:marker};console.log(of(marker).value===marker,Array.prototype===marker);Array=original;
async function observe():Promise<void>{const first=await call,second=await construction;console.log(first.value===marker,second.value===marker);}observe();
