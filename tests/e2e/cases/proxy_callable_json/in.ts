function fn(): any {
    return 1;
}

const callable: any = new Proxy(fn as any, {});
const objectProxy: any = new Proxy({ value: 1 }, {});
const holder: any = { callable, objectProxy, direct: fn as any, ok: "yes" };
const list: any = [callable, objectProxy, fn as any];

console.log("holder:", JSON.stringify(holder));
console.log("list:", JSON.stringify(list));
console.log("top:", JSON.stringify(callable), JSON.stringify(objectProxy));
