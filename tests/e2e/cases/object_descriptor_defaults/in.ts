const obj: any = {};

console.log("reflect empty:", Reflect.defineProperty(obj, "empty", {}), obj.empty);
const emptyDesc: any = Object.getOwnPropertyDescriptor(obj, "empty");
console.log("empty desc:", emptyDesc.value, emptyDesc.writable, emptyDesc.enumerable, emptyDesc.configurable);

Object.defineProperty(obj, "writableMissing", {
    writable: true,
    enumerable: true,
    configurable: true,
});
console.log("writable before:", obj.writableMissing);
console.log("writable set:", Reflect.set(obj, "writableMissing", "set"), obj.writableMissing);

Object.defineProperties(obj, {
    fromBatch: {
        enumerable: true,
    },
    noAccessors: {
        get: undefined,
        set: undefined,
        enumerable: true,
        configurable: true,
    },
});
console.log("batch:", obj.fromBatch, obj.noAccessors);
console.log("set accessor:", Reflect.set(obj, "noAccessors", 3), obj.noAccessors);
const noAccessorsDesc: any = Object.getOwnPropertyDescriptor(obj, "noAccessors");
console.log(
    "no accessors desc:",
    Object.hasOwn(noAccessorsDesc, "get"),
    noAccessorsDesc.get,
    Object.hasOwn(noAccessorsDesc, "set"),
    noAccessorsDesc.set,
);

let readOnlyValue = 12;
function readOnly(): number {
    return readOnlyValue;
}
Object.defineProperty(obj, "readOnly", {
    get: readOnly,
    enumerable: true,
    configurable: true,
});
const readOnlyDesc: any = Object.getOwnPropertyDescriptor(obj, "readOnly");
console.log(
    "read only desc:",
    typeof readOnlyDesc.get,
    Object.hasOwn(readOnlyDesc, "set"),
    readOnlyDesc.set,
    Reflect.set(obj, "readOnly", 99),
    obj.readOnly,
);
const descriptorHooks: any = [readOnlyDesc.get, readOnlyDesc.set];
console.log("descriptor json:", JSON.stringify(noAccessorsDesc), JSON.stringify(readOnlyDesc), JSON.stringify(descriptorHooks));
console.log("keys:", Object.keys(obj).join("|"));
