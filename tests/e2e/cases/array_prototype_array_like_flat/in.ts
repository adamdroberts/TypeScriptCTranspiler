const proto: any = Array.prototype;
const like: any = { 0: ["a", "b"], 2: "c", length: 3 };
const inherited: any = Object.create({ 0: ["p"], 1: ["q"], length: 2 });

console.log("flat:", Reflect.apply(proto.flat, like, []).join("|"));
console.log("flat0:", Reflect.apply(proto.flat, like, [0]).join("|"));
console.log("inherited:", Reflect.apply(proto.flat, inherited, []).join("|"));

const dynamic: any = [["x"], ["y", ["z"]]];
const flat: any = dynamic.flat(2);
console.log("dynamic:", flat.join("|"));
