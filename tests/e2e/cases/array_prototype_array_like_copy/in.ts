const proto: any = Array.prototype;
const like: any = { 0: "a", 1: null, 2: "c", length: 3 };
const inherited: any = Object.create({ 0: "p", 1: "q", 2: "r", length: 3 });

const sliced: any = Reflect.apply(proto.slice, like, [1]);
const inheritedSlice: any = Reflect.apply(proto.slice, inherited, [-2, 3]);
const reversed: any = Reflect.apply(proto.toReversed, like, []);
const inheritedReversed: any = Reflect.apply(proto.toReversed, inherited, []);

console.log("slice:", Array.isArray(sliced), sliced.join("|"));
console.log("slice2:", inheritedSlice.join("|"));
console.log("toReversed:", reversed.join("|"), like[0], like[2]);
console.log("toReversed2:", inheritedReversed.join("|"));
