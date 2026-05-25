function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const revocable = Proxy.revocable({ a: 1 }, {});
const proxy: any = revocable.proxy;

console.log("before:", proxy.a, "a" in proxy, Object.keys(proxy).join(","));
revocable.revoke();

report("get", (): any => proxy.a);
report("set", (): any => {
    proxy.a = 2;
    return "set";
});
report("has", (): any => "a" in proxy);
report("delete", (): any => delete proxy.a);
report("ownKeys", (): any => (Reflect.ownKeys(proxy) as any).length);
report("keys", (): any => Object.keys(proxy).length);
report("descriptor", (): any => Object.getOwnPropertyDescriptor(proxy, "a"));
report("define", (): any => Object.defineProperty(proxy, "b", { value: 2 }));
report("get proto", (): any => Object.getPrototypeOf(proxy));
report("set proto", (): any => Object.setPrototypeOf(proxy, null));
report("is extensible", (): any => Object.isExtensible(proxy));
report("prevent extensions", (): any => Object.preventExtensions(proxy));
report("seal", (): any => Object.seal(proxy));
report("freeze", (): any => Object.freeze(proxy));
report("is sealed", (): any => Object.isSealed(proxy));
report("is frozen", (): any => Object.isFrozen(proxy));
