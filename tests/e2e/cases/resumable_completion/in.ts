const events: string[] = [];
const returned: any = { get then() {
    events.push("old-get");
    return (resolve: (value: number) => void) => resolve(-1);
} };

async function delayed(): Promise<number> {
    try { return returned; }
    finally {
        events.push("finally-start");
        await 1;
        Object.defineProperty(returned, "then", { get() {
            events.push("new-get");
            return (resolve: (value: number) => void) => {
                events.push("then-call"); resolve(17);
            };
        }, configurable: true });
        events.push("finally-end");
    }
}

class Payload { value: number = 23; }
const outer = new Payload();
const inner = new Payload();
inner.value = 99;
async function nested(): Promise<Payload> {
    try { return outer; }
    finally {
        skip: try { return inner; } finally { await 1; break skip; }
        await 1;
    }
}
async function arrayReturn(): Promise<number[]> {
    try { return [3, 5, 8]; } finally { await 1; }
}
const abrupt: any = { value: 41 };
async function throws(): Promise<void> { await 1; throw abrupt; }
async function main(): Promise<void> {
    const value = await delayed();
    console.log(value);
    console.log(events.join(","));
    const payload = await nested();
    console.log(payload.value);
    const array = await arrayReturn();
    console.log(array.join(","));
    try { await throws(); } catch (reason) { console.log(reason === abrupt); }
}
main();
