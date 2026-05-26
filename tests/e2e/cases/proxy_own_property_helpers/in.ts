const events: string[] = [];

function descriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop));
    if (prop === "virtual") {
        return { value: 3, writable: true, enumerable: true, configurable: true };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function badDescriptor(target: any, prop: any): any {
    return "bad";
}

const target: any = {};
Object.defineProperty(target, "visible", {
    value: 1,
    enumerable: true,
    configurable: true,
});
Object.defineProperty(target, "hidden", {
    value: 2,
    enumerable: false,
    configurable: true,
});

const proxy: any = new Proxy(target, { getOwnPropertyDescriptor: descriptor as any });

console.log(
    "has:",
    Object.hasOwn(proxy, "visible"),
    Object.hasOwn(proxy, "hidden"),
    Object.hasOwn(proxy, "virtual"),
    Object.hasOwn(proxy, "missing"),
    Object.prototype.hasOwnProperty.call(proxy, "virtual"),
);
console.log(
    "enum:",
    Object.prototype.propertyIsEnumerable.call(proxy, "visible"),
    Object.prototype.propertyIsEnumerable.call(proxy, "hidden"),
    Object.prototype.propertyIsEnumerable.call(proxy, "virtual"),
    Object.prototype.propertyIsEnumerable.call(proxy, "missing"),
);
console.log("events:", events.join("|"));

const badProxy: any = new Proxy({}, { getOwnPropertyDescriptor: badDescriptor as any });
try {
    console.log("bad has:", Object.hasOwn(badProxy, "x"));
} catch (e: any) {
    console.log("bad has:", e);
}
try {
    console.log("bad enum:", Object.prototype.propertyIsEnumerable.call(badProxy, "x"));
} catch (e: any) {
    console.log("bad enum:", e);
}

const revoked = Proxy.revocable({ value: 1 } as any, {});
revoked.revoke();
try {
    console.log("revoked has:", Object.hasOwn(revoked.proxy as any, "value"));
} catch (e: any) {
    console.log("revoked has:", e);
}
try {
    console.log("revoked enum:", Object.prototype.propertyIsEnumerable.call(revoked.proxy as any, "value"));
} catch (e: any) {
    console.log("revoked enum:", e);
}
