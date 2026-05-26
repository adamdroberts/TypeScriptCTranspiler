process.env.TZ = "UTC";

const d = new Date(1234);
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("enum:", Object.keys(d, mark("k")).length, Object.values(d, mark("v")).length, Object.entries(d, mark("e")).length);
console.log("names:", Object.getOwnPropertyNames(d, mark("n")).length, Reflect.ownKeys(d, mark("r")).length);

const desc: any = Object.getOwnPropertyDescriptor(d, "getTime", mark("d"));
const descs: any = Object.getOwnPropertyDescriptors(d, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(d, "getTime", mark("R"));
console.log("desc:", String(desc), Object.keys(descs).length, String(reflectDesc));
console.log("own:", Object.hasOwn(d, "getTime", mark("h")), d.hasOwnProperty("getTime", mark("p")), d.propertyIsEnumerable("getTime", mark("i")));
console.log("integrity:", Object.isExtensible(d, mark("E")), Object.isSealed(d, mark("L")), Object.isFrozen(d, mark("F")), Reflect.isExtensible(d, mark("I")));
console.log("tag:", Object.prototype.toString.call(d, mark("t")), d.toString().startsWith("Thu Jan 01 1970"));
console.log("trace:", trace);
