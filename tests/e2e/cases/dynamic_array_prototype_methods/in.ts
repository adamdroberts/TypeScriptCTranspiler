const arr: any = ["red", "blue", "red"];

const join = arr.join;
const includes = arr.includes;
const indexOf = arr.indexOf;
const lastIndexOf = arr.lastIndexOf;
const at = arr.at;
const keys = arr.keys;
const values = arr.values;
const entries = arr.entries;

console.log("types:", typeof join, typeof includes, typeof indexOf, typeof keys);
console.log("lookup:", Object.prototype.hasOwnProperty.call(arr, "join"), "join" in arr, Reflect.has(arr, "values"));
console.log("search:", Reflect.apply(join, arr, ["|"]), Reflect.apply(includes, arr, ["blue"]), Reflect.apply(includes, arr, ["green"]), Reflect.apply(indexOf, arr, ["red", 1]), Reflect.apply(lastIndexOf, arr, ["red"]), Reflect.apply(at, arr, [-2]));

const keyList: any = Reflect.apply(keys, arr, []);
const valueList: any = Reflect.apply(values, arr, []);
const entryList: any = Reflect.apply(entries, arr, []);
console.log("iters:", keyList.join("|"), valueList.join("|"), entryList[1].join("|"));
