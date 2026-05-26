const events: string[] = [];

function falseHas(target: any, prop: any): boolean {
    events.push("has:" + String(prop));
    return false;
}

function trueDelete(target: any, prop: any): boolean {
    events.push("delete:" + String(prop));
    return true;
}

const fixedHasTarget: any = {};
Object.defineProperty(fixedHasTarget, "fixed", {
    value: 1,
    enumerable: true,
    configurable: false,
    writable: true,
});
const fixedHasProxy: any = new Proxy(fixedHasTarget, { has: falseHas as any });
try {
    console.log("has fixed:", "fixed" in fixedHasProxy);
} catch (e: any) {
    console.log("has fixed:", e);
}

const closedHasTarget: any = { open: 2 };
Object.preventExtensions(closedHasTarget);
const closedHasProxy: any = new Proxy(closedHasTarget, { has: falseHas as any });
try {
    console.log("has closed:", "open" in closedHasProxy);
} catch (e: any) {
    console.log("has closed:", e);
}

const fixedDeleteTarget: any = {};
Object.defineProperty(fixedDeleteTarget, "fixed", {
    value: 3,
    enumerable: true,
    configurable: false,
    writable: true,
});
const fixedDeleteProxy: any = new Proxy(fixedDeleteTarget, { deleteProperty: trueDelete as any });
try {
    console.log("delete fixed:", delete fixedDeleteProxy.fixed);
} catch (e: any) {
    console.log("delete fixed:", e);
}

const closedDeleteTarget: any = { open: 4 };
Object.preventExtensions(closedDeleteTarget);
const closedDeleteProxy: any = new Proxy(closedDeleteTarget, { deleteProperty: trueDelete as any });
try {
    console.log("delete closed:", delete closedDeleteProxy.open);
} catch (e: any) {
    console.log("delete closed:", e);
}

const looseTarget: any = { open: 5 };
const looseProxy: any = new Proxy(looseTarget, {
    has: falseHas as any,
    deleteProperty: trueDelete as any,
});
console.log("loose has:", "open" in looseProxy);
console.log("loose delete:", delete looseProxy.open, looseTarget.open);
console.log("events:", events.join("|"));
