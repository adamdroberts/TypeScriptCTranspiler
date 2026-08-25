const mathValue: any = Math;
const jsonValue: any = JSON;
const detachedAbs: any = mathValue.abs;
const parse: any = jsonValue.parse;
const stringify: any = jsonValue.stringify;
const parsed: any = parse("{\"answer\":42}");
const piDescriptor: any = Object.getOwnPropertyDescriptor(mathValue, "PI");
const absDescriptor: any = Object.getOwnPropertyDescriptor(mathValue, "abs");

console.log("identity:", mathValue === Math, jsonValue === JSON, typeof Math, typeof JSON, Array.isArray(Math), Array.isArray(JSON));
console.log("math dynamic:", detachedAbs(-7), mathValue.max(2, 9, 4), mathValue.hypot(3, 4), Number.isNaN(mathValue.abs()), Number.isNaN(mathValue.pow(2)));
console.log("math metadata:", detachedAbs.name, detachedAbs.length, piDescriptor.value === Math.PI, piDescriptor.writable, piDescriptor.enumerable, piDescriptor.configurable, absDescriptor.value === detachedAbs, absDescriptor.writable, absDescriptor.enumerable, absDescriptor.configurable);
console.log("json dynamic:", parsed.answer, stringify(parsed), parse.name, parse.length, stringify.name, stringify.length);
