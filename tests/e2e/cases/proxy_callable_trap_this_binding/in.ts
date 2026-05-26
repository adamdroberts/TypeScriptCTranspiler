const events: string[] = [];

function trapTarget(): any {
    return undefined;
}

function applyGet(target: any, thisArg: any, args: any): any {
    events.push("get:" + String(thisArg.marker) + ":" + String(args.length));
    return "value";
}

function applyHas(target: any, thisArg: any, args: any): any {
    events.push("has:" + String(thisArg.marker) + ":" + String(args.length));
    return true;
}

function applyDelete(target: any, thisArg: any, args: any): any {
    events.push("delete:" + String(thisArg.marker) + ":" + String(args.length));
    return true;
}

function applyOwnKeys(target: any, thisArg: any, args: any): any {
    events.push("ownKeys:" + String(thisArg.marker) + ":" + String(args.length));
    return ["a"];
}

function applyDescriptor(target: any, thisArg: any, args: any): any {
    events.push("desc:" + String(thisArg.marker) + ":" + String(args.length));
    return {
        value: "A",
        enumerable: true,
        configurable: true,
    };
}

const target: any = {};
const handler: any = {
    marker: "handler",
    get: new Proxy(trapTarget as any, { apply: applyGet as any }),
    has: new Proxy(trapTarget as any, { apply: applyHas as any }),
    deleteProperty: new Proxy(trapTarget as any, { apply: applyDelete as any }),
    ownKeys: new Proxy(trapTarget as any, { apply: applyOwnKeys as any }),
    getOwnPropertyDescriptor: new Proxy(trapTarget as any, { apply: applyDescriptor as any }),
};

const proxy: any = new Proxy(target, handler);

console.log("get:", proxy.a);
console.log("has:", "a" in proxy);
console.log("delete:", delete proxy.a);
console.log("keys:", Object.keys(proxy).join(","));
console.log("events:", events.join("|"));
