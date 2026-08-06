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

interface ArrayStep {
    done: boolean;
    value: any[];
}

class ArrayPairIterator {
    entries: any[][];
    index: number;

    constructor(entries: any[][]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): ArrayPairIterator {
        return this;
    }

    next(): ArrayStep {
        if (this.index >= this.entries.length) {
            return { done: true, value: [] };
        }
        const value = this.entries[this.index];
        this.index++;
        return { done: false, value };
    }
}

let arrayLabels = "";
for (const [name, score] of new ArrayPairIterator([["x", 7], ["y", 8]])) {
    arrayLabels += String(name) + String(score);
}

console.log("array labels:", arrayLabels);
