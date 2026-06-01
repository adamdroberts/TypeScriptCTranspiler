function joinArgs(left: any, right: any): string {
    return String(left) + ":" + String(right);
}

function Target(this: any, left: any, right: any): void {
    this.value = String(left) + ":" + String(right);
}

function argumentList(left: any, right: any): void {
    void left;
    void right;
}

const dynamicJoin: any = joinArgs as any;
const dynamicTarget: any = Target as any;
const functionArgs: any = argumentList as any;

console.log("apply function:", Reflect.apply(dynamicJoin, null, functionArgs));

function applyTrap(target: any, thisArg: any, args: any): any {
    console.log("apply trap:", Array.isArray(args), args.length, args[0], args[1]);
    return Reflect.apply(target, thisArg, args);
}

const callable: any = new Proxy(dynamicJoin, { apply: applyTrap as any });
console.log("proxy apply function:", Reflect.apply(callable, null, functionArgs));

const made: any = Reflect.construct(dynamicTarget, functionArgs);
console.log("construct function:", made.value);

function constructTrap(target: any, args: any, newTarget: any): any {
    console.log("construct trap:", Array.isArray(args), args.length, args[0], args[1]);
    return Reflect.construct(target, args, newTarget);
}

const constructable: any = new Proxy(dynamicTarget, { construct: constructTrap as any });
const proxied: any = Reflect.construct(constructable, functionArgs);
console.log("proxy construct function:", proxied.value);
