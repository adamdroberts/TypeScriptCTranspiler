import {make, prototypeOf} from './owner';
function Target(): void {}
const target: any = Target;
target.prototype = null;
const owner: any = make(Function, target), prototype: any = prototypeOf(owner);
const value: any = new owner();
console.log(prototype.constructor === owner, Object.getPrototypeOf(prototype) === Object.prototype);
console.log(value.value === 37, Object.getPrototypeOf(value) === prototype);
const replacement: any = {};
Reflect.defineProperty(owner, 'prototype', {value: replacement});
console.log(prototypeOf(owner) === replacement, Object.getPrototypeOf(new owner()) === replacement);
const another: any = make(Function, target);
console.log(another !== owner, prototypeOf(another) !== prototype);
