function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function Target(this: any, value: any): void {
    this.value = value;
}

const innerCallable: any = new Proxy(add as any, {});
const outerCallable: any = new Proxy(innerCallable, {});
const objectProxy: any = new Proxy({}, {});

const innerConstructable: any = new Proxy(Target as any, {});
const outerConstructable: any = new Proxy(innerConstructable, {});
const made: any = Reflect.construct(outerConstructable, ["ok"]);

const holder: any = {
    callable: outerCallable,
    objectProxy,
    value: "kept",
};
const list: any = [outerCallable, objectProxy];

console.log("types:", typeof innerCallable, typeof outerCallable, typeof objectProxy, typeof outerConstructable);
console.log("string:", String(outerCallable), String(objectProxy));
console.log("apply:", Reflect.apply(outerCallable, { base: 10 }, [2, 3]));
console.log("construct:", made.value);
console.log("json object:", JSON.stringify(holder));
console.log("json list:", JSON.stringify(list));
console.log("json top:", JSON.stringify(outerCallable), JSON.stringify(objectProxy));

const revocable: any = Proxy.revocable(add as any, {});
const outerRevoked: any = new Proxy(revocable.proxy, {});
console.log("revoked type before:", typeof outerRevoked);
revocable.revoke();
console.log("revoked type after:", typeof outerRevoked);
try {
    console.log("revoked string:", String(outerRevoked));
} catch (e: any) {
    console.log("revoked string:", e);
}
try {
    console.log("revoked json:", JSON.stringify(outerRevoked));
} catch (e: any) {
    console.log("revoked json:", e);
}
