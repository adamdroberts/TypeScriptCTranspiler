const dynNull: any = null;
const dynUndefined: any = undefined;
const dynNumber: any = 7;
const dynString: any = "ab";
const dynBoolean: any = true;
const dynObject: any = { value: 1 };

console.log("states nullish:", Object.isExtensible(dynNull), Object.isSealed(dynUndefined), Object.isFrozen(dynNull));
console.log("identity null:", Object.preventExtensions(dynNull) === null, Object.seal(dynNull) === null, Object.freeze(dynNull) === null);
console.log("identity undefined:", Object.preventExtensions(dynUndefined) === undefined, Object.seal(dynUndefined) === undefined, Object.freeze(dynUndefined) === undefined);
console.log("identity number:", Object.preventExtensions(dynNumber), Object.seal(dynNumber), Object.freeze(dynNumber));
console.log("identity string:", Object.preventExtensions(dynString), Object.seal(dynString), Object.freeze(dynString));
console.log("identity boolean:", Object.preventExtensions(dynBoolean), Object.seal(dynBoolean), Object.freeze(dynBoolean));

console.log("object before:", Object.isExtensible(dynObject));
console.log("object prevent:", Object.preventExtensions(dynObject) === dynObject, Object.isExtensible(dynObject));
console.log("object set:", Reflect.set(dynObject, "extra", 2), Object.hasOwn(dynObject, "extra"));
