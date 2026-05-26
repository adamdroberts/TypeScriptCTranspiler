const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function otherPrototype(target: any): any {
    events.push("other proto trap:" + target.length);
    return { marker: "other" };
}

function trueSetPrototype(target: any, proto: any): boolean {
    events.push("set proto:" + proto.marker);
    return true;
}

const baseProto: any = { marker: "base" };
const nextProto: any = { marker: "next" };

const forwardedTarget: any = ["x"];
const forwardedProxy: any = new Proxy(forwardedTarget, {});
console.log("forward default:", typeof Object.getPrototypeOf(forwardedProxy, mark("forward default")));
console.log("forward set:", Object.setPrototypeOf(forwardedProxy, nextProto, mark("forward set")) === forwardedProxy, Object.getPrototypeOf(forwardedTarget).marker);

const closedGetTarget: any = ["g"];
Object.setPrototypeOf(closedGetTarget, baseProto);
Object.preventExtensions(closedGetTarget);
const closedGetProxy: any = new Proxy(closedGetTarget, { getPrototypeOf: otherPrototype as any });
try {
    console.log("get closed:", Object.getPrototypeOf(closedGetProxy, mark("get closed")).marker);
} catch (err: any) {
    console.log("get closed:", err);
}

const exactGetProxy: any = new Proxy(closedGetTarget, { getPrototypeOf: function(target: any): any { events.push("base proto trap:" + target.length); return baseProto; } as any });
console.log("get exact:", Object.getPrototypeOf(exactGetProxy, mark("get exact")).marker);

const closedSetTarget: any = ["s"];
Object.setPrototypeOf(closedSetTarget, baseProto);
Object.preventExtensions(closedSetTarget);
const closedSetProxy: any = new Proxy(closedSetTarget, { setPrototypeOf: trueSetPrototype as any });
try {
    console.log("set closed:", Reflect.setPrototypeOf(closedSetProxy, nextProto, mark("set closed")));
} catch (err: any) {
    console.log("set closed:", err);
}
console.log("set same:", Reflect.setPrototypeOf(closedSetProxy, baseProto, mark("set same")));
console.log("events:", events.join("|"));
