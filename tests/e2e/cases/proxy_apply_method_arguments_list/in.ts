const events: string[] = [];

function add(this: any, left: any, right: any): any {
    return this.base + ":" + left + ":" + right;
}

function trapApply(target: any, thisArg: any, args: any): any {
    events.push(String(Array.isArray(args)) + ":" + args.length + ":" + args.join(","));
    args[1] = "changed";
    return Reflect.apply(target, thisArg, args) + ":trap";
}

const callable: any = new Proxy(add as any, {
    apply: trapApply as any,
});

const arrayLike: any = {
    0: "x",
    1: "y",
    length: 2,
};
console.log("apply method:", callable.apply({ base: "ctx" }, arrayLike));

const spreadList: any = ["a", "b"];
console.log("apply spread list:", callable.apply({ base: "ctx2" }, [...spreadList]));
console.log("events:", events.join("|"));
