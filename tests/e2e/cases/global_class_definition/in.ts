import Default, {Base,Derived,Forward,ObjectReturn,events} from './owner.js';
const Cjs: any=require('./common-owner.cjs');
const owner=new Derived([],1,2),reader:any=owner.reader();
console.log('module:'+(owner.value===17&&owner.tail.join(',')==='1,2'&&owner.field()===3&&reader[0]===owner&&reader[1]===Derived&&reader[2]===Derived&&reader[3].length===3));
console.log(events.join(','));
console.log('prototype:'+(owner instanceof Derived&&owner instanceof Base&&owner.observed===Derived.prototype&&Object.getPrototypeOf(Derived)===Base&&owner.read()===17));
const forwarded=new Forward(23,4,5),fallback=new Default([29]);
console.log('default:'+(forwarded.value===23&&forwarded.tail.join(',')==='4,5'&&fallback.value===29&&fallback.extra===5&&fallback instanceof Derived&&(new ObjectReturn() as any).returned));
function Alternate():void {}
const alternate=Reflect.construct(Derived,[[31]],Alternate);
console.log('new-target:'+(alternate.value===31&&alternate.target===Alternate&&alternate.reader()[1]===Alternate&&Object.getPrototypeOf(alternate)===Alternate.prototype));
const cjs=new Cjs(37,6,7);
console.log('commonjs:'+(cjs.value===37&&cjs.tail.join(',')==='6,7'));
class TypedDerived extends Base {other=7;constructor(value:number){super(value)}}
class TypedLeaf extends TypedDerived {leaf=11}
const typed=new TypedLeaf(41);
console.log('typed-subclass:'+(typed.value===41&&typed.base===1&&typed.other===7&&typed.leaf===11&&typed.read()===41&&typed instanceof Base&&typed instanceof TypedDerived&&typed instanceof TypedLeaf));
