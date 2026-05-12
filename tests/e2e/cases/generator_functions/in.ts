function* range(start: number, end: number): IterableIterator<number> {
    yield* [start, start + 1];
    for (let n = start + 2; n <= end; n++) {
        yield n;
    }
}

function* labels(): IterableIterator<string> {
    yield* ["alpha", "beta"];
    yield* "!";
    return "done";
}

const nums: number[] = [];
for (const n of range(2, 5)) {
    nums.push(n);
}

const words: string[] = [];
for (const label of labels()) {
    words.push(label);
}

console.log("range:", nums.join(","));
console.log("labels:", words.join("|"));
