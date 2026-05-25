function describe(): string {
    const values: number[] = [3, 1, 2];
    const sorted = values.sort();
    const reversed = sorted.reverse();
    return [
        reversed[0],
        Object.values(reversed).join("|"),
        Object.keys(sorted).join("|"),
        Object.prototype.toString.call(reversed),
        values.join("|"),
    ].join(":");
}

console.log(describe());
