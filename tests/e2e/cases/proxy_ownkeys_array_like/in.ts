const events: string[] = [];

function ownKeys(target: any): any {
    events.push("trap:" + target.a);
    return { 0: "b", 1: "a", length: 2 };
}

const target: any = {};
Object.defineProperty(target, "a", { value: 1, enumerable: true, configurable: true });
Object.defineProperty(target, "b", { value: 2, enumerable: false, configurable: true });
const proxy: any = new Proxy(target, { ownKeys: ownKeys as any });

console.log("reflect:", Reflect.ownKeys(proxy).join(","));
console.log("object:", Object.keys(proxy).join(","));
console.log("events:", events.join("|"));
