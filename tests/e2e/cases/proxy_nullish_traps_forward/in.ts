const target: any = { a: 1, drop: 2 };
Object.defineProperty(target, "hidden", {
    value: "H",
    enumerable: false,
    configurable: true,
});

const oldProto: any = { marker: "old" };
const nextProto: any = { marker: "next" };
Object.setPrototypeOf(target, oldProto);

const proxy: any = new Proxy(target, {
    get: null as any,
    set: undefined as any,
    has: null as any,
    deleteProperty: undefined as any,
    defineProperty: null as any,
    getOwnPropertyDescriptor: undefined as any,
    ownKeys: null as any,
    getPrototypeOf: undefined as any,
    setPrototypeOf: null as any,
    isExtensible: undefined as any,
    preventExtensions: null as any,
});

console.log("get:", proxy.a);
console.log("set:", Reflect.set(proxy, "b", 3), target.b);
console.log("has:", "hidden" in proxy, "missing" in proxy);
console.log("delete:", delete proxy.drop, "drop" in target);
console.log("define:", Reflect.defineProperty(proxy, "c", { value: 4, enumerable: true, configurable: true }), target.c);
const hidden: any = Object.getOwnPropertyDescriptor(proxy, "hidden");
console.log("desc:", hidden.value, hidden.enumerable);
console.log("keys:", Object.keys(proxy).join(","));
console.log("own:", Reflect.ownKeys(proxy).join(","));
console.log("proto before:", Object.getPrototypeOf(proxy).marker);
console.log("proto set:", Object.setPrototypeOf(proxy, nextProto) === proxy, Object.getPrototypeOf(target).marker);
console.log("ext before:", Object.isExtensible(proxy));
console.log("prevent:", Object.preventExtensions(proxy) === proxy, Object.isExtensible(target));
console.log("ext after:", Object.isExtensible(proxy));
