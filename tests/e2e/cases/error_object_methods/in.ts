const err = new Error("boom", { cause: "root" });
const agg = new AggregateError(["one"], "many");
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

const keys = Object.keys(err, mark("k"));
const values = Object.values(err, mark("v"));
const entries = Object.entries(err, mark("e"));
const names = Object.getOwnPropertyNames(err, mark("n"));
const reflectKeys = Reflect.ownKeys(err, mark("r"));
const desc: any = Object.getOwnPropertyDescriptor(err, "message", mark("d"));
const missing: any = Object.getOwnPropertyDescriptor(err, "stack", mark("m"));
const descs: any = Object.getOwnPropertyDescriptors(err, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(err, "cause", mark("R"));
const aggDesc: any = Object.getOwnPropertyDescriptor(agg, "errors");

console.log("enum:", keys.length, values.length, entries.length);
console.log("names:", names.join("|"), reflectKeys.join("|"));
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable, String(missing));
console.log("descs:", Object.keys(descs).join("|"), descs.name.value, descs.cause.value, descs.errors.value.length);
console.log("reflect:", reflectDesc.value, Reflect.get(err, "name", {}, mark("g")), Reflect.get(agg, "errors").length, aggDesc.value[0]);
console.log("own:", Object.hasOwn(err, "message", mark("h")), Object.hasOwn(err, "stack", mark("H")), err.hasOwnProperty("cause", mark("p")), err.propertyIsEnumerable("message", mark("i")));
console.log("call:", Object.prototype.hasOwnProperty.call(err, "errors", mark("c")), Object.prototype.propertyIsEnumerable.call(err, "errors", mark("q")), Reflect.has(err, "message", mark("s")), Reflect.has(err, "stack", mark("S")));
console.log("integrity:", Object.isExtensible(err, mark("E")), Object.isSealed(err, mark("L")), Object.isFrozen(err, mark("F")), Reflect.isExtensible(err, mark("I")));
console.log("tag:", Object.prototype.toString.call(err, mark("t")), err.toString());
console.log("trace:", trace);
