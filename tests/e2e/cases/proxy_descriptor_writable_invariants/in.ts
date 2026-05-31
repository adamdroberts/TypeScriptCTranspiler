const events: string[] = [];

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

function downgradeDescriptor(target: any, prop: any): any {
    events.push("downgrade:" + String(prop));
    const desc: any = Reflect.getOwnPropertyDescriptor(target, prop);
    return {
        value: desc.value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
    };
}

function missingWritableDescriptor(target: any, prop: any): any {
    events.push("missing:" + String(prop));
    const desc: any = Reflect.getOwnPropertyDescriptor(target, prop);
    return {
        value: desc.value,
        enumerable: desc.enumerable,
        configurable: false,
    };
}

function sameWritableDescriptor(target: any, prop: any): any {
    events.push("same:" + String(prop));
    const desc: any = Reflect.getOwnPropertyDescriptor(target, prop);
    return {
        value: desc.value,
        writable: true,
        enumerable: desc.enumerable,
        configurable: false,
    };
}

const objectTarget: any = {};
Object.defineProperty(objectTarget, "fixed", {
    value: "object",
    writable: true,
    enumerable: true,
    configurable: false,
});

report("object downgrade", (): any => {
    const proxy: any = new Proxy(objectTarget, { getOwnPropertyDescriptor: downgradeDescriptor as any });
    return Reflect.getOwnPropertyDescriptor(proxy, "fixed")!.writable;
});

report("object missing writable", (): any => {
    const proxy: any = new Proxy(objectTarget, { getOwnPropertyDescriptor: missingWritableDescriptor as any });
    return Object.getOwnPropertyDescriptor(proxy, "fixed")!.writable;
});

report("object same writable", (): any => {
    const proxy: any = new Proxy(objectTarget, { getOwnPropertyDescriptor: sameWritableDescriptor as any });
    return Reflect.getOwnPropertyDescriptor(proxy, "fixed")!.writable;
});

const arrayTarget: any = ["array"];
Object.seal(arrayTarget);

report("array downgrade", (): any => {
    const proxy: any = new Proxy(arrayTarget, { getOwnPropertyDescriptor: downgradeDescriptor as any });
    return Reflect.getOwnPropertyDescriptor(proxy, "0")!.writable;
});

report("array missing writable", (): any => {
    const proxy: any = new Proxy(arrayTarget, { getOwnPropertyDescriptor: missingWritableDescriptor as any });
    return Object.getOwnPropertyDescriptor(proxy, "0")!.writable;
});

report("array same writable", (): any => {
    const proxy: any = new Proxy(arrayTarget, { getOwnPropertyDescriptor: sameWritableDescriptor as any });
    return Reflect.getOwnPropertyDescriptor(proxy, "0")!.writable;
});

console.log("events:", events.join("|"));
