async function main(): Promise<void> {
    const buffer = new SharedArrayBuffer(8, {maxByteLength: 16});
    const words = new Int32Array(buffer);
    const add = Atomics.add;
    Atomics.store(words, 0, 11);
    await Promise.resolve();
    console.log(add.call(null, words, 0, 3), Atomics.load(words, 0));
    console.log(Atomics.compareExchange(words, 0, 14, -7), words[0]);
    console.log(Atomics.exchange(words, 0, 31), Atomics.and(words, 0, 7));
    console.log(Atomics.or(words, 0, 8), Atomics.xor(words, 0, 3), Atomics.sub(words, 0, 2), words[0]);
    buffer.grow(16);
    console.log(words.length, Atomics.store(words, 3, 4294967297), Atomics.load(words, 3), Atomics.isLockFree(4));
    const big = new BigInt64Array(new SharedArrayBuffer(8));
    console.log(Atomics.store(big, 0, 9007199254740993n).toString(), Atomics.add(big, 0, 2n).toString(), Atomics.load(big, 0).toString());
    const ordinary = new Uint8Array(2);
    console.log(Atomics.store(ordinary, 0, 257), Atomics.load(ordinary, 0));
}
main();
