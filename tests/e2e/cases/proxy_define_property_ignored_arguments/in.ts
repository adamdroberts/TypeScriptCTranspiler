const marks: string[] = [];
const events: string[] = [];

function mark(label: string): string {
    marks.push(label);
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
        marks.join(","),
    );
    return Reflect.defineProperty(target, prop, desc);
}

const target: any = {};
const proxy: any = new Proxy(target, { defineProperty: defineProperty as any });

console.log("object:", Object.defineProperty(proxy, "a", {
    value: "A",
    enumerable: true,
    configurable: true,
    writable: true,
}, mark("object")) === proxy, target.a, Object.keys(target).join(","));

console.log("reflect:", Reflect.defineProperty(proxy, "b", {
    value: "B",
    enumerable: false,
    configurable: true,
    writable: true,
}, mark("reflect")), target.b, Object.getOwnPropertyNames(target).join(","));

console.log("marks:", marks.join(","));
console.log("events:", events.join("|"));
