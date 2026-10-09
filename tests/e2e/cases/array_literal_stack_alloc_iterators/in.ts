function describe(): string {
    const values: number[] = [2, 5, 9];
    const keys = Array.from(values.keys()).join("|");
    const copied = Array.from(values.values());
    copied[1] = 7;
    const first = Array.from(values.entries())[0];
    return keys + ":" + copied.join("|") + ":" + values.join("|") + ":" + first[0] + "-" + first[1];
}

console.log(describe());

function escapedValues(): ArrayIterator<number> {
    const values: number[] = [11, 22];
    return values.values();
}

const escaped = escapedValues();
console.log(escaped.next().value, escaped.next().value, escaped.next().done);
