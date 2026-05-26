const events: string[] = [];

function target(this: any, first: any, second: any): string {
    return this.base + ":" + first + ":" + second;
}

function applyTrap(targetFn: any, thisArg: any, args: any): any {
    events.push(String(Array.isArray(args)) + ":" + String(args.length) + ":" + args.join(","));
    args[1] = "changed";
    return Reflect.apply(targetFn, { base: thisArg.base + "!" }, args);
}

const fn: any = new Proxy(target as any, {
    apply: applyTrap as any,
});

const arrayLike: any = {
    0: "x",
    1: "y",
    length: 2,
};

console.log("result:", Reflect.apply(fn, { base: "ctx" }, arrayLike));
console.log("events:", events.join("|"));
