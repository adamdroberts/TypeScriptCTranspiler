interface AnyStep {
    done: boolean;
    value: any;
}

class AnyIterator {
    batches: any[];
    index: number;

    constructor(batches: any[]) {
        this.batches = batches;
        this.index = 0;
    }

    [Symbol.iterator](): AnyIterator {
        return this;
    }

    next(): AnyStep {
        if (this.index >= this.batches.length) {
            return { done: true, value: undefined };
        }
        const value = this.batches[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const direct: any[] = [
    [
        { label: "direct-a", values: [undefined, 2, 3], extra: "extra-a" },
        [undefined, 4, 5],
        "remaining-a",
    ],
    [
        { label: "direct-b", values: [1, 2], extra: "extra-b" },
        [6, undefined],
    ],
];
delete direct[0]![0].values[1];
let directOutput = "";
for (const [
    { label, values: [first = 10, ...tail], ...rest },
    [second = 20, ...secondTail],
    ...remaining
] of direct) {
    directOutput += label + ":" + first + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ":" + rest.extra + ":" + second + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + remaining.length + ";";
}
console.log("direct", directOutput);

const custom: any[] = [
    [
        { label: "custom-a", values: [3, undefined], extra: "extra-c" },
        [undefined, 7],
    ],
    [
        { label: "custom-b", values: [8, 9], extra: "extra-d" },
        [10, undefined, 12],
    ],
];
let customOutput = "";
for (const [
    { label, values: [first = 30, ...tail], ...rest },
    [second = 40, ...secondTail],
    ...remaining
] of new AnyIterator(custom)) {
    customOutput += label + ":" + first + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ":" + rest.extra + ":" + second + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + remaining.length + ";";
}
console.log("custom", customOutput);

function* lazyBatches(): Generator<string, string, number> {
    const batches: any[] = [
        [
            { label: "lazy-a", values: [undefined, 14], extra: "extra-l" },
            [15, undefined],
        ],
        [
            { label: "lazy-b", values: [16, 17], extra: "extra-m" },
            [undefined, 18, 19],
        ],
    ];
    for (const [
        { label, values: [first = 50, ...tail], ...rest },
        [second = 60, ...secondTail],
        ...remaining
    ] of batches) {
        yield label + ":" + first + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ":" + rest.extra + ":" + second + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + remaining.length;
    }
    return "dynamic-nested-array-done";
}

const lazy = lazyBatches();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
