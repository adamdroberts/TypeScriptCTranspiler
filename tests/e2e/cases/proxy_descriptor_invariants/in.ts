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

function arrayDescriptorObject(target: any, prop: any): any {
    events.push("array object trap:" + String(prop));
    const desc: any = [];
    desc.value = "array";
    desc.writable = true;
    desc.enumerable = true;
    desc.configurable = true;
    return desc;
}

function FunctionDescriptorObject(this: any): void {}

function functionDescriptorObject(target: any, prop: any): any {
    events.push("function object trap:" + String(prop));
    const out: any = FunctionDescriptorObject as any;
    out.value = "function";
    out.writable = true;
    out.enumerable = true;
    out.configurable = true;
    return out;
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

function inheritedWrongFixedDescriptor(target: any, prop: any): any {
    events.push("inherited wrong fixed trap:" + String(prop));
    return Object.create({ value: 2, writable: false, enumerable: true, configurable: false });
}

function inheritedConfigurableDescriptor(target: any, prop: any): any {
    events.push("inherited configurable trap:" + String(prop));
    return Object.create({ value: 1, writable: false, enumerable: true, configurable: true });
}

function writableFixedDescriptor(target: any, prop: any): any {
    events.push("writable fixed trap:" + String(prop));
    return { value: 1, writable: true, enumerable: true, configurable: false };
}

function wrongEnumerableDescriptor(target: any, prop: any): any {
    events.push("wrong enumerable trap:" + String(prop));
    return { value: 1, writable: false, enumerable: false, configurable: false };
}

function missingValueDescriptor(target: any, prop: any): any {
    events.push("missing value trap:" + String(prop));
    return { writable: false, enumerable: true, configurable: false };
}

function missingEnumerableDescriptor(target: any, prop: any): any {
    events.push("missing enumerable trap:" + String(prop));
    return { value: 1, writable: false, configurable: false };
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

function DescriptorFunctionTarget(this: any): void {}

function wrongAccessorGetterDescriptor(target: any, prop: any): any {
    events.push("wrong accessor getter trap:" + String(prop));
    return { get: getterOther as any, enumerable: true, configurable: false };
}

function wrongAccessorSetterDescriptor(target: any, prop: any): any {
    events.push("wrong accessor setter trap:" + String(prop));
    return { set: setterOther as any, enumerable: true, configurable: false };
}

function missingAccessorGetterDescriptor(target: any, prop: any): any {
    events.push("missing accessor getter trap:" + String(prop));
    return { set: setterValue as any, enumerable: true, configurable: false };
}

function missingAccessorSetterDescriptor(target: any, prop: any): any {
    events.push("missing accessor setter trap:" + String(prop));
    return { enumerable: true, configurable: false };
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

const arrayDescriptorObjectProxy: any = new Proxy({}, { getOwnPropertyDescriptor: arrayDescriptorObject as any });
const arrayDescriptor = Object.getOwnPropertyDescriptor(arrayDescriptorObjectProxy, "x", mark("array descriptor object"));
console.log("array descriptor object:", arrayDescriptor.value, arrayDescriptor.writable, arrayDescriptor.configurable);

const arrayTargetDescriptorProxy: any = new Proxy([] as any, { getOwnPropertyDescriptor: arrayDescriptorObject as any });
const arrayTargetDescriptor = Object.getOwnPropertyDescriptor(arrayTargetDescriptorProxy, "side", mark("array target descriptor object"));
console.log("array target descriptor object:", arrayTargetDescriptor.value, arrayTargetDescriptor.writable, arrayTargetDescriptor.configurable);

const functionTargetDescriptorProxy: any = new Proxy(DescriptorFunctionTarget as any, { getOwnPropertyDescriptor: functionDescriptorObject as any });
const functionTargetDescriptor = Object.getOwnPropertyDescriptor(functionTargetDescriptorProxy, "side", mark("function target descriptor object"));
console.log("function target descriptor object:", functionTargetDescriptor.value, functionTargetDescriptor.writable, functionTargetDescriptor.configurable);

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

const inheritedWrongFixedProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: inheritedWrongFixedDescriptor as any });
try {
    console.log("inherited wrong fixed:", Object.getOwnPropertyDescriptor(inheritedWrongFixedProxy, "fixed", mark("inherited wrong fixed"))?.value);
} catch (e: any) {
    console.log("inherited wrong fixed:", e);
}

const inheritedConfigurableProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: inheritedConfigurableDescriptor as any });
try {
    console.log("inherited configurable:", Reflect.getOwnPropertyDescriptor(inheritedConfigurableProxy, "fixed", mark("inherited configurable"))?.configurable);
} catch (e: any) {
    console.log("inherited configurable:", e);
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

const missingValueProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: missingValueDescriptor as any });
try {
    console.log("missing value:", Object.getOwnPropertyDescriptor(missingValueProxy, "fixed", mark("missing value"))?.value);
} catch (e: any) {
    console.log("missing value:", e);
}

const missingEnumerableProxy: any = new Proxy(fixedTarget, { getOwnPropertyDescriptor: missingEnumerableDescriptor as any });
try {
    console.log("missing enumerable:", Object.getOwnPropertyDescriptor(missingEnumerableProxy, "fixed", mark("missing enumerable"))?.enumerable);
} catch (e: any) {
    console.log("missing enumerable:", e);
}

const accessorTarget: any = {};
Object.defineProperty(accessorTarget, "x", {
    get: getterValue as any,
    set: setterValue as any,
    enumerable: true,
    configurable: false,
});
const setterOnlyAccessorTarget: any = {};
Object.defineProperty(setterOnlyAccessorTarget, "x", {
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

const wrongAccessorSetterProxy: any = new Proxy(setterOnlyAccessorTarget, { getOwnPropertyDescriptor: wrongAccessorSetterDescriptor as any });
try {
    console.log("accessor wrong setter:", Object.getOwnPropertyDescriptor(wrongAccessorSetterProxy, "x", mark("accessor wrong setter"))?.set);
} catch (e: any) {
    console.log("accessor wrong setter:", e);
}

const missingAccessorGetterProxy: any = new Proxy(accessorTarget, { getOwnPropertyDescriptor: missingAccessorGetterDescriptor as any });
try {
    console.log("accessor missing getter:", Object.getOwnPropertyDescriptor(missingAccessorGetterProxy, "x", mark("accessor missing getter"))?.get);
} catch (e: any) {
    console.log("accessor missing getter:", e);
}

const missingAccessorSetterProxy: any = new Proxy(setterOnlyAccessorTarget, { getOwnPropertyDescriptor: missingAccessorSetterDescriptor as any });
try {
    console.log("accessor missing setter:", Object.getOwnPropertyDescriptor(missingAccessorSetterProxy, "x", mark("accessor missing setter"))?.set);
} catch (e: any) {
    console.log("accessor missing setter:", e);
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
