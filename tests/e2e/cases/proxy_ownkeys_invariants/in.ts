const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function missingFixed(target: any): string[] {
    events.push("missing fixed trap");
    return ["open"];
}

function duplicateKeys(target: any): string[] {
    events.push("duplicate trap");
    return ["a", "a"];
}

function extraOnClosed(target: any): string[] {
    events.push("extra closed trap");
    return ["a", "ghost"];
}

function missingOnClosed(target: any): string[] {
    events.push("missing closed trap");
    return [];
}

function exactClosed(target: any): string[] {
    events.push("exact closed trap");
    return ["a"];
}

function onlyOpen(target: any): string[] {
    events.push("object keys trap");
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
    console.log("missing fixed:", Reflect.ownKeys(missingFixedProxy, mark("missing fixed")).join(","));
} catch (e: any) {
    console.log("missing fixed:", e);
}

const duplicateProxy: any = new Proxy({ a: 1 }, { ownKeys: duplicateKeys as any });
try {
    console.log("duplicate:", Reflect.ownKeys(duplicateProxy, mark("duplicate")).join(","));
} catch (e: any) {
    console.log("duplicate:", e);
}

const extraTarget: any = { a: 1 };
Object.preventExtensions(extraTarget);
const extraProxy: any = new Proxy(extraTarget, { ownKeys: extraOnClosed as any });
try {
    console.log("extra closed:", Reflect.ownKeys(extraProxy, mark("extra closed")).join(","));
} catch (e: any) {
    console.log("extra closed:", e);
}

const missingTarget: any = { a: 1 };
Object.preventExtensions(missingTarget);
const missingProxy: any = new Proxy(missingTarget, { ownKeys: missingOnClosed as any });
try {
    console.log("missing closed:", Reflect.ownKeys(missingProxy, mark("missing closed")).join(","));
} catch (e: any) {
    console.log("missing closed:", e);
}

const exactTarget: any = { a: 1 };
Object.preventExtensions(exactTarget);
const exactProxy: any = new Proxy(exactTarget, { ownKeys: exactClosed as any });
console.log("exact closed:", Reflect.ownKeys(exactProxy, mark("exact closed")).join(","));

const objectKeysTarget: any = { open: 1 };
Object.defineProperty(objectKeysTarget, "fixed", {
    value: 2,
    enumerable: false,
    configurable: false,
    writable: true,
});
const objectKeysProxy: any = new Proxy(objectKeysTarget, { ownKeys: onlyOpen as any });
try {
    console.log("object keys:", Object.keys(objectKeysProxy, mark("object keys")).join(","));
} catch (e: any) {
    console.log("object keys:", e);
}

console.log("events:", events.join("|"));
