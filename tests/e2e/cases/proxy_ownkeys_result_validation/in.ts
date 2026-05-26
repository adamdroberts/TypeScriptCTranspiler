const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function badOwnKeys(target: any): any {
    events.push("trap:" + target.a);
    return "bad";
}

const reflectProxy: any = new Proxy({ a: 1 }, { ownKeys: badOwnKeys as any });
try {
    console.log("reflect:", Reflect.ownKeys(reflectProxy, mark("r")).join(","));
} catch (e: any) {
    console.log("reflect:", e);
}

const objectProxy: any = new Proxy({ a: 1 }, { ownKeys: badOwnKeys as any });
try {
    console.log("object:", Object.keys(objectProxy, mark("o")).join(","));
} catch (e: any) {
    console.log("object:", e);
}

console.log("events:", events.join("|"));
