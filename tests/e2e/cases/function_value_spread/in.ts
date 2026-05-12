function callNumber(fn: (a: number, b: number) => number, args: any): number {
    return fn(...(args as [number, number]));
}

function callString(fn: (a: string, b: string) => string, args: any): string {
    return fn(...(args as [string, string]));
}

const offset = 4;
const add = (a: number, b: number): number => a + b + offset;
const pair = (a: string, b: string): string => a + b;

const nums: any = [2, 3];
const text: any = "ok";

console.log("number:", callNumber(add, nums));
console.log("string:", callString(pair, text));

nums[1] = 8;
console.log("number updated:", callNumber(add, nums));
