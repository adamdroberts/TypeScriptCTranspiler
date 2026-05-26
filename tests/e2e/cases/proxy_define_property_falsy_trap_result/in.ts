function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function falseDefine(target: any, prop: any, desc: any): boolean {
    return false;
}

const target: any = {};
const proxy: any = new Proxy(target, { defineProperty: falseDefine as any });

console.log("reflect define:", Reflect.defineProperty(proxy, "x", { value: 1 }), "x" in target);
report("object define", (): any => Object.defineProperty(proxy, "x", { value: 1 }) === proxy);
report("object define properties", (): any => Object.defineProperties(proxy, { y: { value: 2 } }) === proxy);
console.log("after:", "x" in target, "y" in target);
