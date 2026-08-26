const text: any = "cat";
const boxed: any = Object(text);

console.log("prop:", text.length, text[1], text["2"], Reflect.get(boxed, "length"), Reflect.get(boxed, "0"));
console.log("has:", Object.hasOwn(text, "1"), Object.hasOwn(text, "length"), Reflect.has(boxed, "2"), Reflect.has(boxed, "3"));
console.log("enum:", text.propertyIsEnumerable("1"), text.propertyIsEnumerable("length"));

const keys = Object.keys(text);
const values = Object.values(text);
const entries: any = Object.entries(text);
const names = Object.getOwnPropertyNames(text);
const own = Reflect.ownKeys(boxed);

console.log("keys:", keys.join("|"));
console.log("values:", values.join("|"));
console.log("entries:", entries[0].join("="), entries[2].join("="));
console.log("names:", names.join("|"));
console.log("own:", own.join("|"));

const firstDesc: any = Object.getOwnPropertyDescriptor(text, "0");
const lengthDesc: any = Reflect.getOwnPropertyDescriptor(boxed, "length");
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
console.log("delete:", Reflect.deleteProperty(boxed, "1"), Reflect.deleteProperty(boxed, "missing"));
console.log("set:", Reflect.set(boxed, "1", "x"), boxed[1]);
