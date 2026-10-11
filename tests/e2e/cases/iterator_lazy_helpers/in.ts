console.log("map/filter:", Iterator.from([1, 2, 3, 4]).map((value, index) => value + index).filter((value) => value > 2).toArray().join(","));
console.log("drop/take:", Iterator.from([1, 2, 3, 4]).drop(1).take(2).toArray().join(","));
console.log("flatMap:", Iterator.from([1, 2]).flatMap((value) => [value, value * 10]).toArray().join(","));
console.log("concat:", Iterator.concat([1, 2], new Set<number>([3, 4])).toArray().join(","));
try { Iterator.from([1]).take(-1); } catch (error) { console.log("limit:", error instanceof RangeError); }
