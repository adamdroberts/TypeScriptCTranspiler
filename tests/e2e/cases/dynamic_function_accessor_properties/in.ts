let backing = "seed";
let seen = "";

function Tool(this: any): void {}

const fn: any = Tool as any;

function readLabel(this: any): string {
    seen = seen + (this === fn ? "get-fn|" : "get-other|");
    return backing;
}

function writeLabel(this: any, value: any): void {
    seen = seen + (this === fn ? "set-fn:" : "set-other:") + String(value) + "|";
    backing = String(value) + "!";
}

Object.defineProperty(fn, "label", {
    get: readLabel,
    set: writeLabel,
    enumerable: true,
    configurable: true,
});

console.log("read:", fn.label, seen);
console.log("set:", Reflect.set(fn, "label", "next"), fn.label, backing, seen);

const desc: any = Object.getOwnPropertyDescriptor(fn, "label");
console.log("desc:", typeof desc.get, typeof desc.set, desc.enumerable, desc.configurable, desc.value);
console.log("keys:", Object.keys(fn).join("|"), Object.getOwnPropertyNames(fn).join("|"));
console.log("apply:", Reflect.apply(desc.get, fn, []));

const receiver: any = {};
console.log("reflect get:", Reflect.get(fn, "label", receiver), seen);
console.log("reflect set:", Reflect.set(fn, "label", "via", receiver), backing, Object.hasOwn(receiver, "label"), seen);

function readLegacy(this: any): string {
    return this === fn ? "legacy-fn" : "legacy-other";
}

Object.prototype.__defineGetter__.call(fn, "legacy", readLegacy);
const legacyDesc: any = Object.getOwnPropertyDescriptor(fn, "legacy");
console.log("legacy:", fn.legacy, legacyDesc.enumerable, legacyDesc.configurable);

function readOnly(this: any): string {
    return "ro";
}

Object.defineProperty(fn, "readonly", {
    get: readOnly,
    configurable: false,
});

const readonlyDesc: any = Object.getOwnPropertyDescriptor(fn, "readonly");
console.log("readonly:", fn.readonly, Reflect.set(fn, "readonly", "x"), readonlyDesc.set);
console.log("metadata:", Reflect.defineProperty(fn, "length", { get: readOnly }), Reflect.defineProperty(fn, "name", { set: writeLabel }), Object.getOwnPropertyDescriptor(fn, "length").get);
