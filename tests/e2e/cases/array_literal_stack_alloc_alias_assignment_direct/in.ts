function describe(): string {
    const values: number[] = [2, 4];
    let alias: number[] = undefined as any;
    let second: number[] = undefined as any;
    alias = values;
    second = alias;
    second.push(6);
    alias.unshift(0);
    second[2] = 5;
    return [
        values.length,
        alias.join("|"),
        second.join("|"),
        values.join("|"),
    ].join(":");
}

console.log(describe());
