const events: string[] = [];

const target: any = { a: "A", b: "B", skip: undefined };
Object.defineProperty(target, "hidden", { value: "H", enumerable: false, configurable: true });

function ownKeys(t: any): any {
    events.push("ownKeys");
    return ["b", "a", "skip", "hidden"];
}

function getOwnPropertyDescriptor(t: any, key: any): any {
    events.push("desc:" + String(key));
    if (key === "hidden") return { value: "H", enumerable: false, configurable: true };
    return Object.getOwnPropertyDescriptor(t, key);
}

function get(t: any, key: any): any {
    events.push("get:" + String(key));
    return t[String(key)];
}

const proxy: any = new Proxy(target, {
    ownKeys: ownKeys as any,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor as any,
    get: get as any,
});

const arrayProxy: any = new Proxy(["x", "y"], {
    get(t: any, key: any): any {
        events.push("array:" + String(key));
        return String(key) === "0" ? "X" : t[String(key)];
    },
});

console.log("object:", JSON.stringify(proxy));
console.log("array:", JSON.stringify(arrayProxy));
console.log("events:", events.join("|"));
