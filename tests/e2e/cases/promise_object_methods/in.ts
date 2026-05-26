const p = Promise.resolve(7);
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("enum:", Object.keys(p, mark("k")).length, Object.values(p, mark("v")).length, Object.entries(p, mark("e")).length);
console.log("names:", Object.getOwnPropertyNames(p, mark("n")).length, Reflect.ownKeys(p, mark("r")).length);

const desc: any = Object.getOwnPropertyDescriptor(p, "then", mark("d"));
const descs: any = Object.getOwnPropertyDescriptors(p, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(p, "then", mark("R"));
console.log("desc:", String(desc), Object.keys(descs).length, String(reflectDesc));
console.log("own:", Object.hasOwn(p, "then", mark("h")), p.hasOwnProperty("then", mark("p")), p.propertyIsEnumerable("then", mark("i")));
console.log("integrity:", Object.isExtensible(p, mark("E")), Object.isSealed(p, mark("L")), Object.isFrozen(p, mark("F")), Reflect.isExtensible(p, mark("I")));
console.log("tag:", Object.prototype.toString.call(p, mark("t")), p.toString(mark("s")), p.toLocaleString(mark("l")), p.valueOf(mark("w")) === p);
console.log("trace:", trace);
