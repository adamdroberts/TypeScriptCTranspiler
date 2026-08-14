interface DynamicStep {
    done: boolean;
    value: any;
}

class DynamicRestIterator {
    entries: any[];
    index: number;

    constructor(entries: any[]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): DynamicRestIterator {
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
for (const [head, ...tail] of new DynamicRestIterator([["a", 1, 2], ["b"]])) {
    labels += String(head) + ":" + String(tail.length) + ":" + String(tail[0]) + ":" + String(tail[1]) + ";";
}

console.log("dynamic", labels);
