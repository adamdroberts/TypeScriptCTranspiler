let events = "";
let marks = "";

function record(label: string): void {
    events += events ? "|" + label : label;
}

function mark(label: string): string {
    marks += label;
    return label;
}

function ownKeys(target: any): any {
    record("ownKeys");
    return ["visible", "hidden", "virtual"];
}

function badOwnKeys(target: any): any {
    record("badOwnKeys");
    return "bad";
}

const target: any = {};
Object.defineProperty(target, "visible", {
    value: 1,
    enumerable: true,
    configurable: true,
});
Object.defineProperty(target, "hidden", {
    value: 2,
    enumerable: false,
    configurable: true,
});

const proxy: any = new Proxy(target, { ownKeys: ownKeys as any });
console.log("names:", Object.getOwnPropertyNames(proxy, mark("a"), mark("b")).join(","), marks, events);

const badProxy: any = new Proxy({}, { ownKeys: badOwnKeys as any });
try {
    console.log("bad:", Object.getOwnPropertyNames(badProxy).join(","));
} catch (e: any) {
    console.log("bad:", e, events);
}

const revoked = Proxy.revocable({ value: 1 } as any, {});
revoked.revoke();
try {
    console.log("revoked:", Object.getOwnPropertyNames(revoked.proxy as any).join(","));
} catch (e: any) {
    console.log("revoked:", e);
}
