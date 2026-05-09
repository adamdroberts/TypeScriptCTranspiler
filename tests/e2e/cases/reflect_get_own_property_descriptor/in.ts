const obj: any = {};

Object.defineProperty(obj, "x", {
    value: 7,
    writable: false,
    enumerable: true,
    configurable: false,
});

const desc: any = Reflect.getOwnPropertyDescriptor(obj, "x");
const missing: any = Reflect.getOwnPropertyDescriptor(obj, "missing");

console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable);
console.log("missing:", missing);
