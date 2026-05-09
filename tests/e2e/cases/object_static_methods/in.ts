const target: any = { keep: "old" };
Object.defineProperty(target, "locked", {
    value: "stay",
    writable: false,
    enumerable: true,
    configurable: true,
});

const source: any = { keep: "new", add: 3 };
Object.defineProperty(source, "hidden", {
    value: "skip",
    writable: true,
    enumerable: false,
    configurable: true,
});

const result: any = Object.assign(target, source);

console.log("same:", Reflect.get(result, "keep") === Reflect.get(target, "keep"));
console.log("json:", JSON.stringify(result));
console.log("names:", Object.getOwnPropertyNames(source).join("|"));
console.log("keys:", Object.keys(source).join("|"));
console.log("has keep:", Object.hasOwn(target, "keep"));
console.log("has hidden:", Object.hasOwn(target, "hidden"));
console.log("locked set:", Reflect.set(target, "locked", "changed"));
console.log("locked:", Reflect.get(target, "locked"));
