function describe(): string {
    const values: number[] = [1, 2, 3];
    const joined = values
        .reverse()
        .fill(4, 1, 2)
        .copyWithin(2, 0, 1)
        .join("-");
    return joined + ":" + (values.length + values[0]);
}

console.log(describe());
