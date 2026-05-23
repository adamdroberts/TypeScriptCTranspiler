const baseProto: any = { marker: "base" };
const otherProto: any = { marker: "other" };

try {
    console.log("null target:", Object.setPrototypeOf(null as any, baseProto));
} catch (e: any) {
    console.log("null target:", e);
}

try {
    console.log("bad proto primitive:", Object.setPrototypeOf(1 as any, 2 as any));
} catch (e: any) {
    console.log("bad proto primitive:", e);
}

console.log("primitive target:", Object.setPrototypeOf(1 as any, baseProto));

const locked: any = {};
Object.preventExtensions(locked);
try {
    console.log("locked change:", Object.setPrototypeOf(locked, otherProto) === locked);
} catch (e: any) {
    console.log("locked change:", e);
}
console.log("locked same:", Object.setPrototypeOf(locked, Object.getPrototypeOf(locked)) === locked);

let called: any = "no";
function trueSetPrototype(target: any, proto: any): boolean {
    called = "yes";
    return true;
}
const proxy: any = new Proxy({}, { setPrototypeOf: trueSetPrototype as any });
try {
    console.log("proxy bad proto:", Object.setPrototypeOf(proxy, 1 as any) === proxy, called);
} catch (e: any) {
    console.log("proxy bad proto:", e, called);
}

function falseSetPrototype(target: any, proto: any): boolean {
    return false;
}
const falseProxy: any = new Proxy({}, { setPrototypeOf: falseSetPrototype as any });
try {
    console.log("proxy false:", Object.setPrototypeOf(falseProxy, baseProto) === falseProxy);
} catch (e: any) {
    console.log("proxy false:", e);
}
console.log("reflect false:", Reflect.setPrototypeOf(falseProxy, baseProto));
