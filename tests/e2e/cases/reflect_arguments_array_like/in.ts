function add(left: any, right: any): any {
    return left + right;
}

function Target(this: any, left: any, right: any): any {
    this.value = left + right;
}

const dynamicAdd: any = add as any;
const dynamicTarget: any = Target as any;
const applyArgs: any = { 0: 2, 1: 3, length: 2 };
console.log("apply object:", Reflect.apply(dynamicAdd, null, applyArgs));

function applyTrap(target: any, thisArg: any, args: any): any {
    console.log("apply trap args:", Array.isArray(args), args.length, args[0], args[1]);
    return Reflect.apply(target, thisArg, args);
}

const callable: any = new Proxy(dynamicAdd, { apply: applyTrap as any });
console.log("proxy apply object:", Reflect.apply(callable, null, applyArgs));

const constructArgs: any = { 0: "a", 1: "b", length: 2 };
const made: any = Reflect.construct(dynamicTarget, constructArgs);
console.log("construct object:", made.value);

function constructTrap(target: any, args: any, newTarget: any): any {
    console.log("construct trap args:", Array.isArray(args), args.length, args[0], args[1]);
    return Reflect.construct(target, args, newTarget);
}

const constructable: any = new Proxy(dynamicTarget, { construct: constructTrap as any });
const proxied: any = Reflect.construct(constructable, constructArgs);
console.log("proxy construct object:", proxied.value);

const clipped: any = { 0: 10, length: -1 };
console.log("negative length:", Reflect.apply(dynamicAdd, null, clipped));
