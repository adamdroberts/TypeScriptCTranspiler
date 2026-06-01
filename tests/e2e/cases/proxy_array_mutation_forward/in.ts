const proxy: any = new Proxy(["red", "blue"], {});

proxy["1"] = "cyan";
console.log("set index:", Object.values(proxy).join("|"), proxy[1]);

console.log("reflect set:", Reflect.set(proxy, "3", "gold"));
console.log("expanded:", proxy.length, proxy[2], proxy[3], Object.values(proxy).join("|"));

const explicitReceiver: any = {};
console.log("receiver set:", Reflect.set(proxy, "receiverOnly", "kept", explicitReceiver), explicitReceiver.receiverOnly, proxy.receiverOnly);

console.log("reflect length:", Reflect.set(proxy, "length", 2));
console.log("truncated:", proxy.length, Object.values(proxy).join("|"));

console.log(
    "define index:",
    Reflect.defineProperty(proxy, "1", {
        value: "green",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
    Object.values(proxy).join("|"),
);

Object.defineProperty(proxy, "3", {
    value: "violet",
    writable: true,
    enumerable: true,
    configurable: true,
});
console.log("define expand:", proxy.length, proxy[2], proxy[3], Object.keys(proxy).join("|"));

console.log(
    "define length:",
    Reflect.defineProperty(proxy, "length", {
        value: 2,
        writable: true,
        enumerable: false,
        configurable: false,
    }),
    proxy.length,
    Object.values(proxy).join("|"),
);

console.log("delete index:", Reflect.deleteProperty(proxy, "1"), proxy[1], proxy.length);
console.log("delete length:", Reflect.deleteProperty(proxy, "length"));
