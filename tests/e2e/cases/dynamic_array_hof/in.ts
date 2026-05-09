const values: any = [1, 2, 3, 4];

const doubled: any = values.map((x: any, i: number) => x * 2 + i);
const evens: any = values.filter((x: any) => x % 2 === 0);
const labels: any = values.map((x: any) => "n=" + x);

console.log("doubled:", doubled.join("|"));
console.log("evens:", evens.join("|"));
console.log("labels:", labels.join(","));
console.log("original:", values.join("|"));
