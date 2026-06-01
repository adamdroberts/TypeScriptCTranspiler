const proto: any = Array.prototype;
const like: any = { 0: "a", 1: null, 2: "c", length: 3 };
const inherited: any = Object.create({ 0: "p", 1: "q", length: 2 });

console.log("join:", Reflect.apply(proto.join, like, ["|"]));
console.log("search:", Reflect.apply(proto.includes, like, ["a"]), Reflect.apply(proto.includes, like, [undefined]), Reflect.apply(proto.indexOf, like, [null]), Reflect.apply(proto.lastIndexOf, like, ["a"]));
console.log("at:", Reflect.apply(proto.at, like, [-1]), Reflect.apply(proto.at, inherited, [0]));

const keys: any = Reflect.apply(proto.keys, like, []);
const values: any = Reflect.apply(proto.values, like, []);
const entries: any = Reflect.apply(proto.entries, like, []);
console.log("iters:", keys.join("|"), values.join("|"), entries[1].join(":"));
console.log("inherited:", Reflect.apply(proto.join, inherited, ["/"]), Reflect.apply(proto.includes, inherited, ["q"]));
