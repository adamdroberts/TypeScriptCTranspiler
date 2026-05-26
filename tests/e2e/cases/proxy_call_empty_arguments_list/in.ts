const events: string[] = [];

function target(this: any, first: any): string {
    return "target:" + String(first);
}

function applyTrap(targetFn: any, thisArg: any, args: any): any {
    events.push("trap:" + String(thisArg === undefined) + ":" + String(thisArg === null) + ":" + String(Array.isArray(args)) + ":" + args.length + ":" + args.join(","));
    return Reflect.apply(targetFn, thisArg, args) + ":trap";
}

const callable: any = new Proxy(target as any, {
    apply: applyTrap as any,
});

console.log("omitted:", callable.call());
console.log("undefined:", callable.call(undefined));
console.log("null:", callable.call(null));
console.log("events:", events.join("|"));
