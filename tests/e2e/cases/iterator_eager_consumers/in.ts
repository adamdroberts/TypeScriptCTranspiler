const values = new Set<number>([1, 2, 3]);
console.log("some:", values.values().some((value) => value === 2));
console.log("every:", values.values().every((value) => value > 0));
console.log("find:", values.values().find((value) => value > 1));
const array: number[] = values.values().toArray();
console.log("array:", array.join(","));
console.log("empty:", new Set<number>().values().some(() => true), new Set<number>().values().every(() => false), new Set<number>().values().find(() => true) === undefined);
console.log("reduce:", values.values().reduce((total, value) => total + value, 0));
