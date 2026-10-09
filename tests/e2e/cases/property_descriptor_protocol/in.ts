const key = Symbol("accessor");
const target: any = {};
let stored = 4;
let trace = "";
Object.defineProperty(target, key, {
    get(this: any) { trace += "g"; return this === target ? stored : -1; },
    set(this: any, value: number) { trace += "s"; stored = value; },
    ["enumerable"]: true,
    ...{ configurable: true },
    ignored: (trace += "i"),
});
console.log("accessor:", target[key], Reflect.set(target, key, 9), target[key], trace);

const values = [2, 3];
const returned = Object.defineProperties(values, {
    "0": { value: 7, writable: true, enumerable: true, configurable: true },
    "1": { get() { return 11; }, enumerable: true, configurable: true },
    [key]: { value: 13, enumerable: true },
});
console.log("array:", returned === values, values[0], values[1], values.join("|"), Reflect.get(values, key));

const inherited: any = Object.create({ value: "inherited", enumerable: true });
console.log("inherited:", Object.defineProperty(target, "field", inherited) === target, target.field);
try { Object.defineProperty(target, "mixed", { value: 1, get() { return 2; } }); }
catch (error: any) { console.log("mixed:", error.name, Object.hasOwn(target, "mixed")); }
try { Object.defineProperties(target, { first: { value: 1 }, last: { get: 1 } }); }
catch (error: any) { console.log("prepare:", error.name, Object.hasOwn(target, "first")); }
const created: any = Object.create(null, undefined);
console.log("create:", Object.getPrototypeOf(created) === null, Object.keys(created).length);
console.log("empty:" + [].join("|"));
