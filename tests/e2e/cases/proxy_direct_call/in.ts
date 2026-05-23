function add(a: any, b: any): any {
    return a + b;
}

const events: any = [];
function trapApply(target: any, thisArg: any, args: any): any {
    events.push("trap:" + typeof thisArg + ":" + args.join(","));
    return Reflect.apply(target, thisArg, args) + 10;
}

const callable: any = new Proxy(add as any, { apply: trapApply as any });
console.log("type:", typeof callable);
console.log("call:", callable(2, 3));
console.log("events:", events.join("|"));

const forwarded: any = new Proxy(add as any, {});
console.log("forward:", forwarded(4, 5));

const revocable: any = Proxy.revocable(add as any, {});
console.log("rev before:", revocable.proxy(6, 7));
revocable.revoke();
try {
    console.log("rev after:", revocable.proxy(1, 2));
} catch (e: any) {
    console.log("rev after:", e);
}

const objectProxy: any = new Proxy({ value: 1 }, {});
try {
    console.log("object call:", objectProxy());
} catch (e: any) {
    console.log("object call:", e);
}
