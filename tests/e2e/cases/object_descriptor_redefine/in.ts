const obj: any = {};

console.log(
    "initial:",
    Reflect.defineProperty(obj, "x", {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log(
    "update:",
    Reflect.defineProperty(obj, "x", {
        value: 2,
        writable: true,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log("partial:", Reflect.defineProperty(obj, "x", { value: 8 }), obj.x);
const partialDesc: any = Object.getOwnPropertyDescriptor(obj, "x");
console.log("partial desc:", partialDesc.writable, partialDesc.enumerable, partialDesc.configurable);
console.log(
    "lock:",
    Reflect.defineProperty(obj, "x", {
        value: 3,
        writable: false,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log("set after lock:", Reflect.set(obj, "x", 4), obj.x);
console.log(
    "same locked:",
    Reflect.defineProperty(obj, "x", {
        value: 3,
        writable: false,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log(
    "bad enum:",
    Reflect.defineProperty(obj, "x", {
        value: 3,
        writable: false,
        enumerable: false,
        configurable: false,
    }),
    obj.x,
);
console.log(
    "bad writable:",
    Reflect.defineProperty(obj, "x", {
        value: 5,
        writable: true,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
