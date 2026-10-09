import "./consumer.js";

function nativeSum(this: any, left: number, right: number): number { return this.base + left + right; }
const target: any = nativeSum;
console.log("native:", target.call({ base: 1 }, 2, 3), target.apply({ base: 4 }, [5, 6]), target.bind({ base: 7 }, 8)(9));
Object.defineProperty(target, "call", { value: function (this: any, value: number): string { return "override:" + String(this === target) + ":" + value; }, configurable: true });
console.log(target.call(11));
