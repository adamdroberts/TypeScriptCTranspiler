function describe(): string {
    const values: number[] = [1, 2, 3];
    const alias = values;
    const second = alias;
    second[1] = 7;
    second.reverse();
    const same = Object.prototype.valueOf.call(second);
    return [
        same[0],
        Object.keys(alias).join("|"),
        Object.values(second).join("|"),
        Object.prototype.toString.call(alias),
        values.join("|"),
    ].join(":");
}

console.log(describe());
