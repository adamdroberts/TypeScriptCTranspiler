const hash = crypto.createHash("sha256").update("abc");
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

const keys = Object.keys(hash, mark("k"));
const values = Object.values(hash, mark("v"));
const entries = Object.entries(hash, mark("e"));
const names = Object.getOwnPropertyNames(hash, mark("n"));
const reflectKeys = Reflect.ownKeys(hash, mark("r"));
const desc: any = Object.getOwnPropertyDescriptor(hash, "update", mark("d"));
const descs: any = Object.getOwnPropertyDescriptors(hash, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(hash, "digest", mark("R"));

console.log("enum:", keys.length, values.length, entries.length);
console.log("own:", names.length, reflectKeys.length, String(desc), Object.keys(descs).length, String(reflectDesc));
console.log("has:", Object.hasOwn(hash, "update", mark("h")), Object.hasOwn(hash, "digest", mark("H")));
console.log("call:", Object.prototype.hasOwnProperty.call(hash, "update", mark("c")), Object.prototype.propertyIsEnumerable.call(hash, "digest", mark("q")));
console.log("tag:", Object.prototype.toString.call(hash, mark("t")));
console.log("digest:", hash.digest("hex").slice(0, 8));
console.log("trace:", trace);
