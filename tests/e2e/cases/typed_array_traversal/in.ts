async function main(): Promise<void> {
    const input = Int16Array.of(1, 2, 3, 4);
    const map = input.map;
    await Promise.resolve();
    const mapped = map.call(input, (value: number, index: number) => value * 10 + index);
    const selected = input.filter((value, index) => index % 2 === 0);
    console.log('mapped:', mapped[0], mapped[1], mapped[2], mapped[3]);
    console.log('selected:', selected.length, selected[0], selected[1]);
    console.log('search:', input.at(-1), input.includes(3), input.indexOf(3), input.lastIndexOf(3));
    console.log('find:', input.find(value => value > 2), input.findLast(value => value < 4), input.findLastIndex(value => value < 4));
    const total = input.reduce((previous, value) => previous + value, 0);
    const reversed = input.reduceRight((previous, value) => previous + String(value), '');
    console.log('reduce:', total, reversed);
    const result = BigInt64Array.of(1n, 2n, 3n).map((value, index) => value + BigInt(index));
    console.log('bigint:', result[0], result[1], result[2]);
}
main();
