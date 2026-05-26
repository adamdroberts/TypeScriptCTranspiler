const root = "/tmp/tsc2c-fs-stats-object-methods";
const filePath = root + "/note.txt";
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "meta");

const stat = fs.statSync(filePath);
const keys = Object.keys(stat, mark("k"));
const values = Object.values(stat, mark("v"));
const entries = Object.entries(stat, mark("e"));
const names = Object.getOwnPropertyNames(stat, mark("n"));
const reflectKeys = Reflect.ownKeys(stat, mark("r"));
const desc: any = Object.getOwnPropertyDescriptor(stat, "size", mark("d"));
const missing: any = Object.getOwnPropertyDescriptor(stat, "atime", mark("m"));
const descs: any = Object.getOwnPropertyDescriptors(stat, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(stat, "size", mark("R"));
const reflectSize: any = Reflect.get(stat, "size", {}, mark("g"));
const reflectMissing: any = Reflect.get(stat, "atime", mark("x"));

console.log("keys:", keys.length, keys.join("|"));
console.log("values:", values.length, values[2]);
console.log("entries:", entries.length, entries[2][0], entries[2][1]);
console.log("names:", names.length, names.join("|"), reflectKeys.length, reflectKeys.join("|"));
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable, String(missing));
console.log("descs:", Object.keys(descs).length, descs.size.value, reflectDesc.value);
console.log("reflect:", reflectSize, String(reflectMissing), Reflect.has(stat, "size", mark("s")), Reflect.has(stat, "atime", mark("S")));
console.log("own:", Object.hasOwn(stat, "size", mark("h")), Object.hasOwn(stat, "atime", mark("H")), stat.hasOwnProperty("size", mark("p")), stat.propertyIsEnumerable("size", mark("i")));
console.log("call:", Object.prototype.hasOwnProperty.call(stat, "size", mark("c")), Object.prototype.propertyIsEnumerable.call(stat, "size", mark("q")));
console.log("tag:", Object.prototype.toString.call(stat, mark("t")), stat.toString());
console.log("trace:", trace);

fs.rmSync(root, { recursive: true, force: true });
