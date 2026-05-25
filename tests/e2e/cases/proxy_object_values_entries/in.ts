const events: string[] = [];
const target: any = {};

function ownKeys(target: any): any {
    events.push("ownKeys");
    return ["visible", "hidden", "skip"];
}

function getOwnPropertyDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop));
    if (prop === "visible") {
        return { value: "descriptor", writable: true, enumerable: true, configurable: true };
    }
    if (prop === "hidden") {
        return { value: "hidden", writable: true, enumerable: false, configurable: true };
    }
    return undefined;
}

function get(target: any, prop: any, receiver: any): any {
    events.push("get:" + String(prop));
    return "value:" + String(prop);
}

const proxy: any = new Proxy(target, {
    ownKeys: ownKeys as any,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor as any,
    get: get as any,
});

const values: any = Object.values(proxy);
const entries: any = Object.entries(proxy);

console.log("values:", values.join("|"));
console.log("entries:", entries[0][0] + ":" + entries[0][1], entries.length);
console.log("events:", events.join("|"));
