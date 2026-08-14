interface ArrayStep {
    done: boolean;
    value: any[];
}

class ArrayRestIterator {
    entries: any[][];
    index: number;

    constructor(entries: any[][]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): ArrayRestIterator {
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

let labels = "";
for (const [head, ...tail] of new ArrayRestIterator([["a", 1, 2], ["b"], ["c", undefined, 4]])) {
    labels += String(head) + ":" + String(tail.length) + ":" + String(tail[0]) + ":" + String(tail[1]) + ";";
}

console.log("array", labels);
