const events: string[] = [];

function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function Target(this: any, value: any): void {
    this.value = value;
}

function trapApply(target: any, thisArg: any, args: any): any {
    events.push("apply:" + String(typeof target) + ":" + String(typeof thisArg));
    return Reflect.apply(target, { base: 10 }, args);
}

function trapConstruct(target: any, args: any, newTarget: any): any {
    events.push("construct:" + String(typeof target) + ":" + String(typeof newTarget));
    return { value: args[0] * 2 };
}

const callable: any = new Proxy(add as any, { apply: trapApply as any });
const constructable: any = new Proxy(Target as any, { construct: trapConstruct as any });
const objectProxy: any = new Proxy({ value: 1 }, {});

const made: any = Reflect.construct(constructable, [21]);

console.log("types:", typeof add, typeof callable, typeof constructable, typeof objectProxy);
console.log("apply:", Reflect.apply(callable, { base: 0 }, [2, 3]));
console.log("made:", made.value);
console.log("events:", events.join("|"));
