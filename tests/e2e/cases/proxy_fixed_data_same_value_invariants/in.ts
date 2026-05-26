function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

function negativeZeroGet(target: any, prop: any, receiver: any): number {
    return -0;
}

function positiveZeroGet(target: any, prop: any, receiver: any): number {
    return 0;
}

function nanGet(target: any, prop: any, receiver: any): number {
    return NaN;
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
    return true;
}

function trueDefine(target: any, prop: any, desc: any): boolean {
    return true;
}

function negativeZeroDescriptor(target: any, prop: any): any {
    return { value: -0, writable: false, enumerable: true, configurable: false };
}

const plusZeroTarget: any = {};
Object.defineProperty(plusZeroTarget, "fixed", {
    value: 0,
    writable: false,
    enumerable: true,
    configurable: false,
});

const negativeZeroTarget: any = {};
Object.defineProperty(negativeZeroTarget, "fixed", {
    value: -0,
    writable: false,
    enumerable: true,
    configurable: false,
});

const nanTarget: any = {};
Object.defineProperty(nanTarget, "fixed", {
    value: NaN,
    writable: false,
    enumerable: true,
    configurable: false,
});

const plusGetProxy: any = new Proxy(plusZeroTarget, { get: negativeZeroGet as any });
report("get plus as negative", (): any => Reflect.get(plusGetProxy, "fixed"));

const negativeGetProxy: any = new Proxy(negativeZeroTarget, { get: positiveZeroGet as any });
report("get negative as plus", (): any => Reflect.get(negativeGetProxy, "fixed"));

const nanGetProxy: any = new Proxy(nanTarget, { get: nanGet as any });
console.log("get nan:", Object.is(Reflect.get(nanGetProxy, "fixed"), NaN));

const plusSetProxy: any = new Proxy(plusZeroTarget, { set: trueSet as any });
report("set plus as negative", (): any => Reflect.set(plusSetProxy, "fixed", -0));

const plusDefineProxy: any = new Proxy(plusZeroTarget, { defineProperty: trueDefine as any });
report("define plus as negative", (): any => Reflect.defineProperty(plusDefineProxy, "fixed", { value: -0 }));

const plusDescriptorProxy: any = new Proxy(plusZeroTarget, { getOwnPropertyDescriptor: negativeZeroDescriptor as any });
report("descriptor plus as negative", (): any => Object.getOwnPropertyDescriptor(plusDescriptorProxy, "fixed")?.value);
