let current = 3;

function readCurrent(): number {
    return current;
}

function writeCurrent(value: number): void {
    current = value * 2;
}

const obj: any = {};

Object.defineProperty(obj, "score", {
    get: readCurrent,
    set: writeCurrent,
    enumerable: true,
    configurable: true,
});

console.log("initial:", obj.score);
console.log("set:", Reflect.set(obj, "score", 5));
console.log("after:", Reflect.get(obj, "score"));
console.log("current:", current);
console.log("keys:", Object.keys(obj).join("|"));
console.log("values:", Object.values(obj).join("|"));
console.log("json:", JSON.stringify(obj));

const desc: any = Object.getOwnPropertyDescriptor(obj, "score");
console.log("desc:", desc.enumerable, desc.configurable, desc.value);

const child: any = Object.create(obj);
console.log("child:", child.score);
console.log("child set:", Reflect.set(child, "score", 7));
console.log("child after:", child.score, current);
