let backing = "seed";
let seen = "";

const arr: any = ["red", "blue"];
arr.marker = "base";

function readLabel(this: any): string {
    seen = seen + (this === arr ? "get-arr|" : "get-other|");
    return String(this.marker);
}

function writeLabel(this: any, value: any): void {
    seen = seen + (this === arr ? "set-arr:" : "set-other:") + String(value) + "|";
    this.marker = String(value) + "!";
    backing = String(value) + "!";
}

Object.defineProperty(arr, "label", {
    get: readLabel,
    set: writeLabel,
    enumerable: true,
    configurable: true,
});

console.log("read:", arr.label, seen);
console.log("set:", Reflect.set(arr, "label", "next"), arr.label, arr.marker, backing, seen);

const desc: any = Object.getOwnPropertyDescriptor(arr, "label");
console.log("desc:", typeof desc.get, typeof desc.set, desc.enumerable, desc.configurable, desc.value);
console.log("keys:", Object.keys(arr).join("|"), Object.getOwnPropertyNames(arr).join("|"));
console.log("apply:", Reflect.apply(desc.get, arr, []));

const receiver: any = {};
receiver.marker = "receiver";
console.log("reflect get:", Reflect.get(arr, "label", receiver), seen);
console.log("reflect set:", Reflect.set(arr, "label", "via", receiver), arr.marker, receiver.marker, Object.hasOwn(receiver, "label"), backing, seen);

function readLegacy(this: any): string {
    return this === arr ? "legacy-arr" : "legacy-other";
}

Object.prototype.__defineGetter__.call(arr, "legacy", readLegacy);
const legacyDesc: any = Object.getOwnPropertyDescriptor(arr, "legacy");
console.log("legacy:", arr.legacy, legacyDesc.enumerable, legacyDesc.configurable);

function readOnly(this: any): string {
    return "ro";
}

Object.defineProperty(arr, "readonly", {
    get: readOnly,
    configurable: false,
});

const readonlyDesc: any = Object.getOwnPropertyDescriptor(arr, "readonly");
console.log("readonly:", arr.readonly, Reflect.set(arr, "readonly", "x"), readonlyDesc.set);
console.log("metadata:", Reflect.defineProperty(arr, "length", { get: readOnly }), Reflect.defineProperty(arr, "0", { get: readOnly }), Object.getOwnPropertyDescriptor(arr, "length").get);
