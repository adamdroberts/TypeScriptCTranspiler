const text = "cat";

const keys = Object.keys(text);
const values = Object.values(text);
const entries = Object.entries(text);
const names = Object.getOwnPropertyNames(text);
const own = Reflect.ownKeys(text);

console.log("keys:", keys.join("|"));
console.log("values:", values.join("|"));
console.log("entry:", entries[1][0], entries[1][1]);
console.log("names:", names.join("|"));
console.log("own:", own.join("|"));
console.log("reflect:", Reflect.get(text, "length"), Reflect.get(text, "2"), Reflect.has(text, "1"), Reflect.has(text, "3"));
console.log("has:", Object.hasOwn(text, "0"), Object.hasOwn(text, "length"), Object.hasOwn(text, "missing"));

const firstDesc: any = Object.getOwnPropertyDescriptor(text, "0");
const lengthDesc: any = Reflect.getOwnPropertyDescriptor(text, "length");
const all: any = Object.getOwnPropertyDescriptors(text);

console.log(
    "first desc:",
    firstDesc.value,
    firstDesc.writable,
    firstDesc.enumerable,
    firstDesc.configurable,
);
console.log(
    "length desc:",
    lengthDesc.value,
    lengthDesc.writable,
    lengthDesc.enumerable,
    lengthDesc.configurable,
);
console.log("all desc:", all["2"].value, all["length"].value);
console.log("delete:", Reflect.deleteProperty(text, "1"), Reflect.deleteProperty(text, "missing"));
console.log("set:", Reflect.set(text, "1", "x"), text[1]);
