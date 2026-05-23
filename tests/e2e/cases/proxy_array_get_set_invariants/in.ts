function wrongGet(target: any, prop: any, receiver: any): any {
    if (prop === "length") return 99;
    return "wrong";
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
    return true;
}

const frozenGetTarget: any = ["fixed"];
Object.freeze(frozenGetTarget);
const frozenGetProxy: any = new Proxy(frozenGetTarget, { get: wrongGet as any });
try {
    console.log("get frozen index:", Reflect.get(frozenGetProxy, "0"));
} catch (err: any) {
    console.log("get frozen index:", err);
}
try {
    console.log("get frozen length:", Reflect.get(frozenGetProxy, "length"));
} catch (err: any) {
    console.log("get frozen length:", err);
}

const sealedGetTarget: any = ["sealed"];
Object.seal(sealedGetTarget);
const sealedGetProxy: any = new Proxy(sealedGetTarget, { get: wrongGet as any });
console.log("get sealed writable:", Reflect.get(sealedGetProxy, "0"));

const frozenSetTarget: any = ["fixed"];
Object.freeze(frozenSetTarget);
const frozenSetProxy: any = new Proxy(frozenSetTarget, { set: trueSet as any });
try {
    console.log("set frozen index:", Reflect.set(frozenSetProxy, "0", "changed"));
} catch (err: any) {
    console.log("set frozen index:", err);
}
console.log("set frozen same:", Reflect.set(frozenSetProxy, "0", "fixed"));
try {
    console.log("set frozen length:", Reflect.set(frozenSetProxy, "length", 2));
} catch (err: any) {
    console.log("set frozen length:", err);
}
console.log("set frozen length same:", Reflect.set(frozenSetProxy, "length", 1));

const sealedSetTarget: any = ["sealed"];
Object.seal(sealedSetTarget);
const sealedSetProxy: any = new Proxy(sealedSetTarget, { set: trueSet as any });
console.log("set sealed writable:", Reflect.set(sealedSetProxy, "0", "changed"));
