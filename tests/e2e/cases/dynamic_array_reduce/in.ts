const nums: any = [1, 2, 3, 4];
const words: any = ["a", "b", "c"];
const empty: any = [];

const sum: any = nums.reduce((acc: any, x: any, i: number) => acc + x + i, 0);
const joined: any = words.reduce((acc: any, x: any) => acc + "-" + x, "start");

console.log("sum:", sum);
console.log("joined:", joined);
console.log("empty:", empty.reduce((acc: any, x: any) => acc + x, 10));
