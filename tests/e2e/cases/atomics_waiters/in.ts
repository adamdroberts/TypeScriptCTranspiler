async function main(): Promise<void> {
    const buffer = new SharedArrayBuffer(16, {maxByteLength: 32});
    const words = new Int32Array(buffer);
    const big = new BigInt64Array(buffer);
    const wait = Atomics.waitAsync;
    const notify = Atomics.notify;
    const first = wait(words, 0, 0);
    const second = wait(big, 0, 0n);
    if (first.async && second.async) {
        await Promise.resolve();
        console.log(notify(words, 0, 1), await first.value);
        console.log(notify(big, 0), await second.value);
    }
    const immediate = wait(words, 0, 0, 0);
    console.log(immediate.async, await immediate.value, notify(words, 0));
    const timeout = wait(words, 1, 0, 2);
    const keepalive = setTimeout(() => {}, 100);
    if (timeout.async) console.log(timeout.async, await timeout.value);
    clearTimeout(keepalive);
    Atomics.store(words, 0, 7);
    console.log(Atomics.wait(words, 0, 0, 0), Atomics.wait(words, 0, 7, 0));
    buffer.grow(32);
    const tail = wait(words, 7, 0);
    if (tail.async) console.log(words.length, notify(words, 7), await tail.value);
}
main();
