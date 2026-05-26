const events: string[] = [];

function add(this: any, left: any, right: any): any {
    return this.base + ":" + left + ":" + right;
}

function trapApply(target: any, thisArg: any, args: any): any {
    events.push("trap:" + thisArg.base + ":" + args.join(","));
    return Reflect.apply(target, thisArg, args) + ":trap";
}

const callable: any = new Proxy(add as any, {
    apply: trapApply as any,
});

const args: any = ["x", "y"];
console.log("call:", callable.call({ base: "ctx" }, ...args));

const forwarded: any = new Proxy(add as any, {});
const forwardedArgs: any = ["a", "b"];
console.log("forward:", forwarded.call({ base: "fwd" }, ...forwardedArgs));
console.log("events:", events.join("|"));
