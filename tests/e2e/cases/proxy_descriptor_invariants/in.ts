function badDescriptor(target: any, prop: any): any {
    return "bad";
}

function hideDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, "__missing__");
}

function dataDescriptor(target: any, prop: any): any {
    return { value: 1, writable: true, enumerable: true, configurable: true };
}

function fixedNewDescriptor(target: any, prop: any): any {
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function configurableFalseDescriptor(target: any, prop: any): any {
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function wrongFixedDescriptor(target: any, prop: any): any {
    return { value: 2, writable: false, enumerable: true, configurable: false };
}

function writableFixedDescriptor(target: any, prop: any): any {
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function accessorAsDataDescriptor(target: any, prop: any): any {
    return { value: 1, enumerable: true, configurable: false };
}

function realDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function getterValue(): any {
    return 1;
}

function ownFixed(target: any): string[] {
    return ["fixed"];
}

const badProxy: any = new Proxy({}, { getOwnPropertyDescriptor: badDescriptor as any });
try {
    console.log("bad descriptor:", Object.getOwnPropertyDescriptor(badProxy, "x"));
} catch (e: any) {
    console.log("bad descriptor:", e);
}

const fixedTarget: any = {};
Object.defineProperty(fixedTarget, "fixed", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
const hideFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide fixed:", Object.getOwnPropertyDescriptor(hideFixedProxy, "fixed"));
} catch (e: any) {
    console.log("hide fixed:", e);
}

const closedTarget: any = { x: 1 };
Object.preventExtensions(closedTarget);
const hideClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide closed:", Object.getOwnPropertyDescriptor(hideClosedProxy, "x"));
} catch (e: any) {
    console.log("hide closed:", e);
}

const newClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: dataDescriptor as any });
try {
    console.log("new closed:", Object.getOwnPropertyDescriptor(newClosedProxy, "missing")?.value);
} catch (e: any) {
    console.log("new closed:", e);
}

const newFixedProxy: any = new Proxy({}, { getOwnPropertyDescriptor: fixedNewDescriptor as any });
try {
    console.log("new fixed:", Object.getOwnPropertyDescriptor(newFixedProxy, "x")?.value);
} catch (e: any) {
    console.log("new fixed:", e);
}

const configurableTarget: any = {};
Object.defineProperty(configurableTarget, "x", {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
});
const configurableProxy: any = new Proxy(configurableTarget, { getOwnPropertyDescriptor: configurableFalseDescriptor as any });
try {
    console.log("config false:", Object.getOwnPropertyDescriptor(configurableProxy, "x")?.configurable);
} catch (e: any) {
    console.log("config false:", e);
}

const wrongFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: wrongFixedDescriptor as any });
try {
    console.log("wrong fixed:", Object.getOwnPropertyDescriptor(wrongFixedProxy, "fixed")?.value);
} catch (e: any) {
    console.log("wrong fixed:", e);
}

const writableFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: writableFixedDescriptor as any });
try {
    console.log("writable fixed:", Object.getOwnPropertyDescriptor(writableFixedProxy, "fixed")?.writable);
} catch (e: any) {
    console.log("writable fixed:", e);
}

const accessorTarget: any = {};
Object.defineProperty(accessorTarget, "x", {
    get: getterValue as any,
    enumerable: true,
    configurable: false,
});
const accessorProxy: any = new Proxy(accessorTarget, { getOwnPropertyDescriptor: accessorAsDataDescriptor as any });
try {
    console.log("accessor as data:", Object.getOwnPropertyDescriptor(accessorProxy, "x")?.value);
} catch (e: any) {
    console.log("accessor as data:", e);
}

const realProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: realDescriptor as any });
const real = Object.getOwnPropertyDescriptor(realProxy, "fixed");
console.log("real descriptor:", real.value, real.writable, real.configurable);

const keysProxy: any = new Proxy(fixedTarget, {
    ownKeys: ownFixed as any,
    getOwnPropertyDescriptor: hideDescriptor as any,
});
try {
    console.log("keys descriptor:", Object.keys(keysProxy).join(","));
} catch (e: any) {
    console.log("keys descriptor:", e);
}
