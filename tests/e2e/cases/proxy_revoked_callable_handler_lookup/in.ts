function Target(this: any, value: any): any {
    this.value = value;
}

function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function applyTrap(target: any, thisArg: any, args: any): any {
    return thisArg.base + ":" + args[0];
}

function constructTrap(target: any, args: any, newTarget: any): any {
    return { built: args[0] };
}

const handlerTarget: any = {
    apply: applyTrap as any,
    construct: constructTrap as any,
};
const revocable: any = Proxy.revocable(handlerTarget, {});
const callableProxy: any = new Proxy(Target as any, revocable.proxy);

console.log("apply before:", Reflect.apply(callableProxy, { base: "ctx" }, ["x"]));
const before: any = new callableProxy("y");
console.log("construct before:", before.built);

revocable.revoke();
report("apply after", function(): any {
    return Reflect.apply(callableProxy, { base: "ctx" }, ["x"]);
});
report("construct after", function(): any {
    return new callableProxy("y");
});
