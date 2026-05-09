const values: any = [1, 2, 3, 4, 5, 6];

console.log("last even:", values.findLast((x: any) => x % 2 === 0));
console.log("last even index:", values.findLastIndex((x: any) => x % 2 === 0));
console.log("last below 4:", values.findLast((x: any, i: number) => x < 4 && i < 3));
console.log("missing:", values.findLast((x: any) => x > 9));
console.log("missing index:", values.findLastIndex((x: any) => x > 9));
