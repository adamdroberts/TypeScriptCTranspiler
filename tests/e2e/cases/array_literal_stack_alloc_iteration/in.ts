function total(): number {
    const values: number[] = [2, 5, 9];
    let valueTotal = 0;
    for (const value of values) {
        valueTotal += value;
    }
    let keyTotal = 0;
    for (const key in values) {
        keyTotal += Number(key);
    }
    return valueTotal + keyTotal + values.length;
}

console.log(total());
