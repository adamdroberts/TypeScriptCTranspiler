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

console.log("trace:", trace);
