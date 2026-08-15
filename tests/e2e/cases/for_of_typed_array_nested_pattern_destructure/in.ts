interface Cell {
    label: string;
    score: number | undefined;
    points: Array<number | undefined>;
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

const directBatches: Array<Array<Cell>> = [
    [
        { label: "direct-a", score: undefined, points: [undefined, 2, 3] },
        { label: "direct-b", score: 4, points: [5, undefined, 7] },
        { label: "direct-c", score: 8, points: [9] },
    ],
    [
        { label: "direct-d", score: 10, points: [11] },
        { label: "direct-e", score: undefined, points: [undefined, 13] },
    ],
];
delete directBatches[0]![0]!.points[1];
let direct = "";
for (const [
    { label: firstLabel, score: firstScore = 10, points: [firstPoint = 20, ...firstTail], ...firstRest },
    { label: secondLabel, score: secondScore = 30, points: [secondPoint = 40, ...secondTail], ...secondRest },
    ...remaining
] of directBatches) {
    direct += firstLabel + ":" + firstScore + ":" + firstPoint + ":" + firstTail.length + ":" + firstTail[0] + ":" + firstTail[1] + ":" + String((firstRest as any).score) + ":" + secondLabel + ":" + secondScore + ":" + secondPoint + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + String((secondRest as any).score) + ":" + remaining.length + ";";
}
console.log("direct", direct);

const customBatches: Array<Array<Cell>> = [
    [
        { label: "custom-a", score: 1, points: [2, undefined, 4] },
        { label: "custom-b", score: undefined, points: [undefined, 6, 7] },
    ],
    [
        { label: "custom-c", score: 8, points: [9, 10] },
        { label: "custom-d", score: 11, points: [undefined, 12] },
    ],
];
let custom = "";
for (const [
    { label: firstLabel, score: firstScore = 50, points: [firstPoint = 60, ...firstTail], ...firstRest },
    { label: secondLabel, score: secondScore = 70, points: [secondPoint = 80, ...secondTail], ...secondRest },
    ...remaining
] of new BatchIterator(customBatches)) {
    custom += firstLabel + ":" + firstScore + ":" + firstPoint + ":" + firstTail.length + ":" + firstTail[0] + ":" + firstTail[1] + ":" + String((firstRest as any).score) + ":" + secondLabel + ":" + secondScore + ":" + secondPoint + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + String((secondRest as any).score) + ":" + remaining.length + ";";
}
console.log("custom", custom);

function* lazyBatches(): Generator<string, string, number> {
    const batches: Array<Array<Cell>> = [
        [
            { label: "lazy-a", score: undefined, points: [undefined, 14] },
            { label: "lazy-b", score: 15, points: [16, undefined, 18] },
        ],
        [
            { label: "lazy-c", score: 19, points: [20] },
            { label: "lazy-d", score: undefined, points: [undefined, 22] },
        ],
    ];
    delete batches[0]![1]!.points[1];
    for (const [
        { label: firstLabel, score: firstScore = 90, points: [firstPoint = 91, ...firstTail], ...firstRest },
        { label: secondLabel, score: secondScore = 92, points: [secondPoint = 93, ...secondTail], ...secondRest },
        ...remaining
    ] of batches) {
        yield firstLabel + ":" + firstScore + ":" + firstPoint + ":" + firstTail.length + ":" + firstTail[0] + ":" + firstTail[1] + ":" + String((firstRest as any).score) + ":" + secondLabel + ":" + secondScore + ":" + secondPoint + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ":" + String((secondRest as any).score) + ":" + remaining.length;
    }
    return "typed-array-nested-pattern-done";
}

const lazy = lazyBatches();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);

const nestedNumbers: Array<Array<Array<number | undefined>>> = [
    [[undefined, 2, 3], [4, undefined, 6]],
    [[7, 8], [undefined, 10]],
];
delete nestedNumbers[0]![0]![1];
let nested = "";
for (const [[first = 50, ...firstTail], [second = 60, ...secondTail]] of nestedNumbers) {
    nested += first + ":" + firstTail.length + ":" + firstTail[0] + ":" + firstTail[1] + ":" + second + ":" + secondTail.length + ":" + secondTail[0] + ":" + secondTail[1] + ";";
}
console.log("nested", nested);
