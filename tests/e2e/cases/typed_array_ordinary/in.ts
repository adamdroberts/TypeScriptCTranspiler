async function main(): Promise<void> {
    const storage = new ArrayBuffer(8, {maxByteLength: 16});
    const tracking = new Uint16Array(storage, 2);
    const fixed = new Uint16Array(storage, 2, 2);
    tracking[0] = 65537;
    console.log('shared:', fixed[0], tracking.length, tracking.byteOffset);
    const values = tracking.values;
    await Promise.resolve();
    storage.resize(12);
    console.log('resize:', tracking.length, fixed.length, values.call(tracking).next().value);
    const copied = new Int8Array(tracking);
    console.log('copy:', copied[0], copied.length, copied.buffer === storage);
    const integers = new BigInt64Array([1n, -1n, 18446744073709551617n]);
    console.log('bigint:', integers[0], integers[1], integers[2]);
    const bytes = new Uint8ClampedArray([0.5, 1.5, 2.5, 255.5]);
    console.log('clamped:', bytes[0], bytes[1], bytes[2], bytes[3]);
    storage.resize(2);
    console.log('bounds:', fixed.length, fixed.byteLength, fixed.byteOffset, fixed[0]);
    storage.resize(8);
    console.log('recover:', fixed.length, fixed[0]);
    storage.transfer();
    console.log('detach:', tracking.length, tracking[0]);
}
main();
