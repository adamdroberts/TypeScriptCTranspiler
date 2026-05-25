function trapIsExtensible(target: any): boolean {
    return Reflect.isExtensible(target);
}

function trapOwnKeys(target: any): any {
    return Reflect.ownKeys(target) as any;
}

function trapDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

const configurableTarget: any = { a: 1 };
Object.preventExtensions(configurableTarget);
const configurableProxy: any = new Proxy(configurableTarget, {
    isExtensible: trapIsExtensible as any,
    ownKeys: trapOwnKeys as any,
    getOwnPropertyDescriptor: trapDescriptor as any,
});
console.log("configurable:", Object.isSealed(configurableProxy), Object.isFrozen(configurableProxy));

const writableTarget: any = {};
Object.defineProperty(writableTarget, "a", {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: false,
});
Object.preventExtensions(writableTarget);
const writableProxy: any = new Proxy(writableTarget, {
    isExtensible: trapIsExtensible as any,
    ownKeys: trapOwnKeys as any,
    getOwnPropertyDescriptor: trapDescriptor as any,
});
console.log("writable:", Object.isSealed(writableProxy), Object.isFrozen(writableProxy));
