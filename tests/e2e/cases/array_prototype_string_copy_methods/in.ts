const proto: any = Array.prototype;
const text: any = "cba";

const flat: any = Reflect.apply(proto.flat, text, []);
const sorted: any = Reflect.apply(proto.toSorted, text, []);
const sortedWithUndefined: any = Reflect.apply(proto.toSorted, text, [undefined]);
const replaced: any = Reflect.apply(proto.with, text, [1, "X"]);
const replacedTail: any = Reflect.apply(proto.with, text, [-1, "Z"]);
const spliced: any = Reflect.apply(proto.toSpliced, text, [1, 1, "X", "Y"]);
const splicedDropTail: any = Reflect.apply(proto.toSpliced, text, [1]);

console.log("flat:", Array.isArray(flat), flat.join("|"));
console.log("sorted:", Array.isArray(sorted), sorted.join(""), sortedWithUndefined.join(""));
console.log("with:", replaced.join(""), replacedTail.join(""));
console.log("spliced:", spliced.join(""), splicedDropTail.join(""));
console.log("original:", text);
