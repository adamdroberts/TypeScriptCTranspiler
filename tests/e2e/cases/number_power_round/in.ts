// @ts-nocheck
import {power,compound,delayed} from './owner';
console.log(Object.is(Math.round(0.49999999999999994),0),Object.is(Math.round(4503599627370497),4503599627370497),Object.is(Math.round(-0.5),-0));
console.log(Number.isNaN(Math.pow(1,Infinity)),Number.isNaN(power(-1,Infinity)),Number.isNaN(compound(1,NaN)),power(NaN,-0)===1);
console.log(Object.is(power(-0,-3),-Infinity),Object.is(compound(-Infinity,-3),-0),power(-2,3)===-8);
const events:any[]=[];
function operand(label:string,value:any):any{return {valueOf(){events.push(label);return value;}};}
function second():any{events.push('argument');return operand('exponent',3);}
console.log(power(operand('base',2),second())===8,events.join('|'));
let value:number=2;function rhs():number{value=3;return 2;}console.log((value**=rhs())===4,value===4);
const math=Math,original=math.pow,marker={token:17};
math.pow=function(...actual:any[]):any{return [this,actual];};const pending=delayed(marker,marker);math.pow=original;
async function check():Promise<void>{const observed=await pending;console.log(observed[0]===math,observed[1][0]===marker,observed[1][1]===marker);}check();
