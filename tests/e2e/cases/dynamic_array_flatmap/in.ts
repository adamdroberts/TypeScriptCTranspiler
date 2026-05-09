const nums: any = [1, 2, 3];

const pairs: any = nums.flatMap((x: any, i: number) => [x, i]);
const mixed: any = nums.flatMap((x: any) => x === 2 ? ["two", x] : x);

console.log("pairs:", pairs.join("|"));
console.log("mixed:", mixed.join("|"));
