let stored = 0;

function readOne(): number {
    return 1;
}

function readTwo(): number {
    return 2;
}

function writeOne(value: any): boolean {
    stored = 10 + Number(value);
    return true;
}

function writeTwo(value: any): boolean {
    stored = 20 + Number(value);
    return true;
}

const obj: any = {};

console.log(
    "initial:",
    Reflect.defineProperty(obj, "x", {
        get: readOne,
        set: writeOne,
        enumerable: true,
        configurable: true,
    }),
    obj.x,
    Object.keys(obj).join(","),
);

console.log("set-only:", Reflect.defineProperty(obj, "x", { set: writeTwo }), obj.x, Object.keys(obj).join(","));
Reflect.set(obj, "x", 3);
console.log("setter:", stored);

console.log("get-only:", Reflect.defineProperty(obj, "x", { get: readTwo }), obj.x);
Reflect.set(obj, "x", 4);
console.log("setter preserved:", stored);

console.log("clear-get:", Reflect.defineProperty(obj, "x", { get: void 0 }), String(obj.x));
Reflect.set(obj, "x", 5);
console.log("setter after clear:", stored);
