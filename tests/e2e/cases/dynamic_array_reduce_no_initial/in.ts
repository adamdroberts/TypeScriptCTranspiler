const nums: any = [1, 2, 3, 4];
const words: any = ["a", "b", "c"];

const sum: any = nums.reduce((acc: any, x: any, i: number) => acc + x + i);
const joined: any = words.reduce((acc: any, x: any, i: number) => acc + i + ":" + x + ";");

const diff: any = nums.reduceRight((acc: any, x: any, i: number) => acc - x - i);
const rjoined: any = words.reduceRight((acc: any, x: any, i: number) => acc + i + ":" + x + ";");

console.log("sum:", sum);
console.log("joined:", joined);
console.log("diff:", diff);
console.log("rjoined:", rjoined);

