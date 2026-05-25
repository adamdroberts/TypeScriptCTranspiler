const re = /cat/g;
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("enum:", Object.keys(re, mark("k")).length, Object.values(re, mark("v")).length, Object.entries(re, mark("e")).length);
console.log("names:", Object.getOwnPropertyNames(re, mark("n")).join("|"), Reflect.ownKeys(re, mark("r")).join("|"));

const desc: any = Object.getOwnPropertyDescriptor(re, "lastIndex", mark("d"));
const missing: any = Object.getOwnPropertyDescriptor(re, "source", mark("m"));
const descs: any = Object.getOwnPropertyDescriptors(re, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(re, "lastIndex", mark("R"));
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable, String(missing));
console.log("descs:", Object.keys(descs).join("|"), descs.lastIndex.value, descs.lastIndex.writable, descs.lastIndex.enumerable, descs.lastIndex.configurable, reflectDesc.value);
console.log("own:", Object.hasOwn(re, "lastIndex", mark("h")), Object.hasOwn(re, "source", mark("H")), re.hasOwnProperty("lastIndex", mark("p")), re.propertyIsEnumerable("lastIndex", mark("i")));
console.log("call:", Object.prototype.hasOwnProperty.call(re, "lastIndex", mark("c")), Object.prototype.propertyIsEnumerable.call(re, "lastIndex", mark("q")));
console.log("tag:", Object.prototype.toString.call(re, mark("t")));
console.log("trace:", trace);
