interface DynamicStep {
    done: boolean;
    value: any;
}

class DynamicPairIterator {
    entries: any[];
    index: number;

    constructor(entries: any[]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): DynamicPairIterator {
        return this;
    }

    next(): DynamicStep {
        if (this.index >= this.entries.length) {
            return { done: true, value: undefined };
        }
        const value = this.entries[this.index];
        this.index++;
        return { done: false, value };
    }
}

let labels = "";
for (const [name, score] of new DynamicPairIterator([["a", 2], ["b", 3], ["c", 5]])) {
    labels += String(name) + String(score);
}

console.log("labels:", labels);
