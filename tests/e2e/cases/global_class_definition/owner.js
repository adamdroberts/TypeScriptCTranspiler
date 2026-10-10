export const events=[];
const key=Symbol('retained-field');
export class Base {base=(events.push('base-field'),1);constructor(value,...tail){events.push('base-body');this.value=value;this.tail=tail;this.observed=Object.getPrototypeOf(this);this.target=new.target}read(){return this.value}}
export class Derived extends Base {[key]=(events.push('derived-field'),3);constructor([value=17]=[],...tail){const reader=()=>[this,new.target,Derived,arguments];super(value,...tail);events.push('derived-body');this.reader=reader}read(){return super.read()}field(){return this[key]}}
export class Forward extends Base {}
export class ObjectReturn extends Base {constructor(){return {returned:true}}}
export default class extends Derived {extra=5}
