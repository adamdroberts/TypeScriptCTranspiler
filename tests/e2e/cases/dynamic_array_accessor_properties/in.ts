let backing = "seed";
let seen = "";
const proto: any = Array.prototype;

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

Object.defineProperty(arr, "1", {
    get: function(this: any): string {
        seen += "index-get:" + String(this.marker) + "|";
        return "idx-" + String(this.marker);
    },
    set: function(this: any, value: any): void {
        seen += "index-set:" + String(value) + "|";
    },
    enumerable: true,
    configurable: true,
});

const indexDesc: any = Object.getOwnPropertyDescriptor(arr, "1");
console.log("index accessor:", arr[1], indexDesc.value, typeof indexDesc.get, typeof indexDesc.set, indexDesc.enumerable, indexDesc.configurable);
console.log("index map:", Reflect.apply(proto.map, arr, [
    (value: any, index: any) => String(index) + ":" + String(value),
]).join("|"));
console.log("index reads:", Reflect.apply(proto.join, arr, ["/"]), Reflect.apply(proto.includes, arr, ["idx-next!"]), Reflect.apply(proto.indexOf, arr, ["idx-next!"]), Reflect.apply(proto.lastIndexOf, arr, ["idx-next!"]), Reflect.apply(proto.at, arr, [1]));
console.log("index set:", Reflect.set(arr, "1", "set-index"), arr[1], seen);
console.log("index delete:", Reflect.deleteProperty(arr, "1"), arr[1], Reflect.apply(proto.join, arr, ["/"]));
console.log("index keys:", Object.keys(arr).join("|"), Object.values(arr).join("|"));
console.log("index absent:", Object.hasOwn(arr, "1"), Reflect.has(arr, "1"), Object.getOwnPropertyDescriptor(arr, "1") === undefined);
arr[1] = "restored";
console.log("index restore:", arr[1], Object.hasOwn(arr, "1"), Object.keys(arr).join("|"));
console.log("metadata:", Reflect.defineProperty(arr, "length", { get: readOnly }), Reflect.defineProperty(arr, "0", { get: readOnly }), Object.getOwnPropertyDescriptor(arr, "length").get);
