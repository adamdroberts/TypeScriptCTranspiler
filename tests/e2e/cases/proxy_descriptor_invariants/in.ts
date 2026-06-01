const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function badDescriptor(target: any, prop: any): any {
    events.push("bad trap:" + String(prop));
    return "bad";
}

function hideDescriptor(target: any, prop: any): any {
    events.push("hide trap:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, "__missing__");
}

function dataDescriptor(target: any, prop: any): any {
    events.push("data trap:" + String(prop));
    return { value: 1, writable: true, enumerable: true, configurable: true };
}

function mixedDescriptor(target: any, prop: any): any {
    events.push("mixed trap:" + String(prop));
    return { value: 1, get: getterValue as any, enumerable: true, configurable: true };
}

function badGetterDescriptor(target: any, prop: any): any {
    events.push("bad getter trap:" + String(prop));
    return { get: 1, enumerable: true, configurable: true };
}

function badSetterDescriptor(target: any, prop: any): any {
    events.push("bad setter trap:" + String(prop));
    return { set: 1, enumerable: true, configurable: true };
}

function fixedNewDescriptor(target: any, prop: any): any {
    events.push("fixed new trap:" + String(prop));
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function configurableFalseDescriptor(target: any, prop: any): any {
    events.push("config false trap:" + String(prop));
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function wrongFixedDescriptor(target: any, prop: any): any {
    events.push("wrong fixed trap:" + String(prop));
    return { value: 2, writable: false, enumerable: true, configurable: false };
}

function writableFixedDescriptor(target: any, prop: any): any {
    events.push("writable fixed trap:" + String(prop));
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function wrongEnumerableDescriptor(target: any, prop: any): any {
    events.push("wrong enumerable trap:" + String(prop));
    return { value: 1, writable: false, enumerable: false, configurable: false };
}

function accessorAsDataDescriptor(target: any, prop: any): any {
    events.push("accessor as data trap:" + String(prop));
    return { value: 1, enumerable: true, configurable: false };
}

function realDescriptor(target: any, prop: any): any {
    events.push("real trap:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function getterValue(): any {
    return 1;
}

function getterOther(): any {
    return 2;
}

function setterValue(value: any): void {
}

function setterOther(value: any): void {
}

function wrongAccessorGetterDescriptor(target: any, prop: any): any {
    events.push("wrong accessor getter trap:" + String(prop));
    return { get: getterOther as any, enumerable: true, configurable: false };
}

function wrongAccessorSetterDescriptor(target: any, prop: any): any {
    events.push("wrong accessor setter trap:" + String(prop));
    return { set: setterOther as any, enumerable: true, configurable: false };
}

function ownFixed(target: any): string[] {
    events.push("own fixed trap");
    return ["fixed"];
}

const badProxy: any = new Proxy({}, { getOwnPropertyDescriptor: badDescriptor as any });
try {
    console.log("bad descriptor:", Object.getOwnPropertyDescriptor(badProxy, "x", mark("bad descriptor")));
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
    console.log("hide fixed:", Object.getOwnPropertyDescriptor(hideFixedProxy, "fixed", mark("hide fixed")));
} catch (e: any) {
    console.log("hide fixed:", e);
}

const closedTarget: any = { x: 1 };
Object.preventExtensions(closedTarget);
const hideClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide closed:", Object.getOwnPropertyDescriptor(hideClosedProxy, "x", mark("hide closed")));
} catch (e: any) {
    console.log("hide closed:", e);
}

const newClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: dataDescriptor as any });
try {
    console.log("new closed:", Object.getOwnPropertyDescriptor(newClosedProxy, "missing", mark("new closed"))?.value);
} catch (e: any) {
    console.log("new closed:", e);
}

const mixedDescriptorProxy: any = new Proxy({}, { getOwnPropertyDescriptor: mixedDescriptor as any });
try {
    console.log("mixed descriptor:", Object.getOwnPropertyDescriptor(mixedDescriptorProxy, "x", mark("mixed descriptor"))?.value);
} catch (e: any) {
    console.log("mixed descriptor:", e);
}

const badGetterProxy: any = new Proxy({}, { getOwnPropertyDescriptor: badGetterDescriptor as any });
try {
    console.log("bad getter:", Object.getOwnPropertyDescriptor(badGetterProxy, "x", mark("bad getter"))?.get);
} catch (e: any) {
    console.log("bad getter:", e);
}

const badSetterProxy: any = new Proxy({}, { getOwnPropertyDescriptor: badSetterDescriptor as any });
try {
    console.log("bad setter:", Object.getOwnPropertyDescriptor(badSetterProxy, "x", mark("bad setter"))?.set);
} catch (e: any) {
    console.log("bad setter:", e);
}

const newFixedProxy: any = new Proxy({}, { getOwnPropertyDescriptor: fixedNewDescriptor as any });
try {
    console.log("new fixed:", Object.getOwnPropertyDescriptor(newFixedProxy, "x", mark("new fixed"))?.value);
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
    console.log("config false:", Object.getOwnPropertyDescriptor(configurableProxy, "x", mark("config false"))?.configurable);
} catch (e: any) {
    console.log("config false:", e);
}

const wrongFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: wrongFixedDescriptor as any });
try {
    console.log("wrong fixed:", Object.getOwnPropertyDescriptor(wrongFixedProxy, "fixed", mark("wrong fixed"))?.value);
} catch (e: any) {
    console.log("wrong fixed:", e);
}

const writableFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: writableFixedDescriptor as any });
try {
    console.log("writable fixed:", Object.getOwnPropertyDescriptor(writableFixedProxy, "fixed", mark("writable fixed"))?.writable);
} catch (e: any) {
    console.log("writable fixed:", e);
}

const wrongEnumerableProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: wrongEnumerableDescriptor as any });
try {
    console.log("wrong enumerable:", Object.getOwnPropertyDescriptor(wrongEnumerableProxy, "fixed", mark("wrong enumerable"))?.enumerable);
} catch (e: any) {
    console.log("wrong enumerable:", e);
}

const accessorTarget: any = {};
Object.defineProperty(accessorTarget, "x", {
    get: getterValue as any,
    set: setterValue as any,
    enumerable: true,
    configurable: false,
});
const accessorProxy: any = new Proxy(accessorTarget, { getOwnPropertyDescriptor: accessorAsDataDescriptor as any });
try {
    console.log("accessor as data:", Object.getOwnPropertyDescriptor(accessorProxy, "x", mark("accessor as data"))?.value);
} catch (e: any) {
    console.log("accessor as data:", e);
}

const wrongAccessorGetterProxy: any = new Proxy(accessorTarget, { getOwnPropertyDescriptor: wrongAccessorGetterDescriptor as any });
try {
    console.log("accessor wrong getter:", Object.getOwnPropertyDescriptor(wrongAccessorGetterProxy, "x", mark("accessor wrong getter"))?.get);
} catch (e: any) {
    console.log("accessor wrong getter:", e);
}

const wrongAccessorSetterProxy: any = new Proxy(accessorTarget, { getOwnPropertyDescriptor: wrongAccessorSetterDescriptor as any });
try {
    console.log("accessor wrong setter:", Object.getOwnPropertyDescriptor(wrongAccessorSetterProxy, "x", mark("accessor wrong setter"))?.set);
} catch (e: any) {
    console.log("accessor wrong setter:", e);
}

const realProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: realDescriptor as any });
const real = Object.getOwnPropertyDescriptor(realProxy, "fixed", mark("real descriptor"));
console.log("real descriptor:", real.value, real.writable, real.configurable);

const keysProxy: any = new Proxy(fixedTarget, {
    ownKeys: ownFixed as any,
    getOwnPropertyDescriptor: hideDescriptor as any,
});
try {
    console.log("keys descriptor:", Object.keys(keysProxy, mark("keys descriptor")).join(","));
} catch (e: any) {
    console.log("keys descriptor:", e);
}

console.log("events:", events.join("|"));
