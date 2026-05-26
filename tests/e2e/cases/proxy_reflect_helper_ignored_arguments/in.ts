const marks: string[] = [];
const events: string[] = [];

function mark(label: string): string {
    marks.push(label);
    return label;
}

const baseProto: any = { marker: "base" };
const nextProto: any = { marker: "next" };
const target: any = { value: 1 };
Object.setPrototypeOf(target, baseProto);

const handler: any = {
    getPrototypeOf: function(target: any): any {
        events.push("getProto");
        return Reflect.getPrototypeOf(target);
    },
    setPrototypeOf: function(target: any, proto: any): boolean {
        events.push("setProto:" + proto.marker);
        return Reflect.setPrototypeOf(target, proto);
    },
    isExtensible: function(target: any): boolean {
        events.push("isExtensible");
        return Reflect.isExtensible(target);
    },
    preventExtensions: function(target: any): boolean {
        events.push("preventExtensions");
        return Reflect.preventExtensions(target);
    },
};

const proxy: any = new Proxy(target, handler);

console.log("proto:", Reflect.getPrototypeOf(proxy, mark("g")).marker);
console.log("set:", Reflect.setPrototypeOf(proxy, nextProto, mark("s")), Object.getPrototypeOf(target).marker);
console.log("ext:", Reflect.isExtensible(proxy, mark("e")));
console.log("prevent:", Reflect.preventExtensions(proxy, mark("p")), Object.isExtensible(target));
console.log("marks:", marks.join(","));
console.log("events:", events.join("|"));
