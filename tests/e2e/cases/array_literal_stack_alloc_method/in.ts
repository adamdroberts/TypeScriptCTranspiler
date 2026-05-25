function describe(): string {
    const values: number[] = [2, 5, 9];
    return values.join("-") + ":" + values.length;
}

console.log(describe());
