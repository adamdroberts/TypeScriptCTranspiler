const events: string[] = [];

function trapPreventExtensions(target: any): boolean {
    events.push("prevent");
    return Reflect.preventExtensions(target);
}

function trapOwnKeys(target: any): any {
    events.push("ownKeys");
    return Reflect.ownKeys(target) as any;
}

function trapDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop));
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function trapDefine(target: any, prop: any, desc: any): boolean {
    const writable = "writable" in desc ? String(desc.writable) : "absent";
    events.push("define:" + String(prop) + ":" + String(desc.configurable) + ":" + writable);
    if ("writable" in desc) {
        return Reflect.defineProperty(target, "a", { configurable: false, writable: false });
    }
    return Reflect.defineProperty(target, "a", { configurable: false });
}

function makeHandler(): any {
    return {
        preventExtensions: trapPreventExtensions as any,
        ownKeys: trapOwnKeys as any,
        getOwnPropertyDescriptor: trapDescriptor as any,
        defineProperty: trapDefine as any,
    };
}

const sealTarget: any = { a: 1 };
const sealProxy: any = new Proxy(sealTarget, makeHandler());
console.log("seal result:", Object.seal(sealProxy) === sealProxy, Object.isSealed(sealTarget), Object.isExtensible(sealTarget));
const sealDesc = Object.getOwnPropertyDescriptor(sealTarget, "a");
console.log("seal desc:", sealDesc.configurable, sealDesc.writable);

const freezeTarget: any = { a: 1 };
const freezeProxy: any = new Proxy(freezeTarget, makeHandler());
console.log("freeze result:", Object.freeze(freezeProxy) === freezeProxy, Object.isFrozen(freezeTarget), Object.isExtensible(freezeTarget));
const freezeDesc = Object.getOwnPropertyDescriptor(freezeTarget, "a");
console.log("freeze desc:", freezeDesc.configurable, freezeDesc.writable);

console.log("events:", events.join("|"));
