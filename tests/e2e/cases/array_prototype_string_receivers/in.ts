const proto: any = Array.prototype;

const text: any = "abca";

console.log("join:", Reflect.apply(proto.join, text, ["|"]));
console.log("search:", Reflect.apply(proto.includes, text, ["bc"]), Reflect.apply(proto.includes, text, ["b"]), Reflect.apply(proto.indexOf, text, ["bc"]), Reflect.apply(proto.indexOf, text, ["b"]), Reflect.apply(proto.lastIndexOf, text, ["a"]));

const sliced: any = Reflect.apply(proto.slice, text, [1, 3]);
const reversed: any = Reflect.apply(proto.toReversed, text, []);
console.log("copy:", Array.isArray(sliced), sliced.join(""), Array.isArray(reversed), reversed.join(""));

const keys: any = Reflect.apply(proto.keys, text, []);
const values: any = Reflect.apply(proto.values, text, []);
const entries: any = Reflect.apply(proto.entries, text, []);
console.log("iters:", keys.join("|"), values.join("|"), entries[2].join(":"));

console.log("string-slice:", text.slice(1, 3));
