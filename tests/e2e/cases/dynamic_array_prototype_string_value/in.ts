const arr: any = [1, null, undefined, "x"];

const toString = arr.toString;
const toLocaleString = arr.toLocaleString;
const valueOf = arr.valueOf;

console.log("types:", typeof toString, typeof toLocaleString, typeof valueOf);
console.log("lookup:", Object.prototype.hasOwnProperty.call(arr, "toString"), "toString" in arr, Reflect.has(arr, "toLocaleString"));
console.log("strings:", Reflect.apply(toString, arr, []), Reflect.apply(toLocaleString, arr, []));
console.log("value:", Reflect.apply(valueOf, arr, []) === arr);
