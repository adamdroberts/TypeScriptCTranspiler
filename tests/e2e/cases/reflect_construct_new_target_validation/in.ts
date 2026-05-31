function Target(this: any): any {
    this.value = "target";
}

function Other(this: any): any {
    this.value = "other";
}

function trapConstruct(target: any, args: any, newTarget: any): any {
    return { reached: true };
}

const events: string[] = [];

function eventTrapConstruct(target: any, args: any, newTarget: any): any {
    events.push("construct trap");
    return { reached: true };
}

const target: any = Target as any;
const badNewTarget: any = { name: "bad" };

try {
    console.log("function bad:", Reflect.construct(target, [], badNewTarget));
} catch (e: any) {
    console.log("function bad:", e);
}

const proxy: any = new Proxy(Target as any, { construct: trapConstruct as any });
try {
    console.log("proxy bad:", Reflect.construct(proxy, [], badNewTarget));
} catch (e: any) {
    console.log("proxy bad:", e);
}

const valid: any = Reflect.construct(target, [], Other as any);
console.log("valid:", typeof valid, valid.value);

const accessorSource: any = {};
Object.defineProperty(accessorSource, "value", {
    get: function(): any {
        return 1;
    },
    set: function(value: any): void {
        events.push("set:" + value);
    },
});

const descriptor: any = Object.getOwnPropertyDescriptor(accessorSource, "value");
const getterProxy: any = new Proxy(descriptor.get, { construct: eventTrapConstruct as any });
try {
    console.log("getter target:", Reflect.construct(getterProxy, []));
} catch (e: any) {
    console.log("getter target:", e);
}

const setterProxy: any = new Proxy(descriptor.set, { construct: eventTrapConstruct as any });
try {
    console.log("setter target:", Reflect.construct(setterProxy, []));
} catch (e: any) {
    console.log("setter target:", e);
}

try {
    console.log("getter newTarget:", Reflect.construct(target, [], getterProxy));
} catch (e: any) {
    console.log("getter newTarget:", e);
}

console.log("events:" + events.join("|"));
