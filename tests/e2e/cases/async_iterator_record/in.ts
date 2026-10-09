async function run(): Promise<void> {
    let reads = 0;
    let cursor = 0;
    let closed = 0;
    const iterator: any = {
        get next(): any {
            reads++;
            return function (this: any): any {
                Object.defineProperty(this, "next", { value: (): any => { throw "reread"; } });
                return { value: cursor++, done: cursor > 2 };
            };
        },
    };
    const source: any = { [Symbol.asyncIterator](): any { return iterator; } };
    const values: number[] = [];
    for await (const value of source) values.push(value);
    console.log(values.join(","), reads);

    const original: any = { marker: "original" };
    let caught = false;
    const abrupt: any = { [Symbol.asyncIterator](): any { return {
        next(): any { return { value: 7, done: false }; },
        return(): any { closed++; return Promise.reject("close"); },
    }; } };
    try { for await (const value of abrupt) { throw original; } }
    catch (reason) { caught = reason === original; }
    console.log(caught, closed);

    const events: string[] = [];
    const unclosed: any = { [Symbol.asyncIterator](): any { return { next(): any { return { value: 1, done: false }; } }; } };
    for await (const value of unclosed) {
        events.push("body");
        Promise.resolve().then((): void => { events.push("queued"); });
        break;
    }
    events.push("after");
    await Promise.resolve();
    console.log(events.join(","));
}
run();
