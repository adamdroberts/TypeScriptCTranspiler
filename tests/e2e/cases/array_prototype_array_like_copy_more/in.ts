const proto: any = Array.prototype;
const like: any = { 0: "b", 1: "a", 2: "c", length: 3 };

const sorted: any = Reflect.apply(proto.toSorted, like, []);
const replaced: any = Reflect.apply(proto.with, like, [1, "x"]);
const spliced: any = Reflect.apply(proto.toSpliced, like, [1, 1, "x", "y"]);

console.log("toSorted:", sorted.join("|"), JSON.stringify(like));
console.log("with:", replaced.join("|"), JSON.stringify(like));
console.log("toSpliced:", spliced.join("|"), JSON.stringify(like));

const sparse: any = { 0: "a", 2: "c", length: 3 };
const sparseSorted: any = Reflect.apply(proto.toSorted, sparse, []);
const sparseWith: any = Reflect.apply(proto.with, sparse, [1, "x"]);
const sparseSpliced: any = Reflect.apply(proto.toSpliced, sparse, [1, 1, "x"]);

console.log("sparse toSorted:", sparseSorted.join("|"), sparseSorted.length, Object.hasOwn(sparseSorted, "1"));
console.log("sparse with:", sparseWith.join("|"), sparseWith.length, Object.hasOwn(sparseWith, "1"));
console.log("sparse toSpliced:", sparseSpliced.join("|"), sparseSpliced.length, Object.hasOwn(sparseSpliced, "1"));

try {
    Reflect.apply(proto.with, like, [5, "z"]);
} catch (e: any) {
    console.log("with error:", String(e).includes("out of range"));
}
