const sealed: any = { a: 1 };
const frozen: any = { x: 1 };

Object.seal(sealed);
Object.freeze(frozen);

console.log("sealed states:", Object.isSealed(sealed), Object.isFrozen(sealed), Object.isExtensible(sealed));
console.log("frozen states:", Object.isSealed(frozen), Object.isFrozen(frozen), Object.isExtensible(frozen));
console.log("sealed set existing:", Reflect.set(sealed, "a", 2));
console.log("sealed set new:", Reflect.set(sealed, "b", 3));
console.log("sealed delete:", Reflect.deleteProperty(sealed, "a"));
console.log("frozen set existing:", Reflect.set(frozen, "x", 2));
console.log("frozen delete:", Reflect.deleteProperty(frozen, "x"));
console.log("json:", JSON.stringify(sealed), JSON.stringify(frozen));
