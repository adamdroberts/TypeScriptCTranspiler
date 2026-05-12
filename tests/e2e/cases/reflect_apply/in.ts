function add(a: number, b: number): number {
    return a + b;
}

const offset = 5;
const bump = (n: number): number => n + offset;
const label = (text: string, count: number): string => text + ":" + count;
const pair = (a: string, b: string): string => a + b;

let ticks = 0;
function touchThisArg(): any {
    ticks++;
    return undefined;
}

function readThis(this: any, suffix: string): string {
    return this.prefix + suffix;
}

const readClosure = function(this: any, suffix: string): string {
    return this.prefix + suffix;
};

console.log("add:", Reflect.apply(add, undefined, [2, 3]));
console.log("bump:", Reflect.apply(bump, undefined, [4]));
console.log("label:", Reflect.apply(label, touchThisArg(), ["n", 7]));
const addArgs = [6, 8];
const labelArgs: any = ["v", 3];
console.log("add args:", Reflect.apply(add, undefined, addArgs));
console.log("label args:", Reflect.apply(label, undefined, labelArgs));
const ctx: any = { prefix: "ctx" };
console.log("this direct:", Reflect.apply(readThis, ctx, ["!"]));
console.log("this closure:", Reflect.apply(readClosure, ctx, ["?"]));
const addTail = [9];
const labelTail = [4];
const dynamicSuffix: any = ["*"];
console.log("add spread:", Reflect.apply(add, undefined, [5, ...addTail]));
console.log("label spread:", Reflect.apply(label, undefined, ["s", ...labelTail]));
console.log("pair string spread:", Reflect.apply(pair, undefined, [..."ok"]));
console.log("this spread:", Reflect.apply(readThis, ctx, [...dynamicSuffix]));
console.log("ticks:", ticks);
