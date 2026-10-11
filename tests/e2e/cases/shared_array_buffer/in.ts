async function main(): Promise<void> {
    const buffer = new SharedArrayBuffer(4, {maxByteLength: 12});
    const tracking = new Uint8Array(buffer);
    const fixed = new Uint8Array(buffer, 1, 2);
    const view = new DataView(buffer);
    tracking.set([1, 2, 3, 4]);
    const grow = buffer.grow;
    await Promise.resolve();
    grow.call(buffer, 8);
    view.setUint16(4, 0x1234, true);
    console.log(buffer.growable, buffer.byteLength, buffer.maxByteLength);
    console.log(tracking.join('|'), fixed.join('|'), view.byteLength);
    const sliced = buffer.slice(1, 5);
    console.log(sliced.growable, new Uint8Array(sliced).join('|'));
    const sub = tracking.subarray(4);
    buffer.grow(12);
    console.log(sub.length, sub.buffer === buffer, ArrayBuffer.isView(view));
    const big = new BigInt64Array(new SharedArrayBuffer(16));
    big.set([-3n, 9007199254740993n]);
    console.log(big.join('|'), big.slice().join('|'));
}
main();
