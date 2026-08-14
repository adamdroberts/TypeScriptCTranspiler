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

let dynamicLabels = "";
for (const [name = "dynamic-name", score = 10] of new DynamicPairIterator([[undefined, undefined], ["d", 2]])) {
    dynamicLabels += String(name) + ":" + String(score) + ";";
}
console.log("dynamic", dynamicLabels);

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
for (const [name = "array-name", score = 20] of new ArrayPairIterator([[], ["a", undefined]])) {
    arrayLabels += String(name) + ":" + String(score) + ";";
}
console.log("array", arrayLabels);

function* lazyDefaults(): Generator<string, string, number> {
    const entries: any = [[undefined, undefined], ["l", 3]];
    for (const [name = "lazy-name", score = 30] of entries) {
        yield String(name) + ":" + String(score);
    }
    return "lazy-done";
}

const lazy = lazyDefaults();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
