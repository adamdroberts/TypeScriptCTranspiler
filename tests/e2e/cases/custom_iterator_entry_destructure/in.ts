interface PairStep {
    done: boolean;
    value: ObjectEntry<number>;
}

class PairIterator {
    entries: ObjectEntry<number>[];
    index: number;

    constructor(entries: ObjectEntry<number>[]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): PairIterator {
        return this;
    }

    next(): PairStep {
        if (this.index >= this.entries.length) {
            return { done: true, value: ["", 0] };
        }
        const value = this.entries[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const iter = new PairIterator([["a", 2], ["b", 3], ["c", 5]]);
let total = 0;
let labels = "";
for (const [name, score] of iter) {
    total += score;
    labels += name + score;
}

console.log("labels:", labels);
console.log("total:", total);
