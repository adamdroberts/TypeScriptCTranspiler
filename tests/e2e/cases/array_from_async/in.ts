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

Array.fromAsync([Promise.resolve(3), Promise.resolve(4)]).then((values) => {
    console.log("promise array:", values.join("|"));
});

const promiseSet = new Set([Promise.resolve("left"), Promise.resolve("right")]);
Array.fromAsync(promiseSet).then((values) => {
    console.log("promise set:", values.join("|"));
});

Array.fromAsync([Promise.resolve("ok"), Promise.reject<string>("bad")]).catch((reason) => {
    console.log("promise reject:", reason);
});

Array.fromAsync([new Promise<number>(() => {})]).then((_values) => {
    console.log("pending should not run");
});

Array.fromAsync([7, 8], undefined).then((values) => {
    console.log("undefined mapper array:", values.join("|"));
});

Array.fromAsync("uv", undefined, (console.log("undefined mapper thisArg evaluated"), { unused: true })).then((values) => {
    console.log("undefined mapper string:", values.join("|"));
});

let ignoredOrder = "";
Array.fromAsync("z", undefined, (ignoredOrder += "T", { unused: true }), (ignoredOrder += "E", 0)).then((values) => {
    console.log("undefined mapper ignored:", values.join("|"), ignoredOrder);
});

const dynamicArraySource: any = [9, "ten", true];
Array.fromAsync(dynamicArraySource).then((values) => {
    console.log("dynamic array:", values.join("|"));
});

const dynamicStringSource: any = "xy";
Array.fromAsync(dynamicStringSource).then((values) => {
    console.log("dynamic string:", values.join("|"));
});

Array.fromAsync([1, 2], (value) => Promise.resolve(value * 10)).then((values) => {
    console.log("async mapper array:", values.join("|"));
});

Array.fromAsync("pq", (value, index) => Promise.resolve(value + ":" + index)).then((values) => {
    console.log("async mapper string:", values.join("|"));
});

Array.fromAsync(new Set([3, 4]), (value) => Promise.resolve(value + 1)).then((values) => {
    console.log("async mapper set:", values.join("|"));
});

Array.fromAsync(sourceMap, (entry) => Promise.resolve(entry[0] + "=" + entry[1])).then((values) => {
    console.log("async mapper map:", values.join("|"));
});

Array.fromAsync(dynamicArraySource, (value: any) => Promise.resolve("dyn:" + value)).then((values) => {
    console.log("async mapper dynamic:", values.join("|"));
});

Array.fromAsync([1, 2], function (this: any, value: number): Promise<number> {
    return Promise.resolve(value + (this.offset as number));
}, { offset: 30 }).then((values) => {
    console.log("async mapper thisArg:", values.join("|"));
});

let mappedIgnoredOrder = "";
Array.fromAsync([2], function (this: any, value: number): number {
    return value + (this.offset as number);
}, (mappedIgnoredOrder += "T", { offset: 40 }), (mappedIgnoredOrder += "E", 0)).then((values) => {
    console.log("mapper ignored:", values.join("|"), mappedIgnoredOrder);
});

Array.fromAsync([1, 2], (value) => value === 2 ? Promise.reject<number>("mapper bad") : Promise.resolve(value)).catch((reason) => {
    console.log("async mapper reject:", reason);
});

function throwingMapper(_value: number): Promise<number> {
    throw "mapper throw";
}

Array.fromAsync([1], throwingMapper).catch((reason) => {
    console.log("async mapper throw:", reason);
});

Array.fromAsync([1], (_value) => new Promise<number>(() => {})).then((_values) => {
    console.log("async mapper pending should not run");
});

const sparseAsync: any[] = ["a", "b", "c"];
delete sparseAsync[1];
Array.fromAsync(sparseAsync, (value: any) => value === undefined ? "missing" : value).then((values) => {
    console.log("async sparse:", values.join("|"));
});
