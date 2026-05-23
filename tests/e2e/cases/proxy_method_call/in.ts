function addWithBase(this: any, a: any, b: any): any {
    return this.base + a + b;
}

const events: any = [];
function trapApply(target: any, thisArg: any, args: any): any {
    events.push("trap:" + thisArg.base + ":" + args.join(","));
    return Reflect.apply(target, thisArg, args) + 10;
}

const callable: any = new Proxy(addWithBase as any, { apply: trapApply as any });
const holder: any = { base: 20, fn: callable };
console.log("method:", holder.fn(2, 3));
console.log("events:", events.join("|"));

const forwarded: any = { base: 30, fn: new Proxy(addWithBase as any, {}) };
console.log("forward:", forwarded.fn(4, 5));

const revocable: any = Proxy.revocable(addWithBase as any, {});
const revokedHolder: any = { base: 40, fn: revocable.proxy };
console.log("rev before:", revokedHolder.fn(6, 7));
revocable.revoke();
try {
    console.log("rev after:", revokedHolder.fn(1, 2));
} catch (e: any) {
    console.log("rev after:", e);
}

const objectHolder: any = { fn: new Proxy({ value: 1 }, {}) };
try {
    console.log("object method:", objectHolder.fn());
} catch (e: any) {
    console.log("object method:", e);
}
