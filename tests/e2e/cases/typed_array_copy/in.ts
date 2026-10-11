async function main(): Promise<void> {
    const owner = Int16Array.of(1, 2, 3, 4);
    const subarray = owner.subarray;
    await Promise.resolve();
    const view = subarray.call(owner, 1, 3);
    view.fill(9);
    console.log('shared:', owner[0], owner[1], owner[2], owner[3]);
    owner.copyWithin(1, 0, 3);
    console.log('overlap:', owner[0], owner[1], owner[2], owner[3]);
    const copied = owner.slice(1, 3);
    copied.reverse();
    console.log('slice:', copied[0], copied[1], copied.buffer === owner.buffer);
    const changed = owner.with(-1, 7).toReversed();
    console.log('change:', changed[0], changed[1], changed[2], changed[3]);
    const target = new Uint8Array(4);
    target.set(owner);
    console.log('set:', target[0], target[1], target[2], target[3]);
    const storage = new ArrayBuffer(8, {maxByteLength: 16});
    const tracking = new Uint16Array(storage).subarray(1);
    storage.resize(12);
    console.log('tracking:', tracking.length, tracking.byteOffset);
}
main();
