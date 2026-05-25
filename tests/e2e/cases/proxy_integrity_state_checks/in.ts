function trapPreventExtensions(target: any): boolean {
    return Reflect.preventExtensions(target);
}

function trapOwnKeys(target: any): any {
    return Reflect.ownKeys(target) as any;
}

function trapDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function trapDefine(target: any, prop: any, desc: any): boolean {
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
Object.seal(sealProxy);
console.log("seal proxy:", Object.isSealed(sealProxy), Object.isFrozen(sealProxy));

const freezeTarget: any = { a: 1 };
const freezeProxy: any = new Proxy(freezeTarget, makeHandler());
Object.freeze(freezeProxy);
console.log("freeze proxy:", Object.isSealed(freezeProxy), Object.isFrozen(freezeProxy));
