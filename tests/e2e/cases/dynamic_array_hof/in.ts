const values: any = [1, 2, 3, 4];

const doubled: any = values.map((x: any, i: number) => x * 2 + i);
const evens: any = values.filter((x: any) => x % 2 === 0);
const labels: any = values.map((x: any) => "n=" + x);
const receiver: any = values.map((x: any, i: number, arr: any) => x + i + arr.length);
const blockMapped: any = values.map((x: any) => {
    return x * x;
});
const blockFound: any = values.find((x: any) => {
    return x > 2;
});

console.log("doubled:", doubled.join("|"));
console.log("evens:", evens.join("|"));
console.log("labels:", labels.join(","));
console.log("receiver:", receiver.join("|"));
console.log("block mapped:", blockMapped.join("|"));
console.log("block found:", blockFound);
console.log("original:", values.join("|"));
