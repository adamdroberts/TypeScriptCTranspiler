function Target(this: any, value: any): any {
    this.value = value;
}

const dynamicTarget: any = Target as any;

const badTarget: any = 1;
try {
    console.log("bad target:", Reflect.construct(badTarget, []));
} catch (e: any) {
    console.log("bad target:", e);
}

const badArgs: any = 1;
try {
    console.log("bad args:", Reflect.construct(dynamicTarget, badArgs));
} catch (e: any) {
    console.log("bad args:", e);
}

let trapSeen = false;
function constructTrap(target: any, args: any, newTarget: any): any {
    trapSeen = true;
    return { value: "trap" };
}

const proxy: any = new Proxy(dynamicTarget, { construct: constructTrap as any });
try {
    console.log("proxy bad args:", Reflect.construct(proxy, badArgs));
} catch (e: any) {
    console.log("proxy bad args:", e, trapSeen);
}

const badNewTarget: any = { name: "bad" };
try {
    console.log("bad newTarget before args:", Reflect.construct(dynamicTarget, badArgs, badNewTarget));
} catch (e: any) {
    console.log("bad newTarget before args:", e);
}

const valid: any = Reflect.construct(dynamicTarget, ["ok"]);
console.log("valid:", valid.value);
