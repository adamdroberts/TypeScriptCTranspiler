const proto: any = Array.prototype;
const like: any = { 0: "a", 1: "b", length: 2 };

console.log("push:", Reflect.apply(proto.push, like, ["c", "d"]), like.length, like[2], like[3]);
console.log("pop:", Reflect.apply(proto.pop, like, []), like.length, "3" in like);
console.log("shift:", Reflect.apply(proto.shift, like, []), like.length, like[0], like[1], "2" in like);
console.log("unshift:", Reflect.apply(proto.unshift, like, ["z", "y"]), like.length, like[0], like[1], like[2], like[3]);

const empty: any = { length: 0 };
console.log("empty:", Reflect.apply(proto.pop, empty, []), Reflect.apply(proto.shift, empty, []), empty.length);
