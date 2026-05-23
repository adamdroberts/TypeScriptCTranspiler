function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function Target(this: any, value: any): void {
    this.value = value;
}

const callable: any = new Proxy(add as any, {});
const nestedCallable: any = new Proxy(callable, {});
const constructable: any = new Proxy(Target as any, {});
const objectProxy: any = new Proxy({ value: 1 }, {});

console.log(
    "tags:",
    Object.prototype.toString.call(add as any),
    Object.prototype.toString.call(callable),
    Object.prototype.toString.call(nestedCallable),
    Object.prototype.toString.call(constructable),
    Object.prototype.toString.call(objectProxy),
);

const revocable: any = Proxy.revocable(add as any, {});
console.log("revocable before:", Object.prototype.toString.call(revocable.proxy));
revocable.revoke();
try {
    console.log("revocable after:", Object.prototype.toString.call(revocable.proxy));
} catch (err: any) {
    console.log("revocable after:", String(err));
}
