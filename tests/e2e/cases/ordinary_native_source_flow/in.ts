import {produce,closure,record,collection,Owner,suspended} from './source';
const expected:any={marker:true};
Object.defineProperty(Date.prototype,'getTime',{value:()=>expected,writable:true,configurable:true});
const retained=produce,forward=()=>retained(),owner=new Owner(),array=[forward()],literal={value:closure()};
console.log('functions',Object.is(produce(),expected),Object.is(retained(),expected),Object.is(forward(),expected));
console.log('fields',Object.is(owner.value,expected),Object.is(owner.read(),expected),Object.is(owner.result,expected));
console.log('aggregates',Object.is(array[0],expected),Object.is(literal.value,expected),Object.is(record().value,expected),Object.is(collection()[0],expected));
async function verify():Promise<void>{
    const actual=await suspended();
    console.log('suspended',Object.is(actual,expected),typeof actual);
}
verify().catch((error:any)=>{throw error;});
