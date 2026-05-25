function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function trapPreventExtensions(target: any): boolean {
    return Reflect.preventExtensions(target);
}

function trapOwnKeys(target: any): string[] {
    return ["a"];
}

function trapDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function falseDefine(target: any, prop: any, desc: any): boolean {
    return false;
}

const sealTarget: any = { a: 1 };
const sealProxy: any = new Proxy(sealTarget, {
    preventExtensions: trapPreventExtensions as any,
    ownKeys: trapOwnKeys as any,
    defineProperty: falseDefine as any,
});
report("object seal", (): any => Object.seal(sealProxy) === sealProxy);
console.log("seal target:", Object.isExtensible(sealTarget), Object.getOwnPropertyDescriptor(sealTarget, "a").configurable);

const freezeTarget: any = { a: 1 };
const freezeProxy: any = new Proxy(freezeTarget, {
    preventExtensions: trapPreventExtensions as any,
    ownKeys: trapOwnKeys as any,
    getOwnPropertyDescriptor: trapDescriptor as any,
    defineProperty: falseDefine as any,
});
report("object freeze", (): any => Object.freeze(freezeProxy) === freezeProxy);
const freezeDesc = Object.getOwnPropertyDescriptor(freezeTarget, "a");
console.log("freeze target:", Object.isExtensible(freezeTarget), freezeDesc.configurable, freezeDesc.writable);
