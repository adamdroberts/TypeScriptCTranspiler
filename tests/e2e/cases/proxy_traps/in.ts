const events: string[] = [];

const target: any = { a: 1 };
Object.defineProperty(target, "hidden", {
    value: 9,
    enumerable: false,
    configurable: true,
    writable: true,
});

function trapGet(target: any, prop: any, receiver: any): any {
    events.push("get:" + String(prop));
    if (prop === "virtual") return "v";
    return Reflect.get(target, prop, receiver);
}

function trapSet(target: any, prop: any, value: any, receiver: any): boolean {
    events.push("set:" + String(prop) + ":" + String(value));
    target[prop] = value;
    return true;
}

function trapHas(target: any, prop: any): boolean {
    events.push("has:" + String(prop));
    return prop === "virtual" || Reflect.has(target, prop);
}

function trapDelete(target: any, prop: any): boolean {
    events.push("delete:" + String(prop));
    return Reflect.deleteProperty(target, prop);
}

function trapDefine(target: any, prop: any, desc: any): boolean {
    events.push("define:" + String(prop) + ":" + String(desc.value));
    target[prop] = desc.value;
    return true;
}

function trapDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop));
    if (prop === "virtual") {
        return { value: "desc", enumerable: true, configurable: true };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function trapOwnKeys(target: any): string[] {
    events.push("ownKeys");
    return ["a", "b", "hidden", "virtual"];
}

function trapGetPrototypeOf(target: any): any {
    events.push("getProto");
    return Reflect.getPrototypeOf(target);
}

function trapSetPrototypeOf(target: any, proto: any): boolean {
    events.push("setProto");
    return Reflect.setPrototypeOf(target, proto);
}

function trapIsExtensible(target: any): boolean {
    events.push("isExtensible");
    return Reflect.isExtensible(target);
}

function trapPreventExtensions(target: any): boolean {
    events.push("preventExtensions");
    return Reflect.preventExtensions(target);
}

const handler: any = {
    get: trapGet as any,
    set: trapSet as any,
    has: trapHas as any,
    deleteProperty: trapDelete as any,
    defineProperty: trapDefine as any,
    getOwnPropertyDescriptor: trapDescriptor as any,
    ownKeys: trapOwnKeys as any,
    getPrototypeOf: trapGetPrototypeOf as any,
    setPrototypeOf: trapSetPrototypeOf as any,
    isExtensible: trapIsExtensible as any,
    preventExtensions: trapPreventExtensions as any,
};

const proxy: any = new Proxy(target, handler);

proxy.b = 2;
console.log("get:", proxy.a, proxy.virtual);
console.log("has:", "a" in proxy, "virtual" in proxy);
console.log("delete:", delete proxy.a, "a" in proxy);
console.log("define:", Reflect.defineProperty(proxy, "c", { value: 3, enumerable: true, configurable: true, writable: true }), target.c);
console.log("desc:", Object.getOwnPropertyDescriptor(proxy, "virtual").value);
console.log("keys:", Object.keys(proxy).join(","));
const proto: any = { marker: "proto" };
console.log("proto:", Object.setPrototypeOf(proxy, proto) === proxy, Object.getPrototypeOf(proxy).marker);
console.log("ext:", Object.isExtensible(proxy), Object.preventExtensions(proxy) === proxy, Object.isExtensible(target));

function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function trapApply(target: any, thisArg: any, args: any): any {
    events.push("apply:" + String(thisArg.base));
    return Reflect.apply(target, { base: 10 }, args) + 1;
}

const callable: any = new Proxy(add as any, { apply: trapApply as any });
console.log("apply:", Reflect.apply(callable, { base: 0 }, [2, 3]));
console.log("events:", events.join("|"));
