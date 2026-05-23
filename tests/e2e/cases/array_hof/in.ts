const nums: number[] = [1, 2, 3, 4, 5];

nums.forEach((n) => console.log("each:", n));

const doubled = nums.map((n) => n * 2);
console.log("doubled:", doubled.join(","));

const blockSquares = nums.map((n) => {
    return n * n;
});
console.log("block squares:", blockSquares.join(","));

const evens = nums.filter((n) => n % 2 === 0);
console.log("evens:", evens.join(","));

const sum = nums.reduce((acc, n) => acc + n, 0);
console.log("sum:", sum);

const product = nums.reduce((acc, n) => acc * n, 1);
console.log("product:", product);

const blockSum = nums.reduce((acc, n) => {
    return acc + n * 2;
}, 0);
console.log("block sum:", blockSum);

const first = nums.find((n) => n > 3);
console.log("first > 3:", first);

console.log("first missing:", nums.find((n) => n > 9));

const idx = nums.findIndex((n) => n === 4);
console.log("index of 4:", idx);

console.log("has even:", nums.some((n) => n % 2 === 0));
console.log("all positive:", nums.every((n) => n > 0));

const withIdx = nums.map((n, i) => `${i}:${n}`);
console.log(withIdx.join(" "));

const withReceiver = nums.map((n, i, arr) => n + i + arr.length);
console.log("with receiver:", withReceiver.join(","));

const receiverSum = nums.reduce((acc, n, i, arr) => acc + n + i + arr.length, 0);
console.log("receiver sum:", receiverSum);

function scaleByReceiver(n: number, i: number, arr: number[]): number {
    return arr.length * n + i;
}

console.log("named receiver:", nums.map(scaleByReceiver).join(","));

function makeReceiverMapper(delta: number): (n: number, i: number, arr: number[]) => number {
    return (n, i, arr) => n + i + arr.length + delta;
}

const receiverMapper = makeReceiverMapper(2);
console.log("closure receiver:", nums.map(receiverMapper).join(","));

const reversed = nums.slice(0, nums.length).reverse();
console.log("reversed:", reversed.join(","));

const more: number[] = [6, 7, 8];
const combined = nums.concat(more);
console.log("combined:", combined.join(","));

console.log("indexOf 3:", nums.indexOf(3));
console.log("includes 99:", nums.includes(99));
