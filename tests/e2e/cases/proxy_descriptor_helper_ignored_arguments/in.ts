const marks: string[] = [];
const events: string[] = [];

function mark(label: string): string {
    marks.push(label);
    return label;
}

const target: any = {};
Object.defineProperty(target, "a", {
    value: "A",
    enumerable: true,
    configurable: true,
});
Object.defineProperty(target, "b", {
    value: "B",
    enumerable: false,
    configurable: true,
});

function getOwnPropertyDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop) + ":" + marks.join(","));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

const proxy: any = new Proxy(target, { getOwnPropertyDescriptor: getOwnPropertyDescriptor as any });

const objectDesc: any = Object.getOwnPropertyDescriptor(proxy, "a", mark("object"));
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(proxy, "b", mark("reflect"));

console.log("object:", objectDesc.value, objectDesc.enumerable);
console.log("reflect:", reflectDesc.value, reflectDesc.enumerable);
console.log("marks:", marks.join(","));
console.log("events:", events.join("|"));
