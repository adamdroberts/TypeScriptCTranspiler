function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const closedTarget: any = {};
Object.preventExtensions(closedTarget);
const closedProxy: any = new Proxy(closedTarget, {
    set(_target, prop, val, _receiver) {
        console.log("set trap called for:", String(prop), "value:", String(val));
        return true;
    }
});

report("set trap success", (): any => {
    closedProxy.x = 1;
    return "done";
});

function Target(this: any, val: any) {
    this.value = val;
}
const dynamicTarget: any = Target as any;
report("construct undefined", (): any => Reflect.construct(dynamicTarget, [42], undefined).value);

report("getPrototypeOf string", (): any => Reflect.getPrototypeOf("hello" as any));
report("isExtensible string", (): any => Reflect.isExtensible("hello" as any));
report("preventExtensions string", (): any => Reflect.preventExtensions("hello" as any));
report("ownKeys string", (): any => Reflect.ownKeys("hello" as any));
report("getOwnPropertyDescriptor string", (): any => Reflect.getOwnPropertyDescriptor("hello" as any, "0"));
report("get string", (): any => Reflect.get("hello" as any, "0"));
report("set string", (): any => Reflect.set("hello" as any, "0", "a"));
report("has string", (): any => Reflect.has("hello" as any, "0"));
report("defineProperty string", (): any => Reflect.defineProperty("hello" as any, "0", {}));
report("deleteProperty string", (): any => Reflect.deleteProperty("hello" as any, "0"));
report("setPrototypeOf string", (): any => Reflect.setPrototypeOf("hello" as any, null));
