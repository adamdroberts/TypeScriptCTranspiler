const proxy: any = new Proxy([10, 20], {});

const desc: any = Object.getOwnPropertyDescriptor(proxy, "1");
const lengthDesc: any = Reflect.getOwnPropertyDescriptor(proxy, "length");
const entries: any = Object.entries(proxy);

console.log("keys:", Object.keys(proxy).join("|"));
console.log("values:", Object.values(proxy).join("|"));
console.log("entries:", entries[0][0] + ":" + entries[0][1], entries[1][0] + ":" + entries[1][1]);
console.log("own:", Reflect.ownKeys(proxy).join("|"));
console.log("desc:", desc.value, desc.enumerable, desc.configurable);
console.log("length desc:", lengthDesc.value, lengthDesc.enumerable, lengthDesc.configurable);
console.log(
    "checks:",
    Object.hasOwn(proxy, "0"),
    "1" in proxy,
    "length" in proxy,
    Object.prototype.propertyIsEnumerable.call(proxy, "0"),
    Object.prototype.propertyIsEnumerable.call(proxy, "length"),
);
