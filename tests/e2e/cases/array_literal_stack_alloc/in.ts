function total(): number {
    const values: number[] = [2, 5, 9];
    values[1] = values[0] + 1;
    return values.length + values[1] + values[2];
}

console.log(total());
