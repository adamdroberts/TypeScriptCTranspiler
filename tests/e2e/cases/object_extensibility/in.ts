const obj: any = { a: 1 };

console.log("extensible before:", Object.isExtensible(obj), Reflect.isExtensible(obj));
console.log("prevent:", Reflect.preventExtensions(obj));
console.log("extensible after:", Object.isExtensible(obj), Reflect.isExtensible(obj));
console.log("set existing:", Reflect.set(obj, "a", 2));
console.log("set new:", Reflect.set(obj, "b", 3));
console.log("define new:", Reflect.defineProperty(obj, "c", { value: 4, enumerable: true }));

Object.preventExtensions(obj);

console.log("a:", Reflect.get(obj, "a"));
console.log("keys:", Object.keys(obj).join("|"));
console.log("json:", JSON.stringify(obj));
