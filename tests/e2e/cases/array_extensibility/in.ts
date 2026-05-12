const extensible = ["a", "b"];

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
console.log("sealed push:", sealed.push(11), sealed.join("|"));
console.log("sealed fill:", sealed.fill(5).join("|"));
Object.defineProperties(sealed, {
    "0": { value: 6, writable: true, enumerable: true, configurable: false },
    "2": { value: 7, writable: true, enumerable: true, configurable: true },
});
console.log("sealed define props:", sealed.length, sealed.join("|"));

const frozen = [3, 4];
console.log("freeze identity:", Object.freeze(frozen) === frozen);
console.log("frozen:", Object.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));
const frozenDesc: any = Object.getOwnPropertyDescriptor(frozen, "0");
console.log("frozen desc:", frozenDesc.writable, frozenDesc.configurable);
console.log("frozen set:", Reflect.set(frozen, "0", 30), frozen[0]);
console.log("frozen delete:", Reflect.deleteProperty(frozen, "0"), frozen[0]);
console.log("frozen push:", frozen.push(5), frozen.join("|"));
console.log("frozen fill:", frozen.fill(9).join("|"));
console.log("frozen reverse:", frozen.reverse().join("|"));
