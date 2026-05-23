function Target(this: any): any {
    this.value = "target";
}

function Other(this: any): any {
    this.value = "other";
}

function trapConstruct(target: any, args: any, newTarget: any): any {
    return { reached: true };
}

const target: any = Target as any;
const badNewTarget: any = { name: "bad" };

try {
    console.log("function bad:", Reflect.construct(target, [], badNewTarget));
} catch (e: any) {
    console.log("function bad:", e);
}

const proxy: any = new Proxy(Target as any, { construct: trapConstruct as any });
try {
    console.log("proxy bad:", Reflect.construct(proxy, [], badNewTarget));
} catch (e: any) {
    console.log("proxy bad:", e);
}

const valid: any = Reflect.construct(target, [], Other as any);
console.log("valid:", typeof valid, valid.value);
