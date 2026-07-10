const proto: any = Array.prototype;

const like: any = { 0: "b", 2: "a", length: 3 };
const result: any = Reflect.apply(proto.sort, like, []);
console.log(
    "sort:",
    result === like,
    like[0],
    like[1],
    String(like[2]),
    Object.hasOwn(like, "0"),
    Object.hasOwn(like, "1"),
    Object.hasOwn(like, "2"),
    like.length,
);

const inherited: any = Object.create({ 0: "d", 1: "c", length: 2 });
Reflect.apply(proto.sort, inherited, []);
console.log(
    "sort inherited:",
    inherited[0],
    inherited[1],
    Object.hasOwn(inherited, "0"),
    Object.hasOwn(inherited, "1"),
    inherited.length,
);

const frozen: any = { 0: "b", 1: "a", length: 2 };
Object.freeze(frozen);
try {
    Reflect.apply(proto.sort, frozen, []);
    console.log("frozen:", "unexpected success");
} catch (err: any) {
    console.log("frozen:", err);
}
