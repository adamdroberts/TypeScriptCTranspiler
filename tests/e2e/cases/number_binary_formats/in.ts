// @ts-nocheck
import {half,single,delayed} from './owner';
console.log(half(1.0004882812500002)===1.0009765625,half(2**-25+2**-77)===2**-24,half(65520-2**-37)===65504);
console.log(Object.is(half(-0),-0),Object.is(half(-(2**-25)),-0),half(65520)===Infinity,single(1+2**-24+2**-52)===1.0000001192092896);
const events:any[]=[];const value={[Symbol.toPrimitive](hint:string){events.push(hint);return '1.0004882812500002';}};
console.log(half(value)===1.0009765625,events.join('|'));
const pending=delayed(value),original=Math.f16round;Math.f16round=()=>({token:53});
async function observe():Promise<void>{const result=await pending;Math.f16round=original;console.log(result===1.0009765625);}observe();
