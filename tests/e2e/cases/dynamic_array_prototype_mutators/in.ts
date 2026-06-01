const arr: any = [2, 3];

const push = arr.push;
const unshift = arr.unshift;
const pop = arr.pop;
const shift = arr.shift;
const concat = arr.concat;
const slice = arr.slice;
const fill = arr.fill;
const copyWithin = arr.copyWithin;
const splice = arr.splice;
const reverse = arr.reverse;
const toReversed = arr.toReversed;
const sort = arr.sort;
const toSorted = arr.toSorted;
const withFn = arr["with"];
const toSpliced = arr.toSpliced;

console.log("grow:", Reflect.apply(push, arr, [4, 5]), arr.join("|"));
console.log("front:", Reflect.apply(unshift, arr, [0, 1]), arr.join("|"));
console.log("ends:", Reflect.apply(pop, arr, []), Reflect.apply(shift, arr, []), arr.join("|"));
console.log("concat:", Reflect.apply(concat, arr, [[5, 6], "end"]).join("|"), arr.join("|"));
console.log("slice:", Reflect.apply(slice, arr, [1, 3]).join("|"));

const filled: any = ["a", "b", "c", "d"];
console.log("fill:", Reflect.apply(fill, filled, ["x", 1, 3]).join("|"));

const copied: any = ["a", "b", "c", "d"];
console.log("copyWithin:", Reflect.apply(copyWithin, copied, [1, 2]).join("|"));

const spliced: any = ["a", "b", "c", "d"];
const removed: any = Reflect.apply(splice, spliced, [1, 2, "x", "y"]);
console.log("splice:", removed.join("|"), spliced.join("|"));

const reversed: any = Reflect.apply(reverse, arr, []);
console.log("reverse:", reversed === arr, arr.join("|"));

const sortedTarget: any = [3, 1, 2];
console.log("sort:", Reflect.apply(sort, sortedTarget, []).join("|"), sortedTarget.join("|"));

const copySource: any = [3, 1, 2];
console.log("copies:", Reflect.apply(toReversed, copySource, []).join("|"), Reflect.apply(toSorted, copySource, []).join("|"), Reflect.apply(withFn, copySource, [1, 9]).join("|"), Reflect.apply(toSpliced, copySource, [1, 1, 8]).join("|"), copySource.join("|"));
