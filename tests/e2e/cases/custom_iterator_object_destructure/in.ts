interface ObjectStep {
    done: boolean;
    value: any;
}

class ObjectIterator {
    entries: any[];
    index: number;

    constructor(entries: any[]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): ObjectIterator {
        return this;
    }

    next(): ObjectStep {
        if (this.index >= this.entries.length) {
            return { done: true, value: undefined };
        }
        const value = this.entries[this.index];
        this.index++;
        return { done: false, value };
    }
}

let output = "";
for (const { name: label, score = 0, ...rest } of new ObjectIterator([
    { name: "a", score: 1, extra: "x" },
    { name: "b", score: undefined, extra: "y" },
])) {
    output += `${label}:${score}:${String(rest.extra)}:${String(rest.name)};`;
}

console.log("custom", output);
