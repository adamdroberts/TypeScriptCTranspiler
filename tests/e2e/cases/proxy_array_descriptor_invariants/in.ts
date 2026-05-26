const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function hideDescriptor(target: any, prop: any): any {
    events.push("hide:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, "__missing__");
}

function dataDescriptor(target: any, prop: any): any {
    events.push("data:" + String(prop));
    return { value: "new", writable: true, enumerable: true, configurable: true };
}

function configurableLength(target: any, prop: any): any {
    events.push("config length:" + String(prop));
    return { value: target.length, writable: true, enumerable: false, configurable: true };
}

function writableFrozenLength(target: any, prop: any): any {
    events.push("writable frozen length:" + String(prop));
    return { value: target.length, writable: true, enumerable: false, configurable: false };
}

function realDescriptor(target: any, prop: any): any {
    events.push("real:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

const hideLengthProxy: any = new Proxy(["x"], { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide length:", Reflect.getOwnPropertyDescriptor(hideLengthProxy, "length", mark("hide length"))?.value);
} catch (err: any) {
    console.log("hide length:", err);
}

const sealedTarget: any = ["s"];
Object.seal(sealedTarget);
const hideSealedProxy: any = new Proxy(sealedTarget, { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide sealed:", Object.getOwnPropertyDescriptor(hideSealedProxy, "0", mark("hide sealed"))?.value);
} catch (err: any) {
    console.log("hide sealed:", err);
}

const closedTarget: any = ["c"];
Object.preventExtensions(closedTarget);
const newClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: dataDescriptor as any });
try {
    console.log("new closed:", Reflect.getOwnPropertyDescriptor(newClosedProxy, "2", mark("new closed"))?.value);
} catch (err: any) {
    console.log("new closed:", err);
}

const lengthConfigProxy: any = new Proxy(["l"], { getOwnPropertyDescriptor: configurableLength as any });
try {
    console.log("length configurable:", Object.getOwnPropertyDescriptor(lengthConfigProxy, "length", mark("length configurable"))?.configurable);
} catch (err: any) {
    console.log("length configurable:", err);
}

const frozenTarget: any = ["f"];
Object.freeze(frozenTarget);
const frozenLengthProxy: any = new Proxy(frozenTarget, { getOwnPropertyDescriptor: writableFrozenLength as any });
try {
    console.log("frozen length writable:", Reflect.getOwnPropertyDescriptor(frozenLengthProxy, "length", mark("frozen length writable"))?.writable);
} catch (err: any) {
    console.log("frozen length writable:", err);
}

const realProxy: any = new Proxy(frozenTarget, { getOwnPropertyDescriptor: realDescriptor as any });
const real = Reflect.getOwnPropertyDescriptor(realProxy, "0", mark("real frozen"));
console.log("real frozen:", real.value, real.writable, real.configurable);
console.log("events:", events.join("|"));
