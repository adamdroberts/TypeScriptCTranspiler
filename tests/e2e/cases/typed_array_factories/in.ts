async function main(): Promise<void> {
    const from = Uint16Array.from;
    const input = [1, 2, 3, 4];
    await Promise.resolve();
    const mapped = from.call(Uint16Array, input, (value: number, index: number) => value * 10 + index);
    console.log('mapped:', mapped[0], mapped[1], mapped[2], mapped[3]);
    const args = [257, -1, 3];
    const bytes = Uint8Array.of(...args);
    console.log('actuals:', bytes.length, bytes[0], bytes[1], bytes[2]);
    const integers = BigInt64Array.from([1, 2, 3], (value, index) => BigInt(value + index));
    console.log('bigint:', integers[0], integers[1], integers[2]);
    class Derived extends Float16Array {}
    const derived = Derived.of(1.0004882812500002, 2.5);
    console.log('derived:', derived instanceof Derived, derived instanceof Float16Array, derived[0], derived[1]);
}
main();
