const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function wrongGet(target: any, prop: any, receiver: any): any {
    events.push("get:" + String(prop));
    return "wrong";
}

function undefinedGet(target: any, prop: any, receiver: any): any {
    events.push("undefined get:" + String(prop));
    return undefined;
}

function passGet(target: any, prop: any, receiver: any): any {
    events.push("pass get:" + String(prop));
    return Reflect.get(target, prop, receiver);
}

function returnsUndefined(): any {
    return undefined;
}

function storeIgnored(value: any): void {
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
    events.push("set:" + String(prop) + "=" + String(value));
    return true;
}

function trueDefine(target: any, prop: any, desc: any): boolean {
    events.push("define:" + String(prop));
    return true;
}

const fixedGetTarget: any = {};
Object.defineProperty(fixedGetTarget, "fixed", {
    value: "fixed",
    writable: false,
    enumerable: true,
    configurable: false,
});
const fixedGetProxy: any = new Proxy(fixedGetTarget, { get: wrongGet as any });
try {
    console.log("get fixed:", Reflect.get(fixedGetProxy, "fixed", fixedGetProxy, mark("get fixed")));
} catch (e: any) {
    console.log("get fixed:", e);
}

const getterlessTarget: any = {};
Object.defineProperty(getterlessTarget, "hidden", {
    set: storeIgnored as any,
    enumerable: true,
    configurable: false,
});
const getterlessProxy: any = new Proxy(getterlessTarget, { get: wrongGet as any });
try {
    console.log("get accessor:", Reflect.get(getterlessProxy, "hidden", getterlessProxy, mark("get accessor")));
} catch (e: any) {
    console.log("get accessor:", e);
}

const undefinedGetterProxy: any = new Proxy(getterlessTarget, { get: passGet as any });
console.log("get accessor ok:", String(Reflect.get(undefinedGetterProxy, "hidden", undefinedGetterProxy, mark("get accessor ok"))));

const fixedSetTarget: any = {};
Object.defineProperty(fixedSetTarget, "fixed", {
    value: "fixed",
    writable: false,
    enumerable: true,
    configurable: false,
});
const fixedSetProxy: any = new Proxy(fixedSetTarget, { set: trueSet as any });
try {
    console.log("set fixed:", Reflect.set(fixedSetProxy, "fixed", "changed", fixedSetProxy, mark("set fixed")));
} catch (e: any) {
    console.log("set fixed:", e);
}
console.log("set same:", Reflect.set(fixedSetProxy, "fixed", "fixed", fixedSetProxy, mark("set same")));

const setterlessTarget: any = {};
Object.defineProperty(setterlessTarget, "hidden", {
    get: returnsUndefined as any,
    enumerable: true,
    configurable: false,
});
const setterlessProxy: any = new Proxy(setterlessTarget, { set: trueSet as any });
try {
    console.log("set accessor:", Reflect.set(setterlessProxy, "hidden", "value", setterlessProxy, mark("set accessor")));
} catch (e: any) {
    console.log("set accessor:", e);
}

const closedTarget: any = {};
Object.preventExtensions(closedTarget);
const closedProxy: any = new Proxy(closedTarget, { defineProperty: trueDefine as any });
try {
    console.log("define closed:", Reflect.defineProperty(closedProxy, "x", { value: 1, configurable: true }, mark("define closed")));
} catch (e: any) {
    console.log("define closed:", e);
}

const newNonConfigProxy: any = new Proxy({}, { defineProperty: trueDefine as any });
try {
    console.log("define new fixed:", Reflect.defineProperty(newNonConfigProxy, "x", { value: 1, configurable: false }, mark("define new fixed")));
} catch (e: any) {
    console.log("define new fixed:", e);
}

const configurableTarget: any = {};
Object.defineProperty(configurableTarget, "x", {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true,
});
const configurableProxy: any = new Proxy(configurableTarget, { defineProperty: trueDefine as any });
try {
    console.log("define configurable fixed:", Reflect.defineProperty(configurableProxy, "x", { configurable: false }, mark("define configurable fixed")));
} catch (e: any) {
    console.log("define configurable fixed:", e);
}

const fixedDefineTarget: any = {};
Object.defineProperty(fixedDefineTarget, "x", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
const fixedDefineProxy: any = new Proxy(fixedDefineTarget, { defineProperty: trueDefine as any });
try {
    console.log("define fixed changed:", Reflect.defineProperty(fixedDefineProxy, "x", { value: 2 }, mark("define fixed changed")));
} catch (e: any) {
    console.log("define fixed changed:", e);
}
console.log("define fixed same:", Reflect.defineProperty(fixedDefineProxy, "x", { value: 1 }, mark("define fixed same")));

const accessorDefineTarget: any = {};
Object.defineProperty(accessorDefineTarget, "x", {
    get: returnsUndefined as any,
    enumerable: true,
    configurable: false,
});
const accessorDefineProxy: any = new Proxy(accessorDefineTarget, { defineProperty: trueDefine as any });
try {
    console.log("define accessor data:", Reflect.defineProperty(accessorDefineProxy, "x", { value: 1 }, mark("define accessor data")));
} catch (e: any) {
    console.log("define accessor data:", e);
}

console.log("events:", events.join("|"));
