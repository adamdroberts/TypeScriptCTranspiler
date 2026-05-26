const events: string[] = [];

const metaTrapProto: any = {
    ownKeys: function(this: any, target: any): any {
        events.push("ownKeys:" + String(this.marker));
        return ["visible", "hidden", "base"];
    },
    getOwnPropertyDescriptor: function(this: any, target: any, prop: any): any {
        events.push("desc:" + String(this.marker) + ":" + String(prop));
        if (prop === "visible") {
            return { value: 1, writable: true, enumerable: true, configurable: true };
        }
        if (prop === "hidden") {
            return { value: "h", writable: false, enumerable: false, configurable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty: function(this: any, target: any, prop: any, desc: any): boolean {
        events.push("define:" + String(this.marker) + ":" + String(prop));
        return Reflect.defineProperty(target, prop, desc);
    },
    deleteProperty: function(this: any, target: any, prop: any): boolean {
        events.push("delete:" + String(this.marker) + ":" + String(prop));
        return Reflect.deleteProperty(target, prop);
    },
};

const metaHandler: any = Object.create(metaTrapProto);
metaHandler.marker = "meta-handler";

const metaTarget: any = { base: "b", drop: "remove" };
const metaProxy: any = new Proxy(metaTarget, metaHandler);
const descs: any = Object.getOwnPropertyDescriptors(metaProxy);

console.log("desc keys:", Object.keys(descs).join("|"));
console.log("visible:", descs.visible.value, descs.visible.enumerable);
console.log("hidden:", descs.hidden.value, descs.hidden.enumerable);
console.log("base:", descs.base.value, descs.base.enumerable);

console.log("define:", Reflect.defineProperty(metaProxy, "made", { value: "ok", enumerable: true, configurable: true }), metaTarget.made);
console.log("delete:", delete metaProxy.drop, "drop" in metaTarget);

const baseProto: any = { marker: "base" };
const nextProto: any = { marker: "next" };
const protoTrapProto: any = {
    getPrototypeOf: function(this: any, target: any): any {
        events.push("getPrototypeOf:" + String(this.marker));
        return Reflect.getPrototypeOf(target);
    },
    setPrototypeOf: function(this: any, target: any, proto: any): boolean {
        events.push("setPrototypeOf:" + String(this.marker));
        return Reflect.setPrototypeOf(target, proto);
    },
    isExtensible: function(this: any, target: any): boolean {
        events.push("isExtensible:" + String(this.marker));
        return Reflect.isExtensible(target);
    },
    preventExtensions: function(this: any, target: any): boolean {
        events.push("preventExtensions:" + String(this.marker));
        return Reflect.preventExtensions(target);
    },
};

const protoHandler: any = Object.create(protoTrapProto);
protoHandler.marker = "proto-handler";

const protoTarget: any = {};
Object.setPrototypeOf(protoTarget, baseProto);
const protoProxy: any = new Proxy(protoTarget, protoHandler);

console.log("proto before:", Object.getPrototypeOf(protoProxy).marker);
console.log("proto set:", Object.setPrototypeOf(protoProxy, nextProto) === protoProxy, Object.getPrototypeOf(protoTarget).marker);
console.log("ext before:", Object.isExtensible(protoProxy));
console.log("prevent:", Object.preventExtensions(protoProxy) === protoProxy, Object.isExtensible(protoTarget));
console.log("ext after:", Object.isExtensible(protoProxy));
console.log("events:", events.join("|"));
