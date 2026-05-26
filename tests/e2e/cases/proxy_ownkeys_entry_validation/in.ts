const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function numericOwnKeys(target: any): any {
    events.push("numeric trap:" + target.a);
    return [1];
}

function mixedOwnKeys(target: any): any {
    events.push("mixed trap:" + target.a);
    return ["a", true];
}

function stringOwnKeys(target: any): any {
    events.push("valid trap:" + target.a);
    return ["a"];
}

const reflectProxy: any = new Proxy({ a: 1 }, { ownKeys: numericOwnKeys as any });
try {
    console.log("reflect numeric:", Reflect.ownKeys(reflectProxy, mark("r")).join(","));
} catch (e: any) {
    console.log("reflect numeric:", e);
}

const objectProxy: any = new Proxy({ a: 1 }, { ownKeys: mixedOwnKeys as any });
try {
    console.log("object mixed:", Object.keys(objectProxy, mark("o")).join(","));
} catch (e: any) {
    console.log("object mixed:", e);
}

const validProxy: any = new Proxy({ a: 1 }, { ownKeys: stringOwnKeys as any });
console.log("valid:", Reflect.ownKeys(validProxy).join(","));
console.log("events:", events.join("|"));
