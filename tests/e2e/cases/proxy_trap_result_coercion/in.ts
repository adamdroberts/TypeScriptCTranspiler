function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

function zeroSet(target: any, prop: any, value: any, receiver: any): number {
    return 0;
}

function stringSet(target: any, prop: any, value: any, receiver: any): string {
    return "ok";
}

function zeroHas(target: any, prop: any): number {
    return 0;
}

function stringHas(target: any, prop: any): string {
    return "ok";
}

function emptyDefine(target: any, prop: any, desc: any): string {
    return "";
}

function objectDefine(target: any, prop: any, desc: any): any {
    return {};
}

function emptyDelete(target: any, prop: any): string {
    return "";
}

function objectDelete(target: any, prop: any): any {
    return {};
}

function zeroSetPrototype(target: any, proto: any): number {
    return 0;
}

function stringSetPrototype(target: any, proto: any): string {
    return "ok";
}

function emptyPrevent(target: any): string {
    return "";
}

function stringIsExtensible(target: any): string {
    return "ok";
}

function zeroIsExtensible(target: any): number {
    return 0;
}

const nextProto: any = { marker: "next" };

const zeroSetTarget: any = {};
const zeroSetProxy: any = new Proxy(zeroSetTarget, { set: zeroSet as any });
console.log("zero set:", Reflect.set(zeroSetProxy, "x", 1), zeroSetTarget.x);

const stringSetTarget: any = {};
const stringSetProxy: any = new Proxy(stringSetTarget, { set: stringSet as any });
console.log("string set:", Reflect.set(stringSetProxy, "x", 1), stringSetTarget.x);

const zeroHasTarget: any = { x: 1 };
const zeroHasProxy: any = new Proxy(zeroHasTarget, { has: zeroHas as any });
console.log("zero has:", Reflect.has(zeroHasProxy, "x"), "x" in zeroHasProxy);

const stringHasTarget: any = {};
const stringHasProxy: any = new Proxy(stringHasTarget, { has: stringHas as any });
console.log("string has:", Reflect.has(stringHasProxy, "x"), "x" in stringHasProxy);

const emptyDefineTarget: any = {};
const emptyDefineProxy: any = new Proxy(emptyDefineTarget, { defineProperty: emptyDefine as any });
console.log("empty define:", Reflect.defineProperty(emptyDefineProxy, "x", { value: 1 }), "x" in emptyDefineTarget);
report("object empty define", (): any => Object.defineProperty(emptyDefineProxy, "x", { value: 1 }) === emptyDefineProxy);

const objectDefineTarget: any = {};
const objectDefineProxy: any = new Proxy(objectDefineTarget, { defineProperty: objectDefine as any });
console.log("object define:", Reflect.defineProperty(objectDefineProxy, "x", { value: 1 }), "x" in objectDefineTarget);

const emptyDeleteTarget: any = { x: 1 };
const emptyDeleteProxy: any = new Proxy(emptyDeleteTarget, { deleteProperty: emptyDelete as any });
console.log("empty delete:", Reflect.deleteProperty(emptyDeleteProxy, "x"), emptyDeleteTarget.x);

const objectDeleteTarget: any = { x: 1 };
const objectDeleteProxy: any = new Proxy(objectDeleteTarget, { deleteProperty: objectDelete as any });
console.log("object delete:", Reflect.deleteProperty(objectDeleteProxy, "x"), objectDeleteTarget.x);

const zeroProtoTarget: any = {};
const zeroProtoProxy: any = new Proxy(zeroProtoTarget, { setPrototypeOf: zeroSetPrototype as any });
console.log("zero set proto:", Reflect.setPrototypeOf(zeroProtoProxy, nextProto), Object.getPrototypeOf(zeroProtoTarget) === nextProto);
report("object zero set proto", (): any => Object.setPrototypeOf(zeroProtoProxy, nextProto) === zeroProtoProxy);

const stringProtoTarget: any = {};
const stringProtoProxy: any = new Proxy(stringProtoTarget, { setPrototypeOf: stringSetPrototype as any });
console.log("string set proto:", Reflect.setPrototypeOf(stringProtoProxy, nextProto), Object.getPrototypeOf(stringProtoTarget) === nextProto);

const preventProxy: any = new Proxy({}, { preventExtensions: emptyPrevent as any });
console.log("empty prevent:", Reflect.preventExtensions(preventProxy), Object.isExtensible(preventProxy));
report("object empty prevent", (): any => Object.preventExtensions(preventProxy) === preventProxy);

const truthyExtensibleProxy: any = new Proxy({}, { isExtensible: stringIsExtensible as any });
console.log("string isExtensible:", Reflect.isExtensible(truthyExtensibleProxy), Object.isExtensible(truthyExtensibleProxy));

const nonExtensibleTarget: any = {};
Object.preventExtensions(nonExtensibleTarget);
const zeroExtensibleProxy: any = new Proxy(nonExtensibleTarget, { isExtensible: zeroIsExtensible as any });
console.log("zero isExtensible:", Reflect.isExtensible(zeroExtensibleProxy), Object.isExtensible(zeroExtensibleProxy));
