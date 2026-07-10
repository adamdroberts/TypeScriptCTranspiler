const extensible = ["a", "b"];

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

console.log("before:", Object.isExtensible(extensible), Object.isSealed(extensible), Object.isFrozen(extensible));
console.log(
    "define existing:",
    Reflect.defineProperty(extensible, "1", {
        value: "B",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
    extensible.join("|"),
);
console.log("prevent identity:", Object.preventExtensions(extensible) === extensible);
console.log("after:", Object.isExtensible(extensible), Reflect.isExtensible(extensible));
console.log("set existing:", Reflect.set(extensible, "1", "BB"), extensible.join("|"));
console.log("set new:", Reflect.set(extensible, "2", "C"), extensible.length, extensible.join("|"));
console.log("prevent push:", extensible.push("C"), extensible.join("|"));
console.log(
    "define new:",
    Reflect.defineProperty(extensible, "2", {
        value: "C",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
);

const defined = [1, 2];
console.log(
    "object define:",
    Object.defineProperty(defined, "2", {
        value: 7,
        writable: true,
        enumerable: true,
        configurable: true,
    }) === defined,
    defined.length,
    defined[2],
);

const batch = [1, 2];
console.log(
    "define props:",
    Object.defineProperties(batch, {
        "0": { value: 11, writable: true, enumerable: true, configurable: true },
        "2": { value: 33, writable: true, enumerable: true, configurable: true },
    }) === batch,
    batch.length,
    batch.join("|"),
);
Object.defineProperties(batch, {
    length: { value: 2, writable: true },
});
console.log("define props length:", batch.length, batch.join("|"));

const batchStrings = ["x"];
Object.defineProperties(batchStrings, {
    "1": { value: "y", writable: true, enumerable: true, configurable: true },
});
console.log("define props strings:", batchStrings.length, batchStrings.join("|"));

const deleted = ["keep", "drop"];
console.log("delete typed:", delete deleted[1], deleted.length, deleted.join("|"));

const sealed = [1, 2];
console.log("seal identity:", Object.seal(sealed) === sealed);
console.log("sealed:", Object.isExtensible(sealed), Object.isSealed(sealed), Object.isFrozen(sealed));
const sealedDesc: any = Reflect.getOwnPropertyDescriptor(sealed, "0");
console.log("sealed desc:", sealedDesc.writable, sealedDesc.configurable);
console.log("sealed set:", Reflect.set(sealed, "0", 10), sealed[0]);
console.log("sealed new:", Reflect.set(sealed, "2", 3), sealed.length);
console.log("sealed delete:", Reflect.deleteProperty(sealed, "0"), sealed[0]);
report("sealed push", (): any => sealed.push(11));
report("sealed pop", (): any => sealed.pop());
report("sealed shift", (): any => sealed.shift());
report("sealed unshift", (): any => sealed.unshift(11));
report("sealed splice", (): any => sealed.splice(0, 1));
console.log("sealed fill:", sealed.fill(5).join("|"));
report("sealed define props failed", (): any => Object.defineProperties(sealed, {
    "0": { value: 6, writable: true, enumerable: true, configurable: false },
    "2": { value: 7, writable: true, enumerable: true, configurable: true },
}));
console.log("sealed define props:", sealed.length, sealed.join("|"));
report("sealed object define failed", (): any => Object.defineProperty(sealed, "2", {
    value: 8,
    writable: true,
    enumerable: true,
    configurable: true,
}));

const frozen = [3, 4];
console.log("freeze identity:", Object.freeze(frozen) === frozen);
console.log("frozen:", Object.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));
const frozenDesc: any = Object.getOwnPropertyDescriptor(frozen, "0");
console.log("frozen desc:", frozenDesc.writable, frozenDesc.configurable);
console.log("frozen set:", Reflect.set(frozen, "0", 30), frozen[0]);
console.log("frozen delete:", Reflect.deleteProperty(frozen, "0"), frozen[0]);
report("frozen push", (): any => frozen.push(5));
report("frozen pop", (): any => frozen.pop());
report("frozen shift", (): any => frozen.shift());
report("frozen unshift", (): any => frozen.unshift(5));
report("frozen splice", (): any => frozen.splice(0, 1));
report("frozen fill", (): any => frozen.fill(9).join("|"));
report("frozen copyWithin", (): any => frozen.copyWithin(0, 1).join("|"));
report("frozen reverse", (): any => frozen.reverse().join("|"));
report("frozen sort", (): any => frozen.sort().join("|"));

const sealedSparse: any = [3, 1, 2];
delete sealedSparse[1];
Object.seal(sealedSparse);
report("sealed sparse sort", (): any => sealedSparse.sort().join("|"));
console.log(
    "frozen define same:",
    Reflect.defineProperty(frozen, "0", { value: 3, writable: false, enumerable: true, configurable: false }),
    Reflect.defineProperty(frozen, "0", { value: 30, writable: false, enumerable: true, configurable: false }),
    Reflect.defineProperty(frozen, "length", { value: 2, writable: false }),
    Reflect.defineProperty(frozen, "length", { value: 1, writable: false }),
);
const frozenZero = [0];
Object.freeze(frozenZero);
console.log(
    "frozen define signed zero:",
    Reflect.defineProperty(frozenZero, "0", { value: 0, writable: false, enumerable: true, configurable: false }),
    Reflect.defineProperty(frozenZero, "0", { value: -0, writable: false, enumerable: true, configurable: false }),
);
const frozenEmpty: number[] = [];
Object.freeze(frozenEmpty);
console.log("frozen length negative zero:", Reflect.defineProperty(frozenEmpty, "length", { value: -0, writable: false }));
