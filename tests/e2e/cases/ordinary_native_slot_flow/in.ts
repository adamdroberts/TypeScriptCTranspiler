import {produce,identity,closure,first,Owner,Slot,keyed} from './source';
const expected:any={marker:true};
Object.defineProperty(Date.prototype,'getTime',{value:()=>expected,writable:true,configurable:true});
const direct:number=produce();let binding:number=0;binding=produce();
const owner=new Owner();owner.value=produce();
const slot:Slot={value:0};slot.value=produce();
const record={value:0};record.value=produce();
const array:number[]=[0],alias=array;alias[0]=produce();array.push(produce());
const values=[produce(),72],bound=identity.bind(null,produce());
owner[keyed()]=produce();
function patterns():void{
    const [destructured]=values;const {value:destructuredRecord}=record;
    console.log('patterns',Object.is(destructured,expected),Object.is(destructuredRecord,expected),owner.other);
}
console.log('annotations',Object.is(direct,expected),Object.is(binding,expected),Object.is(produce(),expected));
console.log('slots',Object.is(owner.value,expected),Object.is(owner.echo(produce()),expected),Object.is(slot.value,expected),Object.is(record.value,expected));
console.log('array',Object.is(array[0],expected),Object.is(array[1],expected),Object.is(array.map(identity)[0],expected));
console.log('arguments',Object.is(identity(produce()),expected),Object.is(closure(produce()),expected),Object.is(first(...values),expected));
patterns();
console.log('reflective',Object.is(identity.call(null,produce()),expected),Object.is(identity.apply(null,[produce()]),expected),Object.is(bound(),expected),Object.is(Reflect.apply(identity,null,[produce()]),expected));
console.log('numeric',identity(42),closure(41)+1);
