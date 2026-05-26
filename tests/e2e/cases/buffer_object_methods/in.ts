const buf = Buffer.from("Hi");
let seen = "";

function mark(label: string): string {
  seen += label;
  return label;
}

console.log("locale:", buf.toLocaleString());
console.log("value text:", buf.valueOf().toString());
console.log("value same:", buf.valueOf() === buf);
console.log("concat:", "buf=" + buf);
console.log("ignored:", buf.toString("utf8", mark("s")), buf.toLocaleString(mark("l")), JSON.stringify(buf.toJSON(mark("j"))), buf.valueOf(mark("v")) === buf, seen);
console.log("own:", Object.keys(buf).join(","), Object.values(buf).join(","), Object.getOwnPropertyNames(buf).join(","));
console.log("has:", Object.hasOwn(buf, "0"), Object.hasOwn(buf, "length"), buf.hasOwnProperty("1"), buf.propertyIsEnumerable("1"));
console.log("call:", Object.prototype.hasOwnProperty.call(buf, "0", mark("h")), Object.prototype.propertyIsEnumerable.call(buf, "1", mark("e")), seen);
const desc: any = Object.getOwnPropertyDescriptor(buf, "0");
const descs: any = Object.getOwnPropertyDescriptors(buf);
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable, Object.keys(descs).join(","));
console.log("entries:", Object.entries(buf).map((entry) => entry[0] + ":" + entry[1]).join("|"));
console.log("reflect:", Reflect.ownKeys(buf).join(","), Reflect.getOwnPropertyDescriptor(buf, "1")?.value);
console.log("reflect get:", Reflect.has(buf, "0"), Reflect.has(buf, "length"), Reflect.get(buf, "0"), Reflect.get(buf, "length"));
console.log("in:", "0" in buf, "length" in buf, "2" in buf);
