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
const directArgs: any = ["x", "y"];
console.log("direct:", callable(...directArgs));

const holder: any = {
    base: "holder",
    fn: callable,
};
const methodArgs: any = ["a", "b"];
console.log("method:", holder.fn(...methodArgs));

const forwarded: any = new Proxy(add as any, {});
console.log("forward:", Reflect.apply(forwarded, { base: "ctx" }, ["m", "n"]));
console.log("events:", events.join("|"));
