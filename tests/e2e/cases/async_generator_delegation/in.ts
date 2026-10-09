async function* leaf(value: number): AsyncGenerator<number, number, number | undefined> {
    try {
        const resumed = yield value;
        return (resumed ?? 0) + value;
    } catch (reason) {
        yield 11;
        return 13;
    } finally { yield 7; }
}
async function* delegated(value: number): AsyncGenerator<number, number, number> {
    try { return yield* leaf(value); }
    finally { yield* [17, 19]; }
}
class Values {
    async *values(): AsyncGenerator<number, void, number | undefined> {
        yield* [2, 3];
        yield* leaf(5);
    }
}
async function run(): Promise<void> {
    const normal = delegated(3);
    const requests = [normal.next(), normal.next(5), normal.next(), normal.next(), normal.next()];
    for (const result of await Promise.all(requests)) console.log(result.value, result.done);
    const returned = delegated(23);
    const startedReturn = await returned.next();
    console.log(startedReturn.value);
    const returnRequests = [returned.return(29), returned.next(), returned.next(), returned.next()];
    for (const result of await Promise.all(returnRequests)) {
        if (result.done) console.log(result.value, result.done);
        else console.log(result.value);
    }
    const thrown = delegated(31);
    await thrown.next();
    const throwRequests = [thrown.throw("recover"), thrown.next(), thrown.next(), thrown.next(), thrown.next()];
    for (const result of await Promise.all(throwRequests)) {
        if (result.done) console.log(result.value, result.done);
        else console.log(result.value);
    }
    const collected: number[] = [];
    for await (const value of new Values().values()) collected.push(value);
    console.log(collected.join(","));
}
run();
