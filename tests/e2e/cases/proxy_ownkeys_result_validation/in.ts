function badOwnKeys(target: any): any {
    return "bad";
}

const reflectProxy: any = new Proxy({ a: 1 }, { ownKeys: badOwnKeys as any });
try {
    console.log("reflect:", Reflect.ownKeys(reflectProxy).join(","));
} catch (e: any) {
    console.log("reflect:", e);
}

const objectProxy: any = new Proxy({ a: 1 }, { ownKeys: badOwnKeys as any });
try {
    console.log("object:", Object.keys(objectProxy).join(","));
} catch (e: any) {
    console.log("object:", e);
}
