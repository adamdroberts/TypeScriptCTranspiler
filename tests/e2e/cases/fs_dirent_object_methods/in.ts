const root = "/tmp/tsc2c-fs-dirent-object-methods";
const filePath = root + "/file.txt";
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(filePath, "file");

const entry = fs.readdirSync(root, { withFileTypes: true })[0];
const entries = Object.entries(entry, mark("e"));
const desc: any = Object.getOwnPropertyDescriptor(entry, "name", mark("d"));
const missing: any = Object.getOwnPropertyDescriptor(entry, "missing", mark("m"));
const descs: any = Object.getOwnPropertyDescriptors(entry, mark("D"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(entry, "name", mark("R"));
const reflectName: any = Reflect.get(entry, "name", {}, mark("g"));
const reflectMissing: any = Reflect.get(entry, "missing", mark("x"));

console.log("enum:", Object.keys(entry, mark("k")).join("|"), Object.values(entry, mark("v")).join("|"));
console.log("entries:", entries.length, entries[0][0], entries[0][1]);
console.log("names:", Object.getOwnPropertyNames(entry, mark("n")).join("|"), Reflect.ownKeys(entry, mark("r")).join("|"));
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable, String(missing));
console.log("descs:", Object.keys(descs).join("|"), descs.name.value, reflectDesc.value);
console.log("reflect:", reflectName, String(reflectMissing), Reflect.has(entry, "name", mark("s")), Reflect.has(entry, "missing", mark("S")));
console.log("own:", Object.hasOwn(entry, "name", mark("h")), Object.hasOwn(entry, "missing", mark("H")), entry.hasOwnProperty("name", mark("p")), entry.propertyIsEnumerable("name", mark("i")));
console.log("call:", Object.prototype.hasOwnProperty.call(entry, "name", mark("c")), Object.prototype.propertyIsEnumerable.call(entry, "name", mark("q")));
console.log("integrity:", Object.isExtensible(entry, mark("E")), Object.isSealed(entry, mark("L")), Object.isFrozen(entry, mark("F")), Reflect.isExtensible(entry, mark("I")));
console.log("tag:", Object.prototype.toString.call(entry, mark("t")), entry.toString());
console.log("trace:", trace);

fs.rmSync(root, { recursive: true, force: true });
