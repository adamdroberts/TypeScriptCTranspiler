interface Cell {
    label: string;
    values: Array<number>;
}

interface CellStep {
    done: boolean;
    value: Array<Cell>;
}

class CellIterator {
    batches: Array<Array<Cell>>;
    index: number;

    constructor(batches: Array<Array<Cell>>) {
        this.batches = batches;
        this.index = 0;
    }

    [Symbol.iterator](): CellIterator {
        return this;
    }

    next(): CellStep {
        if (this.index >= this.batches.length) {
            return { done: true, value: [] };
        }
        const value = this.batches[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directCells: Array<Array<Cell>> = [
    [
        { label: "direct-first", values: [] },
        { label: "direct-second", values: [] },
    ],
    [
        { label: "direct-third", values: [] },
        { label: "direct-fourth", values: [] },
    ],
];
const directFallbackFirst: Cell = { label: "direct-fallback-first", values: [] };
const directFallbackSecond: Cell = { label: "direct-fallback-second", values: [] };
delete directCells[0]![0];
delete directCells[1]![1];
let direct = "";
for (const [
    { label: firstLabel } = directFallbackFirst,
    { label: secondLabel } = directFallbackSecond,
] of directCells) {
    direct += firstLabel + ":" + secondLabel + ";";
}
console.log("direct", direct);

const customCells: Array<Array<Cell>> = [
    [
        { label: "custom-first", values: [] },
        { label: "custom-second", values: [] },
    ],
    [
        { label: "custom-third", values: [] },
        { label: "custom-fourth", values: [] },
    ],
];
const customFallbackFirst: Cell = { label: "custom-fallback-first", values: [] };
const customFallbackSecond: Cell = { label: "custom-fallback-second", values: [] };
delete customCells[0]![0];
delete customCells[1]![1];
let custom = "";
for (const [
    { label: firstLabel } = customFallbackFirst,
    { label: secondLabel } = customFallbackSecond,
] of new CellIterator(customCells)) {
    custom += firstLabel + ":" + secondLabel + ";";
}
console.log("custom", custom);

function* lazyCells(): Generator<string, string, number> {
    const cells: Array<Array<Cell>> = [
        [
            { label: "lazy-first", values: [] },
            { label: "lazy-second", values: [] },
        ],
        [
            { label: "lazy-third", values: [] },
            { label: "lazy-fourth", values: [] },
        ],
    ];
    const lazyFallbackFirst: Cell = { label: "lazy-fallback-first", values: [] };
    const lazyFallbackSecond: Cell = { label: "lazy-fallback-second", values: [] };
    delete cells[0]![0];
    delete cells[1]![1];
    for (const [
        { label: firstLabel } = lazyFallbackFirst,
        { label: secondLabel } = lazyFallbackSecond,
    ] of cells) {
        yield firstLabel + ":" + secondLabel;
    }
    return "nested-default-done";
}

const lazy = lazyCells();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);

const directNumbers: Array<Array<Array<number>>> = [
    [[1, 2], [3, 4]],
    [[5], [6, 7]],
];
const firstNumberFallback: Array<number> = [11, 12];
const secondNumberFallback: Array<number> = [21, 22];
delete directNumbers[0]![1];
delete directNumbers[1]![0];
let numbers = "";
for (const [
    [first = 10, ...firstTail] = firstNumberFallback,
    [second = 20, ...secondTail] = secondNumberFallback,
] of directNumbers) {
    numbers += first + ":" + firstTail.length + ":" + firstTail[0] + ":" + second + ":" + secondTail.length + ":" + secondTail[0] + ";";
}
console.log("numbers", numbers);

const dynamic: any[] = [
    [undefined, undefined],
    [{ label: "dynamic-real" }, [31, 32]],
];
let dynamicOutput = "";
for (const [
    { label } = { label: "dynamic-fallback" },
    [first = 30, ...tail] = [40, 41],
] of dynamic) {
    dynamicOutput += label + ":" + first + ":" + tail.length + ":" + tail[0] + ";";
}
console.log("dynamic", dynamicOutput);
