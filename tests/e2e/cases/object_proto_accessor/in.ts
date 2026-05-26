const base: any = { marker: "base" };
const other: any = { marker: "other" };
const obj: any = { own: 1 };

obj.__proto__ = base;
console.log("set:", Object.getPrototypeOf(obj) === base, obj.__proto__ === base, obj.marker);

obj.__proto__ = 7;
console.log("primitive:", Object.getPrototypeOf(obj) === base, obj.marker);

const child: any = Object.create(obj);
console.log("child:", child.__proto__ === obj, child.marker);

Object.defineProperty(obj, "__proto__", {
    value: "own",
    writable: true,
    enumerable: true,
    configurable: true,
});
console.log("own:", obj.__proto__, Object.getPrototypeOf(obj) === base);
obj.__proto__ = "next";
console.log("own write:", obj.__proto__, Object.getPrototypeOf(obj) === base);

const arr: any = [1, 2];
arr.__proto__ = other;
console.log("array:", Object.getPrototypeOf(arr) === other, arr.__proto__ === other);

const holder: any = { fn: function named(): void {} };
const fn: any = holder.fn;
fn.__proto__ = other;
console.log("function:", Object.getPrototypeOf(fn) === other, fn.__proto__ === other);
