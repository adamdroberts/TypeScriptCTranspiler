const proto: any = Array.prototype;
const ctor: any = proto.constructor;
const descriptor: any = Object.getOwnPropertyDescriptor(proto, "constructor");
const speciesDescriptor: any = Object.getOwnPropertyDescriptor(Array, Symbol.species);
const constructorSymbols: symbol[] = Object.getOwnPropertySymbols(Array);
const called: any = ctor("a", "b");
const sized: any = Array(3);
const constructed: any = new Array("x", "y");

console.log("identity:", ctor === Array, ctor.prototype === proto, descriptor.writable, descriptor.enumerable, descriptor.configurable, typeof ctor, ctor.name, ctor.length);
console.log("species:", Array[Symbol.species] === Array, typeof speciesDescriptor.get, speciesDescriptor.set === undefined, speciesDescriptor.enumerable, speciesDescriptor.configurable, constructorSymbols.length, constructorSymbols[0] === Symbol.species);
console.log("call:", Array.isArray(called), called.length, called[0], called[1]);
console.log("size:", sized.length, sized[0] === undefined, sized[2] === undefined);
console.log("new:", Array.isArray(constructed), constructed.length, constructed[0], constructed[1]);
