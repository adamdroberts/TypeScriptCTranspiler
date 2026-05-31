import util from 'util';
import * as nodeUtil from 'node:util';
import { types } from 'util';

const date = new Date(1234567890);
const regexp = /hello/g;
const error = new Error("something went wrong");
const promise = Promise.resolve("done");
const map = new Map<string, number>();
const set = new Set<string>();
const buffer = Buffer.from("hello");

const values: any[] = [
    date,
    regexp,
    error,
    promise,
    map,
    set,
    buffer,
    "just a string",
    12345,
    true,
    null,
    undefined
];

console.log("--- Testing via util.types (default import) ---");
for (const val of values) {
    console.log(
        "isDate: " + util.types.isDate(val) +
        " isRegExp: " + util.types.isRegExp(val) +
        " isNativeError: " + util.types.isNativeError(val) +
        " isPromise: " + util.types.isPromise(val) +
        " isMap: " + util.types.isMap(val) +
        " isSet: " + util.types.isSet(val) +
        " isTypedArray: " + util.types.isTypedArray(val)
    );
}

console.log("--- Testing via nodeUtil.types (namespace import) ---");
for (const val of values) {
    console.log(
        "isDate: " + nodeUtil.types.isDate(val) +
        " isRegExp: " + nodeUtil.types.isRegExp(val) +
        " isNativeError: " + nodeUtil.types.isNativeError(val) +
        " isPromise: " + nodeUtil.types.isPromise(val) +
        " isMap: " + nodeUtil.types.isMap(val) +
        " isSet: " + nodeUtil.types.isSet(val) +
        " isTypedArray: " + nodeUtil.types.isTypedArray(val)
    );
}

console.log("--- Testing via types (named import) ---");
for (const val of values) {
    console.log(
        "isDate: " + types.isDate(val) +
        " isRegExp: " + types.isRegExp(val) +
        " isNativeError: " + types.isNativeError(val) +
        " isPromise: " + types.isPromise(val) +
        " isMap: " + types.isMap(val) +
        " isSet: " + types.isSet(val) +
        " isTypedArray: " + types.isTypedArray(val)
    );
}

console.log("--- Statically typed checks ---");
console.log("util.types.isDate(date): " + util.types.isDate(date));
console.log("util.types.isRegExp(regexp): " + util.types.isRegExp(regexp));
console.log("util.types.isNativeError(error): " + util.types.isNativeError(error));
console.log("util.types.isPromise(promise): " + util.types.isPromise(promise));
console.log("util.types.isMap(map): " + util.types.isMap(map));
console.log("util.types.isSet(set): " + util.types.isSet(set));
console.log("util.types.isTypedArray(buffer): " + util.types.isTypedArray(buffer));
