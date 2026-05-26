function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function getTrap(target: any, prop: any, receiver: any): any {
    return Reflect.get(target, prop, receiver);
}

function ownKeysTrap(target: any): any {
    return ["a"];
}

const handlerTarget: any = {
    get: getTrap as any,
    ownKeys: ownKeysTrap as any,
};
const revocable: any = Proxy.revocable(handlerTarget, {});
const proxy: any = new Proxy({ a: "A" }, revocable.proxy);

console.log("before:", proxy.a);
revocable.revoke();
report("get after", function(): any {
    return proxy.a;
});
report("ownKeys after", function(): any {
    return Reflect.ownKeys(proxy).join(",");
});
