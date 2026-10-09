async function* values(first: number): AsyncGenerator<number, number, number> {
    const input = yield first;
    await Promise.resolve();
    try { return input + first; }
    finally { yield 7; }
}
class Counter {
    constructor(public base: number) {}
    async *values(limit: number): AsyncGenerator<number, void, unknown> {
        for (let index = 0; index < limit; index++) {
            await Promise.resolve();
            yield this.base + index;
        }
    }
}
async function run(): Promise<void> {
    const iterator = values(3);
    const requests = [iterator.next(), iterator.next(5), iterator.next()];
    const results = await Promise.all(requests);
    for (const result of results) console.log(result.value, result.done);
    const counter = new Counter(10);
    const collected: number[] = [];
    for await (const value of counter.values(3)) collected.push(value);
    console.log(collected.join(","));
}
run();
