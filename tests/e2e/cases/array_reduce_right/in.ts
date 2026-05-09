const nums: number[] = [1, 2, 3, 4];
const words: string[] = ["a", "b", "c"];

const diff = nums.reduceRight((acc, n, i) => acc - n - i, 20);
const joined = words.reduceRight((acc, x, i) => acc + `${i}:${x};`, "");

console.log("diff:", diff);
console.log("joined:", joined);
