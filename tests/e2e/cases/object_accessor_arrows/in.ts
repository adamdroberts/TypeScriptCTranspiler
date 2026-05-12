let current = 2;

const readCurrent = (): number => current + 1;
const writeCurrent = (value: number): void => {
    current = value * 3;
};

const obj: any = {};

Reflect.defineProperty(obj, "score", {
    get: readCurrent,
    set: writeCurrent,
    enumerable: true,
    configurable: true,
});

console.log("initial:", obj.score);
console.log("set:", Reflect.set(obj, "score", 4));
console.log("after:", obj.score);
console.log("current:", current);
console.log("keys:", Object.keys(obj).join("|"));
