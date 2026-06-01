function readOne(): number {
    return 1;
}

function readTwo(): number {
    return 2;
}

function writeValue(value: any): boolean {
    return value === 3;
}

const obj: any = {};

console.log(
    "initial:",
    Reflect.defineProperty(obj, "x", {
        get: readOne,
        set: writeValue,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log(
    "same:",
    Reflect.defineProperty(obj, "x", {
        get: readOne,
        set: writeValue,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log("same empty:", Reflect.defineProperty(obj, "x", {}), obj.x);
console.log("same enumerable only:", Reflect.defineProperty(obj, "x", { enumerable: true }), obj.x);
console.log("same configurable only:", Reflect.defineProperty(obj, "x", { configurable: false }), obj.x);
console.log("bad writable:", Reflect.defineProperty(obj, "x", { writable: false }), obj.x);
console.log(
    "bad getter:",
    Reflect.defineProperty(obj, "x", {
        get: readTwo,
        set: writeValue,
        enumerable: true,
        configurable: false,
    }),
    obj.x,
);
console.log(
    "bad enum:",
    Reflect.defineProperty(obj, "x", {
        get: readOne,
        set: writeValue,
        enumerable: false,
        configurable: false,
    }),
    obj.x,
);

console.log(
    "accessor to data:",
    Reflect.defineProperty(obj, "x", {
        value: 7,
    }),
    obj.x,
);

console.log(
    "accessor to undefined data:",
    Reflect.defineProperty(obj, "x", {
        value: undefined,
    }),
    obj.x,
);
