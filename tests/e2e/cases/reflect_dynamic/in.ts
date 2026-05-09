const obj: any = { a: 1 };

console.log("get a:", Reflect.get(obj, "a"));
console.log("set b:", Reflect.set(obj, "b", 2));
console.log("get b:", Reflect.get(obj, "b"));
console.log("json:", JSON.stringify(obj));
