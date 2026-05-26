const events: string[] = [];

let proxy: any = undefined;
const explicitReceiver: any = { marker: "explicit" };

function getTrap(target: any, prop: any, receiver: any): any {
    const marker = receiver === proxy ? "proxy" : String(receiver.marker);
    events.push("get:" + String(prop) + ":" + String(receiver === proxy) + ":" + marker);
    return Reflect.get(target, prop, receiver);
}

function setTrap(target: any, prop: any, value: any, receiver: any): boolean {
    const marker = receiver === proxy ? "proxy" : String(receiver.marker);
    events.push("set:" + String(prop) + ":" + String(value) + ":" + String(receiver === proxy) + ":" + marker);
    if (receiver !== proxy) {
        receiver[prop] = value;
    }
    return true;
}

const target: any = { marker: "target", a: "A" };
proxy = new Proxy(target, {
    get: getTrap as any,
    set: setTrap as any,
});

console.log("direct get:", proxy.a);
console.log("reflect get:", Reflect.get(proxy, "a", explicitReceiver));
console.log("direct set:", (proxy.b = "B"), target.b);
console.log("reflect set:", Reflect.set(proxy, "c", "C", explicitReceiver), explicitReceiver.c, target.c);
console.log("events:", events.join("|"));
