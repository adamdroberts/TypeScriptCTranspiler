const nums: number[] = [1, 2, 3, 4];
const words: string[] = ["a", "b", "c"];

const sum = nums.reduce((acc, n, i) => acc + n + i);
const joined = words.reduce((acc, x, i) => acc + `${i}:${x};`);

const diff = nums.reduceRight((acc, n, i) => acc - n - i);
const rjoined = words.reduceRight((acc, x, i) => acc + `${i}:${x};`);

console.log("sum:", sum);
console.log("joined:", joined);
console.log("diff:", diff);
console.log("rjoined:", rjoined);

