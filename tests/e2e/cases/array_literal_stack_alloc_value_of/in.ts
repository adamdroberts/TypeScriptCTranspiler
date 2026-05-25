function describe(): string {
    const values: number[] = [4, 5, 6];
    const same = Object.prototype.valueOf.call(values);
    const copied = Object.prototype.valueOf.call(same).slice(0);
    return [
        same[1],
        Object.keys(copied).join("|"),
        copied.join("|"),
        values.join("|"),
    ].join(":");
}

console.log(describe());
