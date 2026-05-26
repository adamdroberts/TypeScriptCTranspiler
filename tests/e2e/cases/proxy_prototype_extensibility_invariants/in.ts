const baseProto: any = { marker: "base" };
const otherProto: any = { marker: "other" };
const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function badPrototype(target: any): any {
    events.push("bad proto trap");
    return "bad";
}

function otherPrototype(target: any): any {
    events.push("other proto trap");
    return otherProto;
}

function basePrototype(target: any): any {
    events.push("base proto trap");
    return baseProto;
}

function trueSetPrototype(target: any, proto: any): boolean {
    events.push("set proto:" + proto.marker);
    return true;
}

function falseIsExtensible(target: any): boolean {
    events.push("is false trap");
    return false;
}

function trueIsExtensible(target: any): boolean {
    events.push("is true trap");
    return true;
}

function realIsExtensible(target: any): boolean {
    events.push("is real trap");
    return Reflect.isExtensible(target);
}

function fakePreventExtensions(target: any): boolean {
    events.push("prevent fake trap");
    return true;
}

function realPreventExtensions(target: any): boolean {
    events.push("prevent real trap");
    return Reflect.preventExtensions(target);
}

const badProtoProxy: any = new Proxy({}, { getPrototypeOf: badPrototype as any });
try {
    console.log("bad proto:", Object.getPrototypeOf(badProtoProxy, mark("bad proto")));
} catch (e: any) {
    console.log("bad proto:", e);
}

const closedProtoTarget: any = {};
Object.setPrototypeOf(closedProtoTarget, baseProto);
Object.preventExtensions(closedProtoTarget);
const closedProtoProxy: any = new Proxy(closedProtoTarget, { getPrototypeOf: otherPrototype as any });
try {
    console.log("closed proto:", Object.getPrototypeOf(closedProtoProxy, mark("closed proto")).marker);
} catch (e: any) {
    console.log("closed proto:", e);
}

const closedSetTarget: any = {};
Object.setPrototypeOf(closedSetTarget, baseProto);
Object.preventExtensions(closedSetTarget);
const closedSetProxy: any = new Proxy(closedSetTarget, { setPrototypeOf: trueSetPrototype as any });
try {
    console.log("set closed:", Object.setPrototypeOf(closedSetProxy, otherProto, mark("set closed")) === closedSetProxy);
} catch (e: any) {
    console.log("set closed:", e);
}
console.log("set same:", Object.setPrototypeOf(closedSetProxy, baseProto, mark("set same")) === closedSetProxy);

const extensibleMismatchProxy: any = new Proxy({}, { isExtensible: falseIsExtensible as any });
try {
    console.log("extensible mismatch:", Object.isExtensible(extensibleMismatchProxy, mark("extensible mismatch")));
} catch (e: any) {
    console.log("extensible mismatch:", e);
}

const closedExtensibleTarget: any = {};
Object.preventExtensions(closedExtensibleTarget);
const closedExtensibleProxy: any = new Proxy(closedExtensibleTarget, { isExtensible: trueIsExtensible as any });
try {
    console.log("closed extensible mismatch:", Object.isExtensible(closedExtensibleProxy, mark("closed extensible mismatch")));
} catch (e: any) {
    console.log("closed extensible mismatch:", e);
}

const preventMismatchProxy: any = new Proxy({}, { preventExtensions: fakePreventExtensions as any });
try {
    console.log("prevent mismatch:", Object.preventExtensions(preventMismatchProxy, mark("prevent mismatch")) === preventMismatchProxy);
} catch (e: any) {
    console.log("prevent mismatch:", e);
}

const realTarget: any = {};
const realProxy: any = new Proxy(realTarget, {
    isExtensible: realIsExtensible as any,
    preventExtensions: realPreventExtensions as any,
});
console.log("real before:", Object.isExtensible(realProxy, mark("real before")));
console.log("real prevent:", Object.preventExtensions(realProxy, mark("real prevent")) === realProxy, Object.isExtensible(realTarget));
console.log("real after:", Object.isExtensible(realProxy, mark("real after")));

const exactProtoTarget: any = {};
Object.setPrototypeOf(exactProtoTarget, baseProto);
Object.preventExtensions(exactProtoTarget);
const exactProtoProxy: any = new Proxy(exactProtoTarget, { getPrototypeOf: basePrototype as any });
console.log("exact proto:", Object.getPrototypeOf(exactProtoProxy, mark("exact proto")).marker);
console.log("events:", events.join("|"));
