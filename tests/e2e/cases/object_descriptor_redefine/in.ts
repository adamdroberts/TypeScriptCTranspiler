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

const plusZero: any = {};
Object.defineProperty(plusZero, "fixed", {
    value: 0,
    writable: false,
    enumerable: true,
    configurable: false,
});
console.log("plus zero same:", Reflect.defineProperty(plusZero, "fixed", { value: 0 }), Object.is(plusZero.fixed, 0));
console.log("plus zero negative:", Reflect.defineProperty(plusZero, "fixed", { value: -0 }), Object.is(plusZero.fixed, 0));

const negativeZero: any = {};
Object.defineProperty(negativeZero, "fixed", {
    value: -0,
    writable: false,
    enumerable: true,
    configurable: false,
});
console.log("negative zero same:", Reflect.defineProperty(negativeZero, "fixed", { value: -0 }), Object.is(negativeZero.fixed, -0));
console.log("negative zero plus:", Reflect.defineProperty(negativeZero, "fixed", { value: 0 }), Object.is(negativeZero.fixed, -0));

const nanValue: any = {};
Object.defineProperty(nanValue, "fixed", {
    value: NaN,
    writable: false,
    enumerable: true,
    configurable: false,
});
console.log("nan same:", Reflect.defineProperty(nanValue, "fixed", { value: NaN }), Object.is(nanValue.fixed, NaN));
