let events: string[] = [];
let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

function defineProperty(target: any, prop: any, desc: any): boolean {
    events.push(
        "define:" +
            String(prop) +
            ":" +
            String(desc.value) +
            ":" +
            String(desc.enumerable) +
            ":" +
            String(desc.configurable) +
            ":" +
            String(desc.writable),
    );
    return Reflect.defineProperty(target, prop, desc);
}

const target: any = {};
const proxy: any = new Proxy(target, { defineProperty: defineProperty as any });
const descriptors: any = {};
descriptors.a = { value: "A", writable: true, enumerable: true, configurable: true };
descriptors.hidden = { value: "H", writable: false, enumerable: false, configurable: true };

console.log("same:", Object.defineProperties(proxy, descriptors, mark("x")) === proxy, marks);
console.log("events:", events.join("|"));
console.log(
    "target:",
    Object.keys(target).join(","),
    Object.getOwnPropertyNames(target).join(","),
    target.a,
    Object.getOwnPropertyDescriptor(target, "hidden").enumerable,
    Object.getOwnPropertyDescriptor(target, "hidden").writable,
);

events = [];
const badTarget: any = {};
const badProxy: any = new Proxy(badTarget, { defineProperty: defineProperty as any });
const badDescriptors: any = {};
badDescriptors.first = { value: "first", enumerable: true, configurable: true };
badDescriptors.bad = 1 as any;

try {
    console.log("bad:", Object.defineProperties(badProxy, badDescriptors) === badProxy);
} catch (e: any) {
    console.log("bad:", e, Object.keys(badTarget).join(","), events.join("|"));
}
