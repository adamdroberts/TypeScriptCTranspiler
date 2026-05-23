function add(left: any, right: any): any {
    return left + right;
}

const dynamicAdd: any = add as any;
const badTarget: any = 1;
try {
    console.log("bad target:", Reflect.apply(badTarget, null, []));
} catch (e: any) {
    console.log("bad target:", e);
}

const badArgs: any = 1;
try {
    console.log("bad args:", Reflect.apply(dynamicAdd, null, badArgs));
} catch (e: any) {
    console.log("bad args:", e);
}

let trapSeen = false;
function applyTrap(target: any, thisArg: any, args: any): any {
    trapSeen = true;
    return 99;
}

const callable: any = new Proxy(dynamicAdd, { apply: applyTrap as any });
try {
    console.log("proxy bad args:", Reflect.apply(callable, null, badArgs));
} catch (e: any) {
    console.log("proxy bad args:", e, trapSeen);
}

console.log("valid:", Reflect.apply(dynamicAdd, null, [2, 3]));
