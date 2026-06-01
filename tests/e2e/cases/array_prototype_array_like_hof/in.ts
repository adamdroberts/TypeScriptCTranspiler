const proto: any = Array.prototype;
const like: any = { 0: "a", 2: "c", length: 3 };
const inherited: any = Object.create({ 0: "p", 1: "q", 2: "r", length: 3 });

let seen = "";
const mapped: any = Reflect.apply(proto.map, like, [
    (value: any, index: any, self: any) => String(index) + String(value) + (self === like ? "!" : "?"),
]);
Reflect.apply(proto.forEach, like, [
    (value: any, index: any) => {
        seen += String(index) + String(value);
    },
]);

console.log("forEach:", seen);
console.log("map:", mapped.join("|"), mapped.length);
console.log("flatMap:", Reflect.apply(proto.flatMap, inherited, [
    (value: any, index: any) => index === 1 ? [] : [value, String(index)],
]).join("|"));
console.log("filter:", Reflect.apply(proto.filter, inherited, [(value: any) => value !== "q"]).join("|"));
console.log(
    "some/every:",
    Reflect.apply(proto.some, inherited, [(value: any) => value === "q"]),
    Reflect.apply(proto.every, inherited, [(value: any) => typeof value === "string"]),
);
console.log("find:", String(Reflect.apply(proto.find, like, [(value: any, index: any) => index === 1])));
console.log("findIndex:", Reflect.apply(proto.findIndex, like, [(value: any) => value === "c"]));
console.log("findLast:", Reflect.apply(proto.findLast, inherited, [(value: any) => value < "r"]));
console.log("findLastIndex:", Reflect.apply(proto.findLastIndex, inherited, [(value: any) => value < "r"]));
console.log("reduce:", Reflect.apply(proto.reduce, inherited, [
    (acc: any, value: any, index: any) => acc + String(index) + value,
    "",
]));
console.log("reduceRight:", Reflect.apply(proto.reduceRight, inherited, [
    (acc: any, value: any, index: any) => acc + String(index) + value,
    "",
]));
