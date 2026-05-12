const obj: any = {};

Object.defineProperty(obj, "x", {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
});

const first: any = Object.getOwnPropertyDescriptor(obj, "x");
console.log("data:", obj.x, first.writable, first.enumerable, first.configurable, Object.keys(obj).join("|"));

console.log("to accessor:", Reflect.defineProperty(obj, "x", {
    get: function () {
        return 9;
    },
}));

const acc: any = Object.getOwnPropertyDescriptor(obj, "x");
console.log("accessor:", obj.x, typeof acc.get, Object.hasOwn(acc, "set"), acc.set, acc.enumerable, acc.configurable, Object.keys(obj).join("|"));
console.log("write accessor:", Reflect.set(obj, "x", 11), obj.x);

console.log("to data:", Reflect.defineProperty(obj, "x", { value: 7 }));
const data: any = Object.getOwnPropertyDescriptor(obj, "x");
console.log("data again:", obj.x, data.writable, data.enumerable, data.configurable, Object.keys(obj).join("|"));
console.log("write data:", Reflect.set(obj, "x", 8), obj.x);

const fixed: any = {};
Object.defineProperty(fixed, "y", { value: 2, configurable: false });
console.log("nonconfig:", Reflect.defineProperty(fixed, "y", {
    get: function () {
        return 3;
    },
}), fixed.y);
