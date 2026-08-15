interface Cell {
    label: string;
    score: number | undefined;
}

interface Row {
    name: string;
    points: Array<number | undefined>;
    cells: Cell[];
}

interface RowStep {
    done: boolean;
    value: Row;
}

class RowIterator {
    rows: Row[];
    index: number;

    constructor(rows: Row[]) {
        this.rows = rows;
        this.index = 0;
    }

    [Symbol.iterator](): RowIterator {
        return this;
    }

    next(): RowStep {
        if (this.index >= this.rows.length) {
            return {
                done: true,
                value: { name: "", points: [], cells: [] },
            };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directRows: Row[] = [
    {
        name: "direct-a",
        points: [undefined, 2, 3],
        cells: [{ label: "x", score: undefined }],
    },
    {
        name: "direct-b",
        points: [4, 5, 6],
        cells: [{ label: "y", score: 7 }],
    },
];
delete directRows[0]!.points[1];
let direct = "";
for (const {
    name,
    points: { 0: first = 10, 1: second = 20, 2: third },
    cells: { 0: { label, score = 30 } },
} of directRows) {
    direct += name + ":" + first + ":" + second + ":" + third + ":" + label + ":" + score + ";";
}
console.log("direct", direct);

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

const batches: Array<Array<number | undefined>> = [
    [undefined, 2, 3],
    [4, undefined, 6],
];
delete batches[0]![1];
let custom = "";
for (const { 0: first = 40, 1: second = 50, 2: third = 60 } of new BatchIterator(batches)) {
    custom += first + ":" + second + ":" + third + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        {
            name: "lazy-a",
            points: [undefined, 8, 9],
            cells: [{ label: "r", score: undefined }],
        },
        {
            name: "lazy-b",
            points: [10, 11, 12],
            cells: [{ label: "s", score: 13 }],
        },
    ];
    delete rows[0]!.points[1];
    for (const {
        name,
        points: { 0: first = 70, 1: second = 80 },
        cells: { 0: { label, score = 90 } },
    } of rows) {
        yield name + ":" + first + ":" + second + ":" + label + ":" + score;
    }
    return "typed-array-index-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
