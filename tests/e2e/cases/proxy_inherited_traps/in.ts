const events: string[] = [];

const objectTrapProto: any = {
    get: function(this: any, target: any, prop: any, receiver: any): any {
        events.push("get:" + String(this.marker));
        if (prop === "virtual") return "inherited";
        return Reflect.get(target, prop, receiver);
    },
    set: function(this: any, target: any, prop: any, value: any, receiver: any): boolean {
        events.push("set:" + String(this.marker));
        target[prop] = value + ":set";
        return true;
    },
    has: function(this: any, target: any, prop: any): boolean {
        events.push("has:" + String(this.marker));
        return prop === "virtual" || Reflect.has(target, prop);
    },
};

const objectHandler: any = Object.create(objectTrapProto);
objectHandler.marker = "object-handler";

const target: any = { real: "value" };
const proxy: any = new Proxy(target, objectHandler);

console.log("get:", proxy.virtual, proxy.real);
proxy.next = "value";
console.log("set:", target.next);
console.log("has:", "virtual" in proxy, "real" in proxy);

function Target(this: any, value: any): void {
    this.value = value;
}

let callableProxy: any = undefined;
const callableTrapProto: any = {
    apply: function(this: any, target: any, thisArg: any, args: any): any {
        events.push("apply:" + String(this.marker));
        return "apply:" + args[0];
    },
    construct: function(this: any, target: any, args: any, newTarget: any): any {
        events.push("construct:" + String(this.marker));
        return { built: args[0], newTargetIsProxy: newTarget === callableProxy };
    },
};

const callableHandler: any = Object.create(callableTrapProto);
callableHandler.marker = "callable-handler";
callableProxy = new Proxy(Target as any, callableHandler);

console.log("apply:", Reflect.apply(callableProxy, undefined, ["x"]));
const built: any = new callableProxy("y");
console.log("construct:", built.built, built.newTargetIsProxy);
console.log("events:", events.join("|"));
