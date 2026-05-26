const ee = new EventEmitter();
let trace = "";
let seen = "none";

function mark(label: string): string {
    trace += label;
    return label;
}

ee.on("ready", () => {
    seen = "ready";
});

const keys = Object.keys(ee, mark("k"));
const values = Object.values(ee, mark("v"));
const entries = Object.entries(ee, mark("e"));
const names = Object.getOwnPropertyNames(ee, mark("n"));
const reflectKeys = Reflect.ownKeys(ee, mark("r"));
const desc: any = Object.getOwnPropertyDescriptor(ee, "on", mark("d"));
const descs: any = Object.getOwnPropertyDescriptors(ee, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(ee, "emit", mark("R"));

console.log("enum:", keys.length, values.length, entries.length);
console.log("own:", names.length, reflectKeys.length, String(desc), Object.keys(descs).length, String(reflectDesc));
console.log("has:", Object.hasOwn(ee, "on", mark("h")), Object.hasOwn(ee, "emit", mark("H")), ee.hasOwnProperty("on", mark("p")), ee.propertyIsEnumerable("emit", mark("i")));
console.log("call:", Object.prototype.hasOwnProperty.call(ee, "on", mark("c")), Object.prototype.propertyIsEnumerable.call(ee, "emit", mark("q")));
console.log("integrity:", Object.isExtensible(ee, mark("E")), Object.isSealed(ee, mark("L")), Object.isFrozen(ee, mark("F")), Reflect.isExtensible(ee, mark("I")));
console.log("tag:", Object.prototype.toString.call(ee, mark("t")), ee.toString(mark("s")));
console.log("emit:", ee.emit("ready"), seen);
console.log("trace:", trace);
