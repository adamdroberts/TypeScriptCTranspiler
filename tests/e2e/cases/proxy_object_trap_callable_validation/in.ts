function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function getTrap(target: any, prop: any, receiver: any): any {
    return "callable-proxy:" + String(prop);
}

const callableTrap: any = new Proxy(getTrap as any, {});
const callableProxyTrap: any = new Proxy({}, { get: callableTrap as any });
console.log("callable proxy trap:", Reflect.get(callableProxyTrap, "x"));

const badGetProxy: any = new Proxy({}, { get: 1 as any });
report("bad get", function(): any {
    return Reflect.get(badGetProxy, "x");
});

const badSetProxy: any = new Proxy({}, { set: 1 as any });
report("bad set", function(): any {
    return Reflect.set(badSetProxy, "x", 1);
});

const badHasProxy: any = new Proxy({}, { has: 1 as any });
report("bad has", function(): any {
    return Reflect.has(badHasProxy, "x");
});

const badDeleteProxy: any = new Proxy({}, { deleteProperty: 1 as any });
report("bad delete", function(): any {
    return Reflect.deleteProperty(badDeleteProxy, "x");
});

const badDefineProxy: any = new Proxy({}, { defineProperty: 1 as any });
report("bad define", function(): any {
    return Reflect.defineProperty(badDefineProxy, "x", { value: 1 });
});

const badDescriptorProxy: any = new Proxy({}, { getOwnPropertyDescriptor: 1 as any });
report("bad descriptor", function(): any {
    return Reflect.getOwnPropertyDescriptor(badDescriptorProxy, "x");
});

const badOwnKeysProxy: any = new Proxy({}, { ownKeys: 1 as any });
report("bad ownKeys", function(): any {
    return Reflect.ownKeys(badOwnKeysProxy).length;
});

const badGetProtoProxy: any = new Proxy({}, { getPrototypeOf: 1 as any });
report("bad getProto", function(): any {
    return Reflect.getPrototypeOf(badGetProtoProxy);
});

const badSetProtoProxy: any = new Proxy({}, { setPrototypeOf: 1 as any });
report("bad setProto", function(): any {
    return Reflect.setPrototypeOf(badSetProtoProxy, null);
});

const badIsExtensibleProxy: any = new Proxy({}, { isExtensible: 1 as any });
report("bad isExtensible", function(): any {
    return Reflect.isExtensible(badIsExtensibleProxy);
});

const badPreventExtensionsProxy: any = new Proxy({}, { preventExtensions: 1 as any });
report("bad preventExtensions", function(): any {
    return Reflect.preventExtensions(badPreventExtensionsProxy);
});
