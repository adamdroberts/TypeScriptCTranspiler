let trace = "";

function mark(label: string, value: any): any {
    trace += label;
    return value;
}

try {
    const badTarget: any = new Proxy(mark("t", 1) as any, mark("h", {}) as any, mark("i", "ignored"));
    console.log("bad target:", badTarget);
} catch (e: any) {
    console.log("bad target:", e);
}

try {
    const badHandler: any = new Proxy(mark("T", {}) as any, mark("H", 1) as any, mark("I", "ignored"));
    console.log("bad handler:", badHandler);
} catch (e: any) {
    console.log("bad handler:", e);
}

try {
    const badRevocable: any = Proxy.revocable(mark("r", "x") as any, mark("R", {}) as any, mark("j", "ignored"));
    console.log("bad revocable:", badRevocable);
} catch (e: any) {
    console.log("bad revocable:", e);
}

const revokedTarget: any = Proxy.revocable(mark("p", {}) as any, mark("P", {}) as any);
const nestedRevokedTarget: any = new Proxy(revokedTarget.proxy, {});
revokedTarget.revoke();

try {
    const acceptedRevokedTarget: any = new Proxy(nestedRevokedTarget, mark("q", {}) as any);
    console.log("revoked target constructed:", typeof acceptedRevokedTarget);
    try {
        console.log("revoked target get:", acceptedRevokedTarget.a);
    } catch (e: any) {
        console.log("revoked target get:", e);
    }
} catch (e: any) {
    console.log("revoked target constructed:", e);
}

const revokedHandler: any = Proxy.revocable(mark("s", {}) as any, mark("S", {}) as any);
revokedHandler.revoke();
const acceptedRevokedHandler: any = new Proxy(mark("u", { a: 1 }) as any, revokedHandler.proxy);
try {
    console.log("revoked handler get:", acceptedRevokedHandler.a);
} catch (e: any) {
    console.log("revoked handler get:", e);
}

console.log("trace:", trace);
