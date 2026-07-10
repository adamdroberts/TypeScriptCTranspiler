const base: any = ["a", "b", "c", "d"];
delete base[0];

const concatenated: any = base.concat(["e", "f"]);
const replaced: any = base.with(1, "x");
const filled: any = base.slice();
filled.fill("z", 0, 1);
const splicedCopy: any = base.toSpliced(1, 1, "x");

const mutating: any = ["a", "b", "c"];
delete mutating[0];
const removed: any = mutating.splice(1, 1, "x");

console.log("concat:", Object.keys(concatenated).join("|"), Object.hasOwn(concatenated, "0"), String(concatenated[0]));
console.log("with:", Object.keys(replaced).join("|"), Object.hasOwn(replaced, "0"), String(replaced[1]));
console.log("fill:", Object.keys(filled).join("|"), Object.hasOwn(filled, "0"), filled[0]);
console.log("toSpliced:", Object.keys(splicedCopy).join("|"), Object.hasOwn(splicedCopy, "0"), String(splicedCopy[0]));
console.log("splice:", Object.keys(mutating).join("|"), Object.hasOwn(mutating, "0"), mutating[1], Object.keys(removed).join("|"));
