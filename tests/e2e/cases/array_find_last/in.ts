const nums: number[] = [1, 2, 3, 4, 5, 6];

console.log("last even:", nums.findLast((n) => n % 2 === 0));
console.log("last even index:", nums.findLastIndex((n) => n % 2 === 0));
console.log("last below 4:", nums.findLast((n, i) => n < 4 && i < 3));
console.log("missing:", nums.findLast((n) => n > 9));
console.log("missing index:", nums.findLastIndex((n) => n > 9));
