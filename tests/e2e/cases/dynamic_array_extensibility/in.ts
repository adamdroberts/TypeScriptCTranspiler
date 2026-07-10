const extensible: any = ["a", "b"];

console.log("before:", Object.isExtensible(extensible), Object.isSealed(extensible), Object.isFrozen(extensible));
console.log("prevent:", Reflect.preventExtensions(extensible));
console.log("after:", Object.isExtensible(extensible), Object.isSealed(extensible), Object.isFrozen(extensible));
const extensibleDesc: any = Object.getOwnPropertyDescriptor(extensible, "0");
console.log("prevent desc:", extensibleDesc.writable, extensibleDesc.configurable);
console.log("set existing:", Reflect.set(extensible, "1", "B"), extensible.join("|"));
console.log("set new:", Reflect.set(extensible, "2", "C"), extensible.length, extensible.join("|"));
console.log(
    "define new:",
    Reflect.defineProperty(extensible, "2", {
        value: "C",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
);

const sealed: any = [1, 2];
Object.seal(sealed);
console.log("sealed:", Object.isExtensible(sealed), Object.isSealed(sealed), Object.isFrozen(sealed));
const sealedDesc: any = Reflect.getOwnPropertyDescriptor(sealed, "0");
const sealedLengthDesc: any = Object.getOwnPropertyDescriptor(sealed, "length");
console.log("sealed desc:", sealedDesc.writable, sealedDesc.configurable, sealedLengthDesc.writable);
console.log("sealed set:", Reflect.set(sealed, "0", 10), sealed[0]);
console.log("sealed new:", Reflect.set(sealed, "2", 3), sealed.length);
console.log("sealed length:", Reflect.set(sealed, "length", 1), sealed.length);
console.log("sealed delete:", Reflect.deleteProperty(sealed, "0"), sealed[0]);

const frozen: any = [3, 4];
Object.freeze(frozen);
console.log("frozen:", Object.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));
const frozenDesc: any = Object.getOwnPropertyDescriptor(frozen, "0");
const frozenLengthDesc: any = Reflect.getOwnPropertyDescriptor(frozen, "length");
console.log("frozen desc:", frozenDesc.writable, frozenDesc.configurable, frozenLengthDesc.writable);
console.log("frozen set:", Reflect.set(frozen, "0", 30), frozen[0]);
console.log("frozen length:", Reflect.set(frozen, "length", 1), frozen.length);
console.log("frozen delete:", Reflect.deleteProperty(frozen, "0"), frozen[0]);
console.log(
    "frozen define same:",
    Reflect.defineProperty(frozen, "0", { value: 3, writable: false, enumerable: true, configurable: false }),
    Reflect.defineProperty(frozen, "0", { value: 30, writable: false, enumerable: true, configurable: false }),
    Reflect.defineProperty(frozen, "length", { value: 2, writable: false }),
    Reflect.defineProperty(frozen, "length", { value: 1, writable: false }),
);

const sealedMethods: any = ["m", "n"];
Object.seal(sealedMethods);
try {
    sealedMethods.push("x");
    console.log("sealed push:", "unexpected success");
} catch (err: any) {
    console.log("sealed push:", err);
}
try {
    sealedMethods.pop();
    console.log("sealed pop:", "unexpected success");
} catch (err: any) {
    console.log("sealed pop:", err);
}
console.log("sealed fill:", sealedMethods.fill("q").join("|"));

const frozenMethods: any = ["z", "a"];
Object.freeze(frozenMethods);
try {
    frozenMethods.push("x");
    console.log("frozen push:", "unexpected success");
} catch (err: any) {
    console.log("frozen push:", err);
}
try {
    frozenMethods.pop();
    console.log("frozen pop:", "unexpected success");
} catch (err: any) {
    console.log("frozen pop:", err);
}
console.log("frozen fill:", frozenMethods.fill("q").join("|"));
try {
    frozenMethods.sort();
    console.log("frozen sort:", "unexpected success");
} catch (err: any) {
    console.log("frozen sort:", err);
}
