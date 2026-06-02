function makeReader(): () => number {
    const values: number[] = [2, 5];
    return () => values[0] + values[1];
}

const read = makeReader();

console.log(read());
