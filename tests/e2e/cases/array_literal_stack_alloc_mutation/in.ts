function total(): number {
    const values: number[] = [2, 5, 9];
    values.pop();
    values.shift();
    return values.length + values[0];
}

console.log(total());
