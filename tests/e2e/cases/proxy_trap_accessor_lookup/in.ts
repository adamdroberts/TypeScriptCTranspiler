const events: string[] = [];

function getTrap(target: any, prop: any, receiver: any): any {
    events.push("getTrap:" + String(prop));
    return Reflect.get(target, prop, receiver);
}

function ownKeysTrap(target: any): any {
    events.push("ownKeysTrap");
    return ["a", "hidden"];
}

function descriptorTrap(target: any, prop: any): any {
    events.push("descTrap:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function getGetter(this: any): any {
    events.push("trapGetter:get:" + String(this.marker));
    return getTrap as any;
}

function ownKeysGetter(this: any): any {
    events.push("trapGetter:ownKeys:" + String(this.marker));
    return ownKeysTrap as any;
}

function descriptorGetter(this: any): any {
    events.push("trapGetter:desc:" + String(this.marker));
    return descriptorTrap as any;
}

const target: any = { a: "A" };
Object.defineProperty(target, "hidden", {
    value: "H",
    enumerable: false,
    configurable: true,
});

const handler: any = { marker: "handler" };
Object.defineProperty(handler, "get", {
    get: getGetter as any,
    enumerable: true,
    configurable: true,
});
Object.defineProperty(handler, "ownKeys", {
    get: ownKeysGetter as any,
    enumerable: true,
    configurable: true,
});
Object.defineProperty(handler, "getOwnPropertyDescriptor", {
    get: descriptorGetter as any,
    enumerable: true,
    configurable: true,
});

const proxy: any = new Proxy(target, handler);

console.log("get:", proxy.a);
console.log("keys:", Object.keys(proxy).join(","));
console.log("events:", events.join("|"));
