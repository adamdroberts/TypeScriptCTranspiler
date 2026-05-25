function describe(): string {
    const values: number[] = [2, 5, 9];
    const keys = values.keys().join("|");
    const copied = values.values();
    copied[1] = 7;
    const first = values.entries()[0];
    return keys + ":" + copied.join("|") + ":" + values.join("|") + ":" + first[0] + "-" + first[1];
}

console.log(describe());
