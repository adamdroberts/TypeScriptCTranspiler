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

let customLabels = "";
let customTotal = 0;
for (const [name = "custom-fallback", score = 99] of new PairIterator([["a", 2], ["b", 3]])) {
    customLabels += name + ":" + score + ";";
    customTotal += score;
}
console.log("custom", customLabels);
console.log("custom-total", customTotal);

function* lazyTypedDefaults(): Generator<string, string, number> {
    const values = new Map<string, number>();
    values.set("x", 4);
    values.set("y", 6);
    for (const [key = "lazy-fallback", value = 77] of values) {
        yield key + ":" + value;
    }
    return "typed-done";
}

const lazy = lazyTypedDefaults();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
