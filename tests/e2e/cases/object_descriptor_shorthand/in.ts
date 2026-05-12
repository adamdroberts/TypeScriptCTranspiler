const obj: any = {};

const value = 3;
const writable = false;
const enumerable = true;
const configurable = true;

Object.defineProperty(obj, "x", { value, writable, enumerable, configurable });
const xDesc: any = Object.getOwnPropertyDescriptor(obj, "x");
console.log("data:", obj.x, xDesc.writable, xDesc.enumerable, xDesc.configurable, Object.keys(obj).join("|"));
console.log("write data:", Reflect.set(obj, "x", 4), obj.x);

let backing = 10;
const get = function (): number {
    return backing;
};
const set = function (next: number): void {
    backing = next;
};

Object.defineProperty(obj, "y", { get, set, enumerable, configurable });
const yDesc: any = Object.getOwnPropertyDescriptor(obj, "y");
console.log("accessor:", obj.y, typeof yDesc.get, typeof yDesc.set, yDesc.enumerable, yDesc.configurable);
console.log("write accessor:", Reflect.set(obj, "y", 12), obj.y);

const hidden = false;
Object.defineProperty(obj, "z", {
    value: 5,
    enumerable: hidden,
    configurable,
});
const zDesc: any = Reflect.getOwnPropertyDescriptor(obj, "z");
console.log("expr flag:", Object.keys(obj).join("|"), zDesc.enumerable, zDesc.configurable);
