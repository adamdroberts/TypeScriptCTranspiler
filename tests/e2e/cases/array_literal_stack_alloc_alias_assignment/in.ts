function describe(): string {
    const values: number[] = [4, 5, 6];
    let alias: number[] = undefined as any;
    if (true) {
        alias = values.reverse();
    }
    return [
        alias[0],
        alias.join("|"),
        values.join("|"),
    ].join(":");
}

console.log(describe());
