import {advance} from './owner';
const result=advance('2');
console.log(result[0]==='string',result[1]===2,result[2]===3,result[3]==='number');
let value:number=('2' as any);
console.log(typeof value==='string',value++===2,value===3,typeof value==='number');
let compound:number=('6' as any);
console.log(typeof compound==='string',(compound*=2)===12,compound===12);
let actual:number=(7n as any);
console.log((actual++ as any)===7n,(actual as any)===8n,typeof actual==='bigint');
