function numericOwnKeys(target: any): any {
    return [1];
}

function mixedOwnKeys(target: any): any {
    return ["a", true];
}

function stringOwnKeys(target: any): any {
    return ["a"];
}

const reflectProxy: any = new Proxy({ a: 1 }, { ownKeys: numericOwnKeys as any });
try {
    console.log("reflect numeric:", Reflect.ownKeys(reflectProxy).join(","));
} catch (e: any) {
    console.log("reflect numeric:", e);
}

const objectProxy: any = new Proxy({ a: 1 }, { ownKeys: mixedOwnKeys as any });
try {
    console.log("object mixed:", Object.keys(objectProxy).join(","));
} catch (e: any) {
    console.log("object mixed:", e);
}

const validProxy: any = new Proxy({ a: 1 }, { ownKeys: stringOwnKeys as any });
console.log("valid:", Reflect.ownKeys(validProxy).join(","));
