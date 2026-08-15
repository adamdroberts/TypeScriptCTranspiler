interface BatchStep {
    done: boolean;
    value: Array<number | undefined>;
}

class BatchIterator {
    batches: Array<Array<number | undefined>>;
    index: number;

    constructor(batches: Array<Array<number | undefined>>) {
        this.batches = batches;
        this.index = 0;
    }

    [Symbol.iterator](): BatchIterator {
        return this;
    }

    next(): BatchStep {
        if (this.index >= this.batches.length) {
            return { done: true, value: [] };
        }
        const value = this.batches[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directBatches: Array<Array<number | undefined>> = [
    [undefined, 2, 3, 4],
    [5, 6, 7],
];
delete directBatches[0]![1];
let direct = "";
for (const [first = 10, second = 20, ...tail] of directBatches) {
    direct += first + ":" + second + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ";";
}
console.log("direct", direct);

const customBatches: Array<Array<number | undefined>> = [
    [1, undefined, 3],
    [4, 5, undefined, 7],
];
let custom = "";
for (const [first, second = 30, ...tail] of new BatchIterator(customBatches)) {
    custom += first + ":" + second + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ";";
}
console.log("custom", custom);

function* lazyBatches(): Generator<string, string, number> {
    const batches: Array<Array<number | undefined>> = [
        [undefined, 8, undefined, 9],
        [10, 11, 12],
    ];
    delete batches[0]![1];
    for (const [first = 40, second = 50, ...tail] of batches) {
        yield first + ":" + second + ":" + tail.length + ":" + tail[0] + ":" + tail[1];
    }
    return "typed-array-element-done";
}

const lazy = lazyBatches();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
