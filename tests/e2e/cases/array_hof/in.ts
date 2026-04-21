const nums: number[] = [1, 2, 3, 4, 5];

nums.forEach((n) => console.log("each:", n));

const doubled = nums.map((n) => n * 2);
console.log("doubled:", doubled.join(","));

const evens = nums.filter((n) => n % 2 === 0);
console.log("evens:", evens.join(","));

const sum = nums.reduce((acc, n) => acc + n, 0);
console.log("sum:", sum);

const product = nums.reduce((acc, n) => acc * n, 1);
console.log("product:", product);

const first = nums.find((n) => n > 3);
console.log("first > 3:", first);

const idx = nums.findIndex((n) => n === 4);
console.log("index of 4:", idx);

console.log("has even:", nums.some((n) => n % 2 === 0));
console.log("all positive:", nums.every((n) => n > 0));

const withIdx = nums.map((n, i) => `${i}:${n}`);
console.log(withIdx.join(" "));

const reversed = nums.slice(0, nums.length).reverse();
console.log("reversed:", reversed.join(","));

const more: number[] = [6, 7, 8];
const combined = nums.concat(more);
console.log("combined:", combined.join(","));

console.log("indexOf 3:", nums.indexOf(3));
console.log("includes 99:", nums.includes(99));
