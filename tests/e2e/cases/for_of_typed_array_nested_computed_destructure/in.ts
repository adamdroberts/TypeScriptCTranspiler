interface Cell {
    red: string;
    blue: string;
    keep: string;
}

interface BatchStep {
    done: boolean;
    value: Array<Cell>;
}

class BatchIterator {
    batches: Array<Array<Cell>>;
    index: number;

    constructor(batches: Array<Array<Cell>>) {
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

let keyReads = 0;
function nextKey(): "red" | "blue" {
    keyReads++;
    return keyReads % 2 === 1 ? "red" : "blue";
}

const directBatches: Array<Array<Cell>> = [
    [
        { red: "direct-red-a", blue: "direct-blue-a", keep: "direct-keep-a" },
        { red: "direct-red-b", blue: "direct-blue-b", keep: "direct-keep-b" },
    ],
    [
        { red: "direct-red-c", blue: "direct-blue-c", keep: "direct-keep-c" },
        { red: "direct-red-d", blue: "direct-blue-d", keep: "direct-keep-d" },
    ],
];
keyReads = 0;
let direct = "";
for (const [{ [nextKey()]: selected, ...rest }] of directBatches) {
    direct += selected + ":" + rest.keep + ":" + String((rest as any).red) + ":" + String((rest as any).blue) + ";";
}
console.log("direct", direct, keyReads);

const customBatches: Array<Array<Cell>> = [
    [
        { red: "custom-red-a", blue: "custom-blue-a", keep: "custom-keep-a" },
        { red: "custom-red-b", blue: "custom-blue-b", keep: "custom-keep-b" },
    ],
    [
        { red: "custom-red-c", blue: "custom-blue-c", keep: "custom-keep-c" },
        { red: "custom-red-d", blue: "custom-blue-d", keep: "custom-keep-d" },
    ],
];
keyReads = 0;
let custom = "";
for (const [{ [nextKey()]: selected, ...rest }] of new BatchIterator(customBatches)) {
    custom += selected + ":" + rest.keep + ";";
}
console.log("custom", custom, keyReads);

function* lazyBatches(): Generator<string, string, number> {
    const batches: Array<Array<Cell>> = [
        [
            { red: "lazy-red-a", blue: "lazy-blue-a", keep: "lazy-keep-a" },
            { red: "lazy-red-b", blue: "lazy-blue-b", keep: "lazy-keep-b" },
        ],
        [
            { red: "lazy-red-c", blue: "lazy-blue-c", keep: "lazy-keep-c" },
            { red: "lazy-red-d", blue: "lazy-blue-d", keep: "lazy-keep-d" },
        ],
    ];
    keyReads = 0;
    for (const [{ [nextKey()]: selected, ...rest }] of batches) {
        yield selected + ":" + rest.keep;
    }
    return "typed-array-nested-computed-done";
}

const lazy = lazyBatches();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value, keyReads);
