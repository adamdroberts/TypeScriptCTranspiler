const proto: any = Array.prototype;

const filled: any = { 0: "a", 1: "b", 2: "c", 3: "d", length: 4 };
const fillResult: any = Reflect.apply(proto.fill, filled, ["x", 1, 3]);
console.log("fill:", fillResult === filled, filled[0], filled[1], filled[2], filled[3]);

const copied: any = { 0: "a", 1: "b", 2: "c", 3: "d", length: 4 };
const copyResult: any = Reflect.apply(proto.copyWithin, copied, [1, 0, 2]);
console.log("copyWithin:", copyResult === copied, copied[0], copied[1], copied[2], copied[3]);

const reversed: any = { 0: "a", 1: "b", 2: "c", length: 3 };
const reverseResult: any = Reflect.apply(proto.reverse, reversed, []);
console.log("reverse:", reverseResult === reversed, reversed[0], reversed[1], reversed[2]);

const sparseReverse: any = { 0: "a", length: 3 };
Reflect.apply(proto.reverse, sparseReverse, []);
console.log(
    "reverse sparse:",
    String(sparseReverse[0]),
    sparseReverse[2],
    Object.hasOwn(sparseReverse, "0"),
    Object.hasOwn(sparseReverse, "2"),
);

const sparseCopy: any = { 1: "b", 3: "d", length: 4 };
Reflect.apply(proto.copyWithin, sparseCopy, [0, 2, 4]);
console.log(
    "copyWithin sparse:",
    String(sparseCopy[0]),
    sparseCopy[1],
    String(sparseCopy[2]),
    sparseCopy[3],
    Object.hasOwn(sparseCopy, "0"),
    Object.hasOwn(sparseCopy, "1"),
);
