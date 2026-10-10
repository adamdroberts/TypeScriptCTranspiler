// @ts-nocheck
import {random,delayed} from './owner';
const math=Math,marker={token:43},poison={[Symbol.toPrimitive](){throw marker;}};
const descriptor=Object.getOwnPropertyDescriptor(math,Symbol.toStringTag);
console.log(descriptor.value==='Math',!descriptor.writable,!descriptor.enumerable,descriptor.configurable,Object.prototype.toString.call(math)==='[object Math]');
let valid=true;for(let index=0;index<4096;index++){const value=index%2?random():math.random.call(marker,poison);if(!(value>=0&&value<1&&!Object.is(value,-0)))valid=false;}console.log(valid);
Object.defineProperty(math,Symbol.toStringTag,{value:'Changed'});console.log(Object.prototype.toString.call(math)==='[object Changed]');Object.defineProperty(math,Symbol.toStringTag,descriptor);
const original=math.random;math.random=function(...actual:any[]):any{return [this,actual];};const pending=delayed(marker);math.random=original;
async function observe():Promise<void>{const value=await pending;console.log(value[0]===math,value[1][0]===marker);}observe();
