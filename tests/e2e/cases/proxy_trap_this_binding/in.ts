const events: string[] = [];

function record(name: string, self: any, handler: any): void {
    events.push(name + ":" + String(self === handler));
}

const target: any = { a: 1 };
Object.defineProperty(target, "hidden", {
    value: 2,
    writable: true,
    enumerable: true,
    configurable: true,
});

const handler: any = {
    get: function(this: any, target: any, prop: any, receiver: any): any {
        record("get", this, handler);
        return Reflect.get(target, prop, receiver);
    },
    set: function(this: any, target: any, prop: any, value: any, receiver: any): boolean {
        record("set", this, handler);
        target[prop] = value;
        return true;
    },
    has: function(this: any, target: any, prop: any): boolean {
        record("has", this, handler);
        return Reflect.has(target, prop);
    },
    deleteProperty: function(this: any, target: any, prop: any): boolean {
        record("delete", this, handler);
        return Reflect.deleteProperty(target, prop);
    },
    defineProperty: function(this: any, target: any, prop: any, desc: any): boolean {
        record("define", this, handler);
        return Reflect.defineProperty(target, prop, desc);
    },
    getOwnPropertyDescriptor: function(this: any, target: any, prop: any): any {
        record("getOwnPropertyDescriptor", this, handler);
        return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    ownKeys: function(this: any, target: any): any {
        record("ownKeys", this, handler);
        return Reflect.ownKeys(target);
    },
    getPrototypeOf: function(this: any, target: any): any {
        record("getPrototypeOf", this, handler);
        return Reflect.getPrototypeOf(target);
    },
    setPrototypeOf: function(this: any, target: any, proto: any): boolean {
        record("setPrototypeOf", this, handler);
        return Reflect.setPrototypeOf(target, proto);
    },
    isExtensible: function(this: any, target: any): boolean {
        record("isExtensible", this, handler);
        return Reflect.isExtensible(target);
    },
    preventExtensions: function(this: any, target: any): boolean {
        record("preventExtensions", this, handler);
        return Reflect.preventExtensions(target);
    },
};

const proxy: any = new Proxy(target, handler);

console.log("get:", proxy.a);
proxy.b = 3;
console.log("has:", "a" in proxy);
console.log("delete:", delete proxy.b);
console.log("define:", Reflect.defineProperty(proxy, "c", { value: 4, enumerable: true, configurable: true }), target.c);
console.log("desc:", Object.getOwnPropertyDescriptor(proxy, "c").value);
console.log("keys:", Object.keys(proxy).join(","));

const proto: any = { marker: "proto" };
console.log("proto:", Object.setPrototypeOf(proxy, proto) === proxy, Object.getPrototypeOf(proxy).marker);
console.log("ext:", Object.isExtensible(proxy), Object.preventExtensions(proxy) === proxy, Object.isExtensible(target));

function ConstructTarget(this: any, value: any): void {
    this.value = value;
}

let ctorProxy: any = undefined;
const constructHandler: any = {
    apply: function(this: any, target: any, thisArg: any, args: any): any {
        record("apply", this, constructHandler);
        return "applied:" + args[0];
    },
    construct: function(this: any, target: any, args: any, newTarget: any): any {
        record("construct", this, constructHandler);
        return { built: args[0], newTargetIsProxy: newTarget === ctorProxy };
    },
};

ctorProxy = new Proxy(ConstructTarget as any, constructHandler);
console.log("apply:", Reflect.apply(ctorProxy, {}, ["x"]));
const built: any = new ctorProxy("y");
console.log("construct:", built.built, built.newTargetIsProxy);
console.log("events:", events.join("|"));
