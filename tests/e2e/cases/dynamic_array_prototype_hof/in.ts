const nums: any = [1, 2, 3, 4];
const nested: any = [[1], [2, 3], 4];
const receiver: any = { delta: 10 };

const forEach = nums.forEach;
const map = nums.map;
const flatMap = nums.flatMap;
const filter = nums.filter;
const some = nums.some;
const every = nums.every;
const find = nums.find;
const findIndex = nums.findIndex;
const findLast = nums.findLast;
const findLastIndex = nums.findLastIndex;
const reduce = nums.reduce;
const reduceRight = nums.reduceRight;

let total: any = 0;
function add(value: any): any {
    total += value;
    return undefined;
}

function mapWithReceiver(this: any, value: any, index: any, array: any): any {
    return value + index + array.length + this.delta;
}

function even(value: any): any {
    return value % 2 === 0;
}

function overTwo(value: any): any {
    return value > 2;
}

function sum(acc: any, value: any, index: any, array: any): any {
    return acc + value + index + array.length;
}

function append(acc: any, value: any): any {
    return acc + value;
}

Reflect.apply(forEach, nums, [add]);
console.log("forEach:", total);
console.log("map:", Reflect.apply(map, nums, [mapWithReceiver, receiver]).join("|"));
console.log("flatMap:", Reflect.apply(flatMap, nested, [(value: any): any => value]).join("|"));
console.log("filter:", Reflect.apply(filter, nums, [even]).join("|"));
console.log("checks:", Reflect.apply(some, nums, [overTwo]), Reflect.apply(every, nums, [overTwo]));
console.log("find:", Reflect.apply(find, nums, [overTwo]), Reflect.apply(findIndex, nums, [overTwo]), Reflect.apply(findLast, nums, [even]), Reflect.apply(findLastIndex, nums, [even]));
console.log("reduce:", Reflect.apply(reduce, nums, [sum, 0]), Reflect.apply(reduceRight, nums, [append, ""]));
