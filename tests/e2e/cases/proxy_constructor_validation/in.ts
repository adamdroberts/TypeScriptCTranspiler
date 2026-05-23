try {
    const badTarget: any = new Proxy(1 as any, {} as any);
    console.log("bad target:", badTarget);
} catch (e: any) {
    console.log("bad target:", e);
}

try {
    const badHandler: any = new Proxy({} as any, 1 as any);
    console.log("bad handler:", badHandler);
} catch (e: any) {
    console.log("bad handler:", e);
}

try {
    const badRevocable: any = Proxy.revocable("x" as any, {} as any);
    console.log("bad revocable:", badRevocable);
} catch (e: any) {
    console.log("bad revocable:", e);
}
