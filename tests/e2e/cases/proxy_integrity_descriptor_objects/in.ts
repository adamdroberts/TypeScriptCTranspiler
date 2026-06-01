function arrayDescriptor(value: any, writable: boolean, configurable: boolean): any {
    const desc: any = [];
    desc.value = value;
    desc.writable = writable;
    desc.enumerable = true;
    desc.configurable = configurable;
    return desc;
}

function functionDescriptor(value: any, writable: boolean, configurable: boolean): any {
    const desc: any = function descriptor(): void {};
    desc.value = value;
    desc.writable = writable;
    desc.enumerable = true;
    desc.configurable = configurable;
    return desc;
}

function trapOwnKeys(target: any): any {
    return Reflect.ownKeys(target) as any;
}

const frozenStateTarget: any = {};
Object.defineProperty(frozenStateTarget, "a", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
Object.preventExtensions(frozenStateTarget);
const frozenStateProxy: any = new Proxy(frozenStateTarget, {
    isExtensible(target: any): boolean {
        return Reflect.isExtensible(target);
    },
    ownKeys: trapOwnKeys as any,
    getOwnPropertyDescriptor(_target: any, prop: any): any {
        return prop === "a" ? arrayDescriptor(1, false, false) : undefined;
    },
});
console.log("array descriptor state:", Object.isSealed(frozenStateProxy), Object.isFrozen(frozenStateProxy));

const freezeTarget: any = { a: 2 };
const freezeProxy: any = new Proxy(freezeTarget, {
    preventExtensions(target: any): boolean {
        return Reflect.preventExtensions(target);
    },
    ownKeys: trapOwnKeys as any,
    getOwnPropertyDescriptor(_target: any, prop: any): any {
        return prop === "a" ? functionDescriptor(2, true, true) : undefined;
    },
});
console.log("function descriptor freeze:", Object.freeze(freezeProxy) === freezeProxy, Object.isFrozen(freezeTarget));
const freezeDesc: any = Object.getOwnPropertyDescriptor(freezeTarget, "a");
console.log("function descriptor flags:", freezeDesc.configurable, freezeDesc.writable);
