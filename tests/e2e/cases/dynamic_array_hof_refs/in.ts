const nums: any = [1, 2, 3, 4];

function double(value: number): number {
    return value * 2;
}

function even(value: number): boolean {
    return value % 2 === 0;
}

function overTwo(value: number): boolean {
    return value > 2;
}

function withIndex(value: number, index: number): number {
    return value + index;
}

let total = 0;
function add(value: number): void {
    total += value;
}

function sumWithIndex(acc: number, value: number, index: number): number {
    return acc + value + index;
}

function sumWithReceiver(acc: number, value: number, index: number, array: any): number {
    return acc + value + index + array.length;
}

function appendRight(acc: string, value: number): string {
    return acc + value;
}

function withReceiver(value: number, index: number, array: any): number {
    return value + index + array.length;
}

function makeReceiverMapper(delta: number): (value: any, index: number, array: any) => any {
    return (value: any, index: number, array: any) => value + index + array.length + delta;
}

const mapped: any = nums.map(double);
const indexed: any = nums.map(withIndex);
const receiverMapped: any = nums.map(withReceiver);
const receiverMapper = makeReceiverMapper(1);
const closureMapped: any = nums.map(receiverMapper);
const filtered: any = nums.filter(even);

nums.forEach(add);

console.log("map:", mapped.join("|"));
console.log("index:", indexed.join("|"));
console.log("receiver:", receiverMapped.join("|"));
console.log("closure receiver:", closureMapped.join("|"));
console.log("filter:", filtered.join("|"));
console.log("checks:", nums.some(overTwo), nums.every(overTwo));
console.log("find:", nums.find(overTwo), nums.findIndex(overTwo), nums.findLast(even), nums.findLastIndex(even));
console.log("reduce:", nums.reduce(sumWithIndex, 0), nums.reduceRight(appendRight, ""));
console.log("reduce receiver:", nums.reduce(sumWithReceiver, 0));
console.log("total:", total);
