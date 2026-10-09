function borrow(fn: (...values: any[]) => string): any { return fn; }
function invoke(fn: (...values: any[]) => string, values: any[]): string { return fn(...values); }
const original: any = (...values: any[]): string => values.join(",");
console.log(borrow(original) === original, invoke(original, [1, 2, 3]));
const owner: any = {};
Object.defineProperty(owner, "run", { get() {
    return function(first: any, ...values: any[]): string { return first + ":" + values.join(","); };
} });
const fromGetter: any = owner.run;
console.log(fromGetter("head", 4, 5), fromGetter.length, Object.prototype.hasOwnProperty.call(fromGetter, "prototype"));
function count(...values: any[]): number { return values.length; }
const asArray: (values: any[]) => number = count;
console.log(asArray([1, 2, 3]), Object.is(asArray as any, count as any));
