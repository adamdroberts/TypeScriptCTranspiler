function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const revocable = Proxy.revocable({ a: 1 }, {});
const proxy: any = revocable.proxy;

console.log("before:", Reflect.get(proxy, "a"), Reflect.has(proxy, "a"), Reflect.ownKeys(proxy).join(","));
revocable.revoke();

report("reflect get", (): any => Reflect.get(proxy, "a"));
report("reflect set", (): any => Reflect.set(proxy, "a", 2));
report("reflect has", (): any => Reflect.has(proxy, "a"));
report("reflect delete", (): any => Reflect.deleteProperty(proxy, "a"));
report("reflect ownKeys", (): any => Reflect.ownKeys(proxy).length);
report("reflect descriptor", (): any => Reflect.getOwnPropertyDescriptor(proxy, "a"));
report("reflect define", (): any => Reflect.defineProperty(proxy, "b", { value: 2 }));
report("reflect get proto", (): any => Reflect.getPrototypeOf(proxy));
report("reflect set proto", (): any => Reflect.setPrototypeOf(proxy, null));
report("reflect is extensible", (): any => Reflect.isExtensible(proxy));
report("reflect prevent extensions", (): any => Reflect.preventExtensions(proxy));
