const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function falseHas(target: any, prop: any): boolean {
    events.push("has:" + String(prop));
    return false;
}

function trueDelete(target: any, prop: any): boolean {
    events.push("delete:" + String(prop));
    return true;
}

const lengthHasProxy: any = new Proxy(["a"], { has: falseHas as any });
try {
    console.log("has length:", "length" in lengthHasProxy);
} catch (err: any) {
    console.log("has length:", err);
}

const sealedHasTarget: any = ["s"];
Object.seal(sealedHasTarget);
const sealedHasProxy: any = new Proxy(sealedHasTarget, { has: falseHas as any });
try {
    console.log("has sealed:", "0" in sealedHasProxy);
} catch (err: any) {
    console.log("has sealed:", err);
}

const closedHasTarget: any = ["c"];
Object.preventExtensions(closedHasTarget);
const closedHasProxy: any = new Proxy(closedHasTarget, { has: falseHas as any });
try {
    console.log("has closed:", "0" in closedHasProxy);
} catch (err: any) {
    console.log("has closed:", err);
}

const lengthDeleteProxy: any = new Proxy(["d"], { deleteProperty: trueDelete as any });
try {
    console.log("delete length:", Reflect.deleteProperty(lengthDeleteProxy, "length", mark("delete length")));
} catch (err: any) {
    console.log("delete length:", err);
}

const sealedDeleteTarget: any = ["x"];
Object.seal(sealedDeleteTarget);
const sealedDeleteProxy: any = new Proxy(sealedDeleteTarget, { deleteProperty: trueDelete as any });
try {
    console.log("delete sealed:", Reflect.deleteProperty(sealedDeleteProxy, "0", mark("delete sealed")));
} catch (err: any) {
    console.log("delete sealed:", err);
}

const closedDeleteTarget: any = ["z"];
Object.preventExtensions(closedDeleteTarget);
const closedDeleteProxy: any = new Proxy(closedDeleteTarget, { deleteProperty: trueDelete as any });
try {
    console.log("delete closed:", Reflect.deleteProperty(closedDeleteProxy, "0", mark("delete closed")));
} catch (err: any) {
    console.log("delete closed:", err);
}

console.log("events:", events.join("|"));
