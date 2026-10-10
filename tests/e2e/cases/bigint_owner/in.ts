// @ts-nocheck
import {convert,delayed} from './owner';
const events:any[]=[],marker={token:17};
const operand={[Symbol.toPrimitive](hint:string){events.push(hint);return '257';}};
console.log(convert(operand)===257n,BigInt('\u00a0\ufeff17\u2029')===17n,BigInt('')===0n,events.join('|'));
console.log(BigInt.asIntN(8,257n)===1n,BigInt.asUintN(8,-1n)===255n,BigInt.asIntN(9007199254740991,-17n)===-17n);
events.length=0;const bits={valueOf(){events.push('bits');return 8;}},value={[Symbol.toPrimitive](hint:string){events.push('value:'+hint);return '-1';}};
console.log(BigInt.asUintN(bits,value)===255n,events.join('|'));
let syntax=false,range=false,type=false;try{BigInt('1 0');}catch(error){syntax=error instanceof SyntaxError;}try{BigInt(1.5);}catch(error){range=error instanceof RangeError;}try{BigInt.asIntN(8,17);}catch(error){type=error instanceof TypeError;}console.log(syntax,range,type);
const owner=BigInt,original=owner.asIntN;owner.asIntN=function(...actual:any[]):any{return [this,actual];};const pending=delayed(marker,marker);owner.asIntN=original;
(globalThis as any).BigInt=(value:any):any=>value;console.log(convert(marker)===marker);(globalThis as any).BigInt=owner;
async function check():Promise<void>{const observed=await pending;console.log(observed[0]===owner,observed[1][0]===marker,observed[1][1]===marker);}check();
