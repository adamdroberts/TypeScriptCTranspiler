let calls = 0;

function nextNumber(): number {
    calls = calls + 1;
    return 7;
}

console.log("number states:", Object.isExtensible(nextNumber()), Object.isSealed(7), Object.isFrozen(7), calls);
console.log("number identity:", Object.preventExtensions(7), Object.seal(8), Object.freeze(9));
console.log("string states:", Object.isExtensible("x"), Object.isSealed("x"), Object.isFrozen("x"));
console.log("string identity:", Object.preventExtensions("ab"), Object.seal("cd"), Object.freeze("ef"));
console.log("boolean:", Object.isExtensible(true), Object.isSealed(false), Object.isFrozen(true), Object.freeze(true));

const big = 10n;
console.log("bigint:", Object.isFrozen(big), Object.freeze(big) === big);

const sym = Symbol("k");
console.log("symbol:", Object.isSealed(sym), Object.freeze(sym) === sym);

console.log("keys:", Object.keys(7).length, Object.getOwnPropertyNames(false).length);
console.log("values:", Object.values(7).length, Object.entries(false).length);
console.log("has:", Object.hasOwn(7, "x"), Object.hasOwn(sym, "description"));
console.log("desc:", String(Object.getOwnPropertyDescriptor(7, "x")));
const descs: any = Object.getOwnPropertyDescriptors(sym);
console.log("descs:", Object.keys(descs).length);
