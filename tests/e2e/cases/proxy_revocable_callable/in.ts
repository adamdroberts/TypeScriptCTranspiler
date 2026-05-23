function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function Target(this: any, value: any): any {
    this.value = value;
}

const callable: any = Proxy.revocable(add as any, {});
console.log("apply before:", Reflect.apply(callable.proxy, { base: 10 }, [2, 3]));
callable.revoke();
try {
    console.log(Reflect.apply(callable.proxy, { base: 0 }, [1, 1]));
} catch (e: any) {
    console.log("apply after:", e);
}

const constructable: any = Proxy.revocable(Target as any, {});
const made: any = Reflect.construct(constructable.proxy, ["ok"]);
console.log("construct before:", made.value);
constructable.revoke();
try {
    console.log(Reflect.construct(constructable.proxy, ["again"]));
} catch (e: any) {
    console.log("construct after:", e);
}
