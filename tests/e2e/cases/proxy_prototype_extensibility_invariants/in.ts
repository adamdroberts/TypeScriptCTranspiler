const baseProto: any = { marker: "base" };
const otherProto: any = { marker: "other" };

function badPrototype(target: any): any {
    return "bad";
}

function otherPrototype(target: any): any {
    return otherProto;
}

function basePrototype(target: any): any {
    return baseProto;
}

function trueSetPrototype(target: any, proto: any): boolean {
    return true;
}

function falseIsExtensible(target: any): boolean {
    return false;
}

function trueIsExtensible(target: any): boolean {
    return true;
}

function realIsExtensible(target: any): boolean {
    return Reflect.isExtensible(target);
}

function fakePreventExtensions(target: any): boolean {
    return true;
}

function realPreventExtensions(target: any): boolean {
    return Reflect.preventExtensions(target);
}

const badProtoProxy: any = new Proxy({}, { getPrototypeOf: badPrototype as any });
try {
    console.log("bad proto:", Object.getPrototypeOf(badProtoProxy));
} catch (e: any) {
    console.log("bad proto:", e);
}

const closedProtoTarget: any = {};
Object.setPrototypeOf(closedProtoTarget, baseProto);
Object.preventExtensions(closedProtoTarget);
const closedProtoProxy: any = new Proxy(closedProtoTarget, { getPrototypeOf: otherPrototype as any });
try {
    console.log("closed proto:", Object.getPrototypeOf(closedProtoProxy).marker);
} catch (e: any) {
    console.log("closed proto:", e);
}

const closedSetTarget: any = {};
Object.setPrototypeOf(closedSetTarget, baseProto);
Object.preventExtensions(closedSetTarget);
const closedSetProxy: any = new Proxy(closedSetTarget, { setPrototypeOf: trueSetPrototype as any });
try {
    console.log("set closed:", Object.setPrototypeOf(closedSetProxy, otherProto) === closedSetProxy);
} catch (e: any) {
    console.log("set closed:", e);
}
console.log("set same:", Object.setPrototypeOf(closedSetProxy, baseProto) === closedSetProxy);

const extensibleMismatchProxy: any = new Proxy({}, { isExtensible: falseIsExtensible as any });
try {
    console.log("extensible mismatch:", Object.isExtensible(extensibleMismatchProxy));
} catch (e: any) {
    console.log("extensible mismatch:", e);
}

const closedExtensibleTarget: any = {};
Object.preventExtensions(closedExtensibleTarget);
const closedExtensibleProxy: any = new Proxy(closedExtensibleTarget, { isExtensible: trueIsExtensible as any });
try {
    console.log("closed extensible mismatch:", Object.isExtensible(closedExtensibleProxy));
} catch (e: any) {
    console.log("closed extensible mismatch:", e);
}

const preventMismatchProxy: any = new Proxy({}, { preventExtensions: fakePreventExtensions as any });
try {
    console.log("prevent mismatch:", Object.preventExtensions(preventMismatchProxy) === preventMismatchProxy);
} catch (e: any) {
    console.log("prevent mismatch:", e);
}

const realTarget: any = {};
const realProxy: any = new Proxy(realTarget, {
    isExtensible: realIsExtensible as any,
    preventExtensions: realPreventExtensions as any,
});
console.log("real before:", Object.isExtensible(realProxy));
console.log("real prevent:", Object.preventExtensions(realProxy) === realProxy, Object.isExtensible(realTarget));
console.log("real after:", Object.isExtensible(realProxy));

const exactProtoTarget: any = {};
Object.setPrototypeOf(exactProtoTarget, baseProto);
Object.preventExtensions(exactProtoTarget);
const exactProtoProxy: any = new Proxy(exactProtoTarget, { getPrototypeOf: basePrototype as any });
console.log("exact proto:", Object.getPrototypeOf(exactProtoProxy).marker);
