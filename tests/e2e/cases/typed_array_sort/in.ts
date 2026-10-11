async function main(): Promise<void> {
    const source = Float64Array.of(10, -0, 2, 0, NaN, -1);
    const custom = Float64Array.of(10, 2, -1, 0);
    const sort = custom.sort;
    await Promise.resolve();
    const copied = source.toSorted();
    console.log('numeric:', copied[0], Object.is(copied[1], -0), copied[2], copied[3], copied[4], copied[5]);
    sort.call(custom, (left: number, right: number) => right - left);
    console.log('custom:', custom[0], custom[1], custom[2], custom[3]);
    const integers = BigInt64Array.of(10n, 2n, -1n).toSorted();
    console.log('bigint:', integers[0], integers[1], integers[2]);
    class Derived extends Int16Array {}
    const derived = Derived.of(3, 1, 2);
    const result = derived.toSorted();
    console.log('derived:', result instanceof Int16Array, result instanceof Derived, result[0], derived[0]);
    console.log('array:', [10, 2, 1].sort().join(','));
}
main();
