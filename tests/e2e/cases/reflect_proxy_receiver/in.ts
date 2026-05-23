const events: string[] = [];
const target: any = {};

function getMarker(this: any): any {
    return "get:" + this.marker;
}

function setMarker(this: any, value: any): void {
    this.marker = "set:" + value;
}

Object.defineProperty(target, "markerValue", {
    get: getMarker,
    set: setMarker,
    enumerable: true,
    configurable: true,
});

function getTrap(target: any, prop: any, receiver: any): any {
    events.push("get:" + String(prop) + ":" + String(receiver.marker));
    return Reflect.get(target, prop, receiver);
}

function setTrap(target: any, prop: any, value: any, receiver: any): boolean {
    events.push("set:" + String(prop) + ":" + String(value) + ":" + String(receiver.marker));
    return Reflect.set(target, prop, value, receiver);
}

const proxy: any = new Proxy(target, {
    get: getTrap as any,
    set: setTrap as any,
});
const receiver: any = { marker: "receiver" };

console.log("get:", Reflect.get(proxy, "markerValue", receiver));
console.log("set:", Reflect.set(proxy, "markerValue", "next", receiver), target.marker, receiver.marker);
console.log("events:", events.join("|"));
