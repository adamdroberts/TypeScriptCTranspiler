Array.fromAsync([1, 2, 3]).then((values) => {
    console.log("array:", values.join("|"));
});

Array.fromAsync("abc", (value, index) => value + index).then((values) => {
    console.log("string map:", values.join(","));
});

const sourceSet = new Set([2, 4]);
Array.fromAsync(sourceSet, (value) => value * 3).then((values) => {
    console.log("set map:", values.join("|"));
});

const sourceMap = new Map<string, number>([
    ["x", 7],
    ["y", 8],
]);
Array.fromAsync(sourceMap, (entry) => entry[0] + ":" + entry[1]).then((values) => {
    console.log("map map:", values.join("|"));
});

function label(value: number, index: number): string {
    return index + "=" + value;
}

Array.fromAsync([5, 6], label).then((values) => {
    console.log("named:", values.join(","));
});

Array.fromAsync([1, 2], function (this: any, value: number): number {
    return value + (this.offset as number);
}, { offset: 20 }).then((values) => {
    console.log("thisArg:", values.join("|"));
});
