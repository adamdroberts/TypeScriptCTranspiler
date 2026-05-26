function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const events: string[] = [];

function note(label: string, value: any): any {
    events.push(label);
    return value;
}

function getTrap(target: any, prop: any, receiver: any): any {
    return "callable-proxy:" + String(prop);
}

const callableTrap: any = new Proxy(getTrap as any, {});
const callableProxyTrap: any = new Proxy({}, { get: callableTrap as any });
console.log("callable proxy trap:", Reflect.get(callableProxyTrap, "x"));

const badGetProxy: any = new Proxy({}, { get: 1 as any });
report("bad get", function(): any {
    return Reflect.get(badGetProxy, note("get-key", "x"));
});

const badSetProxy: any = new Proxy({}, { set: 1 as any });
report("bad set", function(): any {
    return Reflect.set(badSetProxy, note("set-key", "x"), note("set-value", 1));
});

const badHasProxy: any = new Proxy({}, { has: 1 as any });
report("bad has", function(): any {
    return Reflect.has(badHasProxy, note("has-key", "x"));
});

const badDeleteProxy: any = new Proxy({}, { deleteProperty: 1 as any });
report("bad delete", function(): any {
    return Reflect.deleteProperty(badDeleteProxy, note("delete-key", "x"));
});

const badDefineProxy: any = new Proxy({}, { defineProperty: 1 as any });
report("bad define", function(): any {
    return Reflect.defineProperty(badDefineProxy, note("define-key", "x"), note("define-desc", { value: 1 }));
});

const badDescriptorProxy: any = new Proxy({}, { getOwnPropertyDescriptor: 1 as any });
report("bad descriptor", function(): any {
    return Reflect.getOwnPropertyDescriptor(badDescriptorProxy, note("descriptor-key", "x"));
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
    return Reflect.setPrototypeOf(badSetProtoProxy, note("setProto-value", null));
});

const badIsExtensibleProxy: any = new Proxy({}, { isExtensible: 1 as any });
report("bad isExtensible", function(): any {
    return Reflect.isExtensible(badIsExtensibleProxy);
});

const badPreventExtensionsProxy: any = new Proxy({}, { preventExtensions: 1 as any });
report("bad preventExtensions", function(): any {
    return Reflect.preventExtensions(badPreventExtensionsProxy);
});

console.log("events:", events.join("|"));
