function missingFixed(target: any): string[] {
    return ["open"];
}

function duplicateKeys(target: any): string[] {
    return ["a", "a"];
}

function extraOnClosed(target: any): string[] {
    return ["a", "ghost"];
}

function missingOnClosed(target: any): string[] {
    return [];
}

function exactClosed(target: any): string[] {
    return ["a"];
}

function onlyOpen(target: any): string[] {
    return ["open"];
}

const fixedTarget: any = { open: 1 };
Object.defineProperty(fixedTarget, "fixed", {
    value: 2,
    enumerable: true,
    configurable: false,
    writable: true,
});
const missingFixedProxy: any = new Proxy(fixedTarget, { ownKeys: missingFixed as any });
try {
    console.log("missing fixed:", Reflect.ownKeys(missingFixedProxy).join(","));
} catch (e: any) {
    console.log("missing fixed:", e);
}

const duplicateProxy: any = new Proxy({ a: 1 }, { ownKeys: duplicateKeys as any });
try {
    console.log("duplicate:", Reflect.ownKeys(duplicateProxy).join(","));
} catch (e: any) {
    console.log("duplicate:", e);
}

const extraTarget: any = { a: 1 };
Object.preventExtensions(extraTarget);
const extraProxy: any = new Proxy(extraTarget, { ownKeys: extraOnClosed as any });
try {
    console.log("extra closed:", Reflect.ownKeys(extraProxy).join(","));
} catch (e: any) {
    console.log("extra closed:", e);
}

const missingTarget: any = { a: 1 };
Object.preventExtensions(missingTarget);
const missingProxy: any = new Proxy(missingTarget, { ownKeys: missingOnClosed as any });
try {
    console.log("missing closed:", Reflect.ownKeys(missingProxy).join(","));
} catch (e: any) {
    console.log("missing closed:", e);
}

const exactTarget: any = { a: 1 };
Object.preventExtensions(exactTarget);
const exactProxy: any = new Proxy(exactTarget, { ownKeys: exactClosed as any });
console.log("exact closed:", Reflect.ownKeys(exactProxy).join(","));

const objectKeysTarget: any = { open: 1 };
Object.defineProperty(objectKeysTarget, "fixed", {
    value: 2,
    enumerable: false,
    configurable: false,
    writable: true,
});
const objectKeysProxy: any = new Proxy(objectKeysTarget, { ownKeys: onlyOpen as any });
try {
    console.log("object keys:", Object.keys(objectKeysProxy).join(","));
} catch (e: any) {
    console.log("object keys:", e);
}
