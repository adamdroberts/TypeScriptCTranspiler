const marks: string[] = [];
const events: string[] = [];

function mark(label: string): string {
    marks.push(label);
    return label;
}

function ownKeys(target: any): any {
    events.push("ownKeys:" + marks.join(","));
    return ["a", "hidden", "b"];
}

function getOwnPropertyDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop) + ":" + marks.join(","));
    if (prop === "a") return { value: "A", enumerable: true, configurable: true };
    if (prop === "b") return { value: "B", enumerable: true, configurable: true };
    if (prop === "hidden") return { value: "H", enumerable: false, configurable: true };
    return undefined;
}

function get(target: any, prop: any, receiver: any): any {
    events.push("get:" + String(prop) + ":" + marks.join(","));
    return String(prop).toUpperCase();
}

const proxy: any = new Proxy({}, {
    ownKeys: ownKeys as any,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor as any,
    get: get as any,
});

const keys: any = Object.keys(proxy, mark("keys"));
const values: any = Object.values(proxy, mark("values"));
const entries: any = Object.entries(proxy, mark("entries"));
const own: any = Reflect.ownKeys(proxy, mark("reflect"));

console.log("keys:", keys.join(","));
console.log("values:", values.join(","));
console.log("entries:", entries[0].join(":") + "," + entries[1].join(":"));
console.log("own:", own.join(","));
console.log("marks:", marks.join(","));
console.log("events:", events.join("|"));
