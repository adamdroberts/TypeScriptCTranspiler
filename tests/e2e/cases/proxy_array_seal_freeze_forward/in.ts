const sealed: any = new Proxy(["a", "b"], {});

console.log("seal identity:", Object.seal(sealed) === sealed);
console.log("sealed states:", Object.isExtensible(sealed), Object.isSealed(sealed), Object.isFrozen(sealed));
console.log("sealed set:", Reflect.set(sealed, "0", "A"), sealed[0]);
console.log("sealed new:", Reflect.set(sealed, "2", "C"), sealed.length, Object.values(sealed).join("|"));
console.log("sealed delete:", Reflect.deleteProperty(sealed, "0"), sealed[0]);
console.log(
    "sealed define existing:",
    Reflect.defineProperty(sealed, "1", {
        value: "B",
        writable: true,
        enumerable: true,
        configurable: false,
    }),
    Object.values(sealed).join("|"),
);
console.log(
    "sealed define new:",
    Reflect.defineProperty(sealed, "2", {
        value: "C",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
);

const frozen: any = new Proxy(["x", "y"], {});

console.log("freeze identity:", Object.freeze(frozen) === frozen);
console.log("frozen states:", Object.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));
console.log("frozen set:", Reflect.set(frozen, "0", "X"), frozen[0]);
console.log("frozen delete:", Reflect.deleteProperty(frozen, "0"), frozen[0]);
console.log(
    "frozen define existing:",
    Reflect.defineProperty(frozen, "1", {
        value: "Y",
        writable: true,
        enumerable: true,
        configurable: false,
    }),
    Object.values(frozen).join("|"),
);
