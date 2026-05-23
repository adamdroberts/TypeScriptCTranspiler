function Target(this: any, value: any): any {
    this.value = value;
    this.kind = "target";
}

function constructTrap(target: any, args: any, newTarget: any): any {
    return {
        value: args[0] + 10,
        targetType: typeof target,
        newTargetType: typeof newTarget,
    };
}

const constructable: any = new Proxy(Target as any, { construct: constructTrap as any });
const made: any = new constructable(5);
console.log("construct:", made.value, made.targetType, made.newTargetType);

const forwarded: any = new Proxy(Target as any, {});
const forwardedMade: any = new forwarded(6);
console.log("forward:", forwardedMade.value, forwardedMade.kind);

const revocable: any = Proxy.revocable(Target as any, {});
const revokedProxy: any = revocable.proxy;
const before: any = new revokedProxy(7);
console.log("rev before:", before.value, before.kind);
revocable.revoke();
try {
    console.log("rev after:", new revokedProxy(1));
} catch (e: any) {
    console.log("rev after:", e);
}

const objectProxy: any = new Proxy({ value: 1 }, {});
try {
    console.log("object construct:", new objectProxy());
} catch (e: any) {
    console.log("object construct:", e);
}
