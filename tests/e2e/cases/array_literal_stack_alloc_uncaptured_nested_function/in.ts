function total(): number {
    const values: number[] = [4, 6];

    const inc = (n: number): number => n + 1;

    values[1] = inc(values[0]);
    return values.length + values[1];
}

console.log(total());
