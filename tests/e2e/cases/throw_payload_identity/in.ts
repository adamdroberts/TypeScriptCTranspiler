const events: string[] = [];
const marker: any = {
    get [Symbol.toPrimitive]() { events.push("coercion"); throw new Error("unreachable"); },
};
try {
    try { throw marker; }
    finally { events.push("finally"); }
} catch (error) {
    console.log("sync:", error === marker, events.join("|"));
}
const symbol = Symbol("thrown");
try { throw symbol; } catch (error) { console.log("symbol:", error === symbol); }
const resolved: any = Promise.resolve(1);
resolved.then(() => { throw marker; }).catch((error: any) => {
    console.log("callback:", error === marker);
});
const thenable: any = {
    then() { throw marker; },
};
Promise.resolve(thenable).catch((error: any) => {
    console.log("thenable:", error === marker);
});
async function rejected(): Promise<number> {
    try { throw marker; }
    finally { events.push("async-finally"); }
}
rejected().catch((error: any) => console.log("async:", error === marker));
