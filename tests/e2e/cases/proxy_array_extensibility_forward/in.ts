const proxy: any = new Proxy(["a", "b"], {});

console.log("before:", Object.isExtensible(proxy), Reflect.isExtensible(proxy));
console.log("prevent:", Reflect.preventExtensions(proxy));
console.log("after:", Object.isExtensible(proxy), Reflect.isExtensible(proxy));

console.log("set existing:", Reflect.set(proxy, "1", "B"), Object.values(proxy).join("|"));
console.log("set new:", Reflect.set(proxy, "2", "C"), proxy.length, Object.values(proxy).join("|"));
console.log(
    "define new:",
    Reflect.defineProperty(proxy, "2", {
        value: "C",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
);
console.log("keys:", Object.keys(proxy).join("|"));
