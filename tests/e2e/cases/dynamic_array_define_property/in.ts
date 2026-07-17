const items: any = ["red", "blue"];

function report(label: string, fn: () => any): void {
    try {
        console.log(label, fn());
    } catch (e: any) {
        console.log(label, e);
    }
}

console.log(
    "index:",
    Reflect.defineProperty(items, "1", {
        value: "cyan",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
    items.join("|"),
);

Object.defineProperty(items, "3", {
    value: "gold",
    writable: true,
    enumerable: true,
    configurable: true,
});

console.log("expanded:", items.length, items[2], items[3], Object.keys(items).join("|"));

console.log(
    "length:",
    Reflect.defineProperty(items, "length", {
        value: 2,
        writable: true,
        enumerable: false,
        configurable: false,
    }),
    items.length,
    items.join("|"),
);

console.log(
    "unsupported flags:",
    Reflect.defineProperty(items, "0", {
        value: "hidden",
        writable: false,
        enumerable: false,
        configurable: false,
    }),
    items[0],
);
const hiddenDesc: any = Object.getOwnPropertyDescriptor(items, "0");
console.log(
    "flags:",
    hiddenDesc.value,
    hiddenDesc.writable,
    hiddenDesc.enumerable,
    hiddenDesc.configurable,
    Reflect.set(items, "0", "changed"),
    Reflect.deleteProperty(items, "0"),
    Object.keys(items).join("|"),
);

const defaultIndex: any = [];
console.log("default index:", Reflect.defineProperty(defaultIndex, "2", { value: "x" }), defaultIndex.length, "[" + Object.keys(defaultIndex).join("|") + "]");
const defaultDesc: any = Object.getOwnPropertyDescriptor(defaultIndex, "2");
console.log("default flags:", defaultDesc.value, defaultDesc.writable, defaultDesc.enumerable, defaultDesc.configurable);

const closedExisting: any = ["open"];
Object.preventExtensions(closedExisting);
console.log(
    "closed existing:",
    Reflect.defineProperty(closedExisting, "0", { value: "closed", writable: false, enumerable: false, configurable: false }),
    Object.isExtensible(closedExisting),
    closedExisting[0],
    Reflect.set(closedExisting, "0", "changed"),
    Reflect.deleteProperty(closedExisting, "0"),
    "[" + Object.keys(closedExisting).join("|") + "]",
);

const sealedExisting: any = ["writable"];
Object.seal(sealedExisting);
console.log(
    "sealed existing:",
    Reflect.defineProperty(sealedExisting, "0", { writable: false }),
    Reflect.set(sealedExisting, "0", "changed"),
    sealedExisting[0],
    Object.getOwnPropertyDescriptor(sealedExisting, "0")!.writable,
    Object.getOwnPropertyDescriptor(sealedExisting, "0")!.configurable,
);

const shrinkBlocked: any = ["a", "b", "c"];
Reflect.defineProperty(shrinkBlocked, "1", { configurable: false });
Reflect.defineProperty(shrinkBlocked, "2", { configurable: true });
console.log(
    "shrink blocked:",
    Reflect.defineProperty(shrinkBlocked, "length", { value: 0, writable: false }),
    shrinkBlocked.length,
    Object.keys(shrinkBlocked).join("|"),
    Object.hasOwn(shrinkBlocked, "2"),
    Object.getOwnPropertyDescriptor(shrinkBlocked, "length")!.writable,
);

const lengthTarget: any = [1, 2, 3];
report("length nan", (): any => Reflect.defineProperty(lengthTarget, "length", { value: NaN }));
report("length float", (): any => Reflect.defineProperty(lengthTarget, "length", { value: 1.5 }));
report("length overflow", (): any => Reflect.defineProperty(lengthTarget, "length", { value: 4294967296 }));
report("length object nan", (): any => Object.defineProperty(lengthTarget, "length", { value: NaN }) === lengthTarget);
lengthTarget.length = -0;
console.log("length negative zero:", lengthTarget.length);
console.log(
    "length string:",
    Reflect.defineProperty(lengthTarget, "length", { value: "2" }),
    lengthTarget.length,
);

const accessorSparse: any = [];
console.log(
    "accessor sparse:",
    Reflect.defineProperty(accessorSparse, "2", {
        get: function () {
            return "tail";
        },
        enumerable: true,
        configurable: true,
    }),
    accessorSparse.length,
    accessorSparse[0],
    accessorSparse[2],
    Object.keys(accessorSparse).join("|"),
    Object.hasOwn(accessorSparse, "0"),
    Object.hasOwn(accessorSparse, "2"),
);

const accessorClosedLength: any = [];
Object.defineProperty(accessorClosedLength, "length", { value: 0, writable: false });
console.log(
    "accessor closed length:",
    Reflect.defineProperty(accessorClosedLength, "0", {
        get: function () {
            return "blocked";
        },
        configurable: true,
    }),
    accessorClosedLength.length,
    Object.hasOwn(accessorClosedLength, "0"),
);

const objectAccessorSparse: any = [];
const objectAccessorResult: any = Object.defineProperty(objectAccessorSparse, "1", {
    get: function () {
        return "object-tail";
    },
    enumerable: true,
    configurable: true,
});
console.log(
    "object accessor sparse:",
    objectAccessorResult === objectAccessorSparse,
    objectAccessorSparse.length,
    objectAccessorSparse[0],
    objectAccessorSparse[1],
    Object.keys(objectAccessorSparse).join("|"),
    Object.hasOwn(objectAccessorSparse, "0"),
    Object.hasOwn(objectAccessorSparse, "1"),
);
