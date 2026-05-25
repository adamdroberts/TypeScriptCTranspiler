function total(): number {
    const values: number[] = [2];
    const afterPush = values.push(5, 9);
    const afterUnshift = values.unshift(1);
    return afterPush + afterUnshift + values.length + values[0] + values[3];
}

console.log(total());
