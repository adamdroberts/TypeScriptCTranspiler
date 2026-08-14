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
        points: [undefined, 2],
        cells: [{ label: "x", score: undefined }],
    },
    {
        name: "direct-b",
        points: [3, 4],
        cells: [{ label: "y", score: 5 }],
    },
];
let direct = "";
for (const {
    name: directName,
    points: [firstPoint = 10, secondPoint],
    cells: [{ label: directLabel, score: directScore = 30 }],
} of directRows) {
    direct += directName + ":" + firstPoint + ":" + secondPoint + ":" + directLabel + ":" + directScore + ";";
}
console.log("direct", direct);

const customRows: Row[] = [
    {
        name: "custom-a",
        points: [undefined, 6],
        cells: [{ label: "p", score: undefined }],
    },
    {
        name: "custom-b",
        points: [7, 8],
        cells: [{ label: "q", score: 9 }],
    },
];
let custom = "";
for (const {
    cells: [{ score: customScore = 40, label: customLabel }],
    points: [customFirst = 20, customSecond],
    name,
} of new RowIterator(customRows)) {
    custom += name + ":" + customFirst + ":" + customSecond + ":" + customLabel + ":" + customScore + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        {
            name: "lazy-a",
            points: [undefined, 10],
            cells: [{ label: "r", score: undefined }],
        },
        {
            name: "lazy-b",
            points: [11, 12],
            cells: [{ label: "s", score: 13 }],
        },
    ];
    for (const {
        name,
        points: [first = 30, second],
        cells: [{ label, score = 50 }],
    } of rows) {
        yield name + ":" + first + ":" + second + ":" + label + ":" + score;
    }
    return "typed-nested-array-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
