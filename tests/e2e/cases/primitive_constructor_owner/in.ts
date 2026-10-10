// @ts-nocheck
import {numeric,textual,boolean,wrapper,delayed} from './owner';
const events:any[]=[];const input={[Symbol.toPrimitive](hint:string){events.push(hint);return '23';}};
const target=new Proxy(function Target(){},{get(object,key,receiver){if(key==='prototype'){events.push('prototype');return Number.prototype;}return Reflect.get(object,key,receiver);}});
const number=Reflect.construct(Number,[input],target);console.log(number.valueOf()===23,events.join('|'));
const symbol=Symbol('payload');let caught:any;try{wrapper(symbol);}catch(error){caught=error;}console.log(textual(symbol)==='Symbol(payload)',caught instanceof TypeError,boolean(input));
const text=wrapper('A😀Z');console.log(text.length===4,text[1].charCodeAt(0)===0xd83d,text[2].charCodeAt(0)===0xde00,Reflect.ownKeys(text).join('|')==='0|1|2|3|length');
const originalNumber=Number,originalString=String,marker={token:61};Number=()=>marker;console.log(numeric(17)===marker,typeof Number==='function');Number={token:marker};console.log(typeof Number==='object');Number=originalNumber;
String=function(value:any){return value;};const pending=delayed(marker);String=originalString;
async function observe():Promise<void>{const value=await pending;console.log(value===marker);}observe();
