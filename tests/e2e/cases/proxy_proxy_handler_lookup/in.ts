const events: string[] = [];

function note(label: string, value: any): any {
    events.push(label);
    return value;
}

function targetGet(target: any, prop: any, receiver: any): any {
    events.push("targetGet:" + String(prop));
    return Reflect.get(target, prop, receiver);
}

function targetOwnKeys(target: any): any {
    events.push("targetOwnKeys");
    return ["a", "hidden"];
}

function targetDescriptor(target: any, prop: any): any {
    events.push("targetDesc:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function handlerGet(target: any, prop: any, receiver: any): any {
    events.push("handlerGet:" + String(prop) + ":" + String(receiver === handlerProxy));
    return Reflect.get(target, prop, receiver);
}

let handlerProxy: any = undefined;
const handlerTarget: any = {
    get: targetGet as any,
    ownKeys: targetOwnKeys as any,
    getOwnPropertyDescriptor: targetDescriptor as any,
};
handlerProxy = new Proxy(handlerTarget, { get: handlerGet as any });

const target: any = { a: "A" };
Object.defineProperty(target, "hidden", {
    value: "H",
    enumerable: false,
    configurable: true,
});

const proxy: any = new Proxy(target, handlerProxy);

console.log("get:", Reflect.get(proxy, note("getKey", "a"), note("getReceiver", {})));
console.log("keys:", Object.keys(proxy).join(","));
console.log("events:", events.join("|"));
