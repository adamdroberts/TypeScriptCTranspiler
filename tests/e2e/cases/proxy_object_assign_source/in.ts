const events: string[] = [];

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

function set(target: any, prop: any, value: any, receiverArg: any): boolean {
    events.push("set:" + String(prop) + ":" + String(value) + ":" + String(receiverArg === targetProxy));
    target[prop] = value;
    return true;
}

const source: any = new Proxy({}, {
    ownKeys: ownKeys as any,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor as any,
    get: get as any,
});

const receiver: any = {};
let targetProxy: any;
targetProxy = new Proxy(receiver, {
    set: set as any,
});

const result: any = Object.assign(targetProxy, source);

console.log("same:", result === targetProxy);
console.log("target:", receiver.visible, Object.hasOwn(receiver, "hidden"), Object.hasOwn(receiver, "skip"));
console.log("events:", events.join("|"));
