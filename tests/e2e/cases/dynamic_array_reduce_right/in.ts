const nums: any = [1, 2, 3, 4];
const words: any = ["a", "b", "c"];
const empty: any = [];

const diff: any = nums.reduceRight((acc: any, x: any, i: number) => acc - x - i, 20);
const joined: any = words.reduceRight((acc: any, x: any, i: number) => acc + i + ":" + x + ";", "");

console.log("diff:", diff);
console.log("joined:", joined);
console.log("empty:", empty.reduceRight((acc: any, x: any) => acc + x, 10));
