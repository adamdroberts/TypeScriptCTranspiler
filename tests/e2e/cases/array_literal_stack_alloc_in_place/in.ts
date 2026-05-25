function total(): number {
    const values: number[] = [3, 1, 2];
    values.reverse();
    values.fill(4, 1, 2);
    values.copyWithin(2, 0, 1);
    return values[0] + values[1] + values[2];
}

console.log(total());
