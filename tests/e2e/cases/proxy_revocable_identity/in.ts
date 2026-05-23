function add(left: any, right: any): any {
    return left + right;
}

const callable: any = Proxy.revocable(add as any, {});
const objectProxy: any = Proxy.revocable({ value: 1 }, {});

console.log("before:", typeof callable.proxy, typeof objectProxy.proxy);

callable.revoke();
objectProxy.revoke();

console.log("after:", typeof callable.proxy, typeof objectProxy.proxy);

try {
    console.log("string:", String(callable.proxy));
} catch (e: any) {
    console.log("string:", e);
}

try {
    console.log("json callable:", JSON.stringify(callable.proxy));
} catch (e: any) {
    console.log("json callable:", e);
}

try {
    console.log("json object:", JSON.stringify(objectProxy.proxy));
} catch (e: any) {
    console.log("json object:", e);
}
