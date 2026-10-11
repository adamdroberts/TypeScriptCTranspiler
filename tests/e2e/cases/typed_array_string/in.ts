async function main(): Promise<void> {
    const owner = Int16Array.of(1, 2, 3);
    const join = owner.join;
    await Promise.resolve();
    console.log('join:', join.call(owner, '|'));
    console.log('string:', owner.toString());
    console.log('locale:', owner.toLocaleString());
    console.log('bigint:', BigInt64Array.of(1n, 2n).join('😀'));
    const storage = new ArrayBuffer(3, {maxByteLength: 6});
    const tracking = new Uint8Array(storage);
    tracking.set([7, 8, 9]);
    storage.resize(1);
    console.log('resize:', tracking.join(','));
    storage.resize(3);
    console.log('recover:', tracking.toString());
    const toString = owner.toString;
    console.log('alias:', toString === Array.prototype.toString);
    console.log('array:', [1, 2, 3].join('|'));
}
main();
