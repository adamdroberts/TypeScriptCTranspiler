const obj: any = {};

Object.defineProperty(obj, "locked", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
Reflect.defineProperty(obj, "hidden", {
    value: "h",
    writable: true,
    enumerable: false,
    configurable: true,
});

console.log("keys:", Object.keys(obj).join("|"));
console.log("own:", Reflect.ownKeys(obj).join("|"));
console.log("set locked:", Reflect.set(obj, "locked", 2));
console.log("locked:", obj.locked);
console.log("set hidden:", Reflect.set(obj, "hidden", "H"));
console.log("hidden:", Reflect.get(obj, "hidden"));
console.log("has hidden:", Reflect.has(obj, "hidden"));
console.log("delete locked:", Reflect.deleteProperty(obj, "locked"));
console.log("delete hidden:", Reflect.deleteProperty(obj, "hidden"));
console.log("has hidden after:", Reflect.has(obj, "hidden"));

const desc: any = Object.getOwnPropertyDescriptor(obj, "locked");
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable);
console.log("json:", JSON.stringify(obj));
