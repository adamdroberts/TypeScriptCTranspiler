function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const nextProto: any = { marker: "next" };

function falseSet(target: any, prop: any, value: any, receiver: any): boolean {
    return false;
}

function falseDefine(target: any, prop: any, desc: any): boolean {
    return false;
}

function falseDelete(target: any, prop: any): boolean {
    return false;
}

function falsePrevent(target: any): boolean {
    return false;
}

function falseSetPrototype(target: any, proto: any): boolean {
    return false;
}

const setProxy: any = new Proxy({}, { set: falseSet as any });
console.log("reflect set:", Reflect.set(setProxy, "x", 1), setProxy.x);

const defineProxy: any = new Proxy({}, { defineProperty: falseDefine as any });
console.log("reflect define:", Reflect.defineProperty(defineProxy, "x", { value: 1 }), "x" in defineProxy);

const deleteTarget: any = { x: 1 };
const deleteProxy: any = new Proxy(deleteTarget, { deleteProperty: falseDelete as any });
console.log("reflect delete:", Reflect.deleteProperty(deleteProxy, "x"), deleteTarget.x);

const preventProxy: any = new Proxy({}, { preventExtensions: falsePrevent as any });
console.log("reflect prevent:", Reflect.preventExtensions(preventProxy), Object.isExtensible(preventProxy));
report("object prevent", (): any => Object.preventExtensions(preventProxy) === preventProxy);

const setProtoTarget: any = {};
const setProtoProxy: any = new Proxy(setProtoTarget, { setPrototypeOf: falseSetPrototype as any });
console.log("reflect set proto:", Reflect.setPrototypeOf(setProtoProxy, nextProto), Object.getPrototypeOf(setProtoTarget) === nextProto);
report("object set proto", (): any => Object.setPrototypeOf(setProtoProxy, nextProto) === setProtoProxy);
