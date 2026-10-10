// @ts-nocheck
import {sum,delayed} from './owner';
console.log(sum([1e308,1e308,1,-1e308,-1e308])===1,sum([1e30,0.1,-1e30])===0.1,Object.is(sum([]),-0));
console.log(Object.is(sum([-0,-0]),-0),Object.is(sum([-0,0]),0),Object.is(sum([1,2**-53]),1),sum([1,2**-53,Number.MIN_VALUE])===1.0000000000000002);
const events:any[]=[];const marker={token:37};
const iterable={ [Symbol.iterator](){let index=0;return {next(){events.push('next');return index++===0?{value:Infinity,done:false}:{value:marker,done:false};},return(){events.push('return');throw marker;}};}};
let caught:any;try{sum(iterable);}catch(error){caught=error;}
console.log(caught instanceof TypeError,events.join('|'));
const array=[4];array[Symbol.iterator]=function*(){yield 1e30;yield 0.1;yield -1e30;};console.log(sum(array)===0.1);
const original=Math.sumPrecise;Math.sumPrecise=function(...actual:any[]):any{return [this,actual];};const pending=delayed(marker);Math.sumPrecise=original;
async function check():Promise<void>{const result=await pending;console.log(result[0]===Math,result[1][0]===marker);}check();
