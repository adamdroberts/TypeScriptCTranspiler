function show(this: any, first?: any): string {
    return this.tag + ":" + String(first);
}

const events: string[] = [];

function applyTrap(target: any, thisArg: any, args: any): any {
    events.push("trap:" + args.length + ":" + args.join(","));
    args[0] = String(args[0]) + ":trap";
    return Reflect.apply(target, thisArg, args);
}

function ignored(label: string): any {
    events.push("ignored:" + label);
    return label;
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err) {
        console.log(label + ":", String(err));
    }
}

const callable: any = new Proxy(show as any, {
    apply: applyTrap as any,
});

report("bad number", (): any => callable.apply({ tag: "bad" }, 123, ignored("n")));
report("bad string", (): any => callable.apply({ tag: "bad" }, "xy", ignored("s")));
report("bad boolean", (): any => callable.apply({ tag: "bad" }, true, ignored("b")));
console.log("valid:", callable.apply({ tag: "ok" }, { 0: "x", length: 1 }, ignored("v")));
console.log("events:", events.join("|"));
