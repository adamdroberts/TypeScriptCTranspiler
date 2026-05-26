const events: string[] = [];

function Target(this: any, first: any, second: any): void {
    this.first = first;
    this.second = second;
}

function constructTrap(target: any, args: any, newTarget: any): any {
    events.push(String(Array.isArray(args)) + ":" + String(args.length) + ":" + args.join(","));
    args[1] = "changed";
    return Reflect.construct(target, args, newTarget);
}

const Ctor: any = new Proxy(Target as any, {
    construct: constructTrap as any,
});

const arrayLike: any = {
    0: "x",
    1: "y",
    length: 2,
};

const made: any = Reflect.construct(Ctor, arrayLike);
console.log("made:", made.first, made.second);
console.log("events:", events.join("|"));
