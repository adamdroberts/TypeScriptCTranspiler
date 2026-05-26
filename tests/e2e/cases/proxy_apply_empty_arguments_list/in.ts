const events: string[] = [];

function target(this: any, first: any): string {
    return this.base + ":" + String(first);
}

function ignored(label: string): any {
    events.push("ignored:" + label);
    return label;
}

function applyTrap(targetFn: any, thisArg: any, args: any): any {
    events.push("trap:" + thisArg.base + ":" + String(Array.isArray(args)) + ":" + args.length + ":" + args.join(","));
    return Reflect.apply(targetFn, thisArg, args);
}

const callable: any = new Proxy(target as any, {
    apply: applyTrap as any,
});

console.log("omitted:", callable.apply({ base: "omit" }));
console.log("null:", callable.apply({ base: "null" }, null, ignored("null-extra")));
console.log("undefined:", callable.apply({ base: "undef" }, undefined, ignored("undefined-extra")));
console.log("events:", events.join("|"));
