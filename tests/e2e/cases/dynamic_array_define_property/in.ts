const items: any = ["red", "blue"];

console.log(
    "index:",
    Reflect.defineProperty(items, "1", {
        value: "cyan",
        writable: true,
        enumerable: true,
        configurable: true,
    }),
    items.join("|"),
);

Object.defineProperty(items, "3", {
    value: "gold",
    writable: true,
    enumerable: true,
    configurable: true,
});

console.log("expanded:", items.length, items[2], items[3], Object.keys(items).join("|"));

console.log(
    "length:",
    Reflect.defineProperty(items, "length", {
        value: 2,
        writable: true,
        enumerable: false,
        configurable: false,
    }),
    items.length,
    items.join("|"),
);

console.log(
    "unsupported flags:",
    Reflect.defineProperty(items, "0", {
        value: "hidden",
        writable: false,
        enumerable: false,
        configurable: false,
    }),
    items[0],
);
