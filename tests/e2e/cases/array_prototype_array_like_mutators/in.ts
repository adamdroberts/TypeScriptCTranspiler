const proto: any = Array.prototype;
const like: any = { 0: "a", 1: "b", length: 2 };

console.log("push:", Reflect.apply(proto.push, like, ["c", "d"]), like.length, like[2], like[3]);
console.log("pop:", Reflect.apply(proto.pop, like, []), like.length, "3" in like);
console.log("shift:", Reflect.apply(proto.shift, like, []), like.length, like[0], like[1], "2" in like);
console.log("unshift:", Reflect.apply(proto.unshift, like, ["z", "y"]), like.length, like[0], like[1], like[2], like[3]);

const empty: any = { length: 0 };
console.log("empty:", Reflect.apply(proto.pop, empty, []), Reflect.apply(proto.shift, empty, []), empty.length);

const closed: any = { length: 0 };
Object.preventExtensions(closed);
try {
    Reflect.apply(proto.push, closed, ["x"]);
    console.log("closed push:", "unexpected success");
} catch (err: any) {
    console.log("closed push:", err);
}

const sealed: any = { 0: "a", length: 1 };
Object.seal(sealed);
try {
    Reflect.apply(proto.pop, sealed, []);
    console.log("sealed pop:", "unexpected success");
} catch (err: any) {
    console.log("sealed pop:", err);
}

const sealedShift: any = { 0: "a", 1: "b", length: 2 };
Object.seal(sealedShift);
try {
    Reflect.apply(proto.shift, sealedShift, []);
    console.log("sealed shift:", "unexpected success");
} catch (err: any) {
    console.log("sealed shift:", err);
}

const closedUnshift: any = { length: 0 };
Object.preventExtensions(closedUnshift);
try {
    Reflect.apply(proto.unshift, closedUnshift, ["x"]);
    console.log("closed unshift:", "unexpected success");
} catch (err: any) {
    console.log("closed unshift:", err);
}
