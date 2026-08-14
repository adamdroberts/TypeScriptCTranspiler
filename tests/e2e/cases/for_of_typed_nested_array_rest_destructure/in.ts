interface Cell {
    label: string;
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
            return { done: true, value: { name: "", points: [], cells: [] } };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directRows: Row[] = [
    {
        name: "direct-a",
        points: [undefined, 0, 3],
        cells: [{ label: "x" }],
    },
    {
        name: "direct-b",
        points: [4, 5, 6],
        cells: [{ label: "y" }],
    },
];
delete directRows[0]!.points[1];
let direct = "";
for (const {
    name: directName,
    points: [first = 10, ...tail],
    cells: [{ label: directLabel }],
} of directRows) {
    direct += directName + ":" + first + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ":" + directLabel + ";";
}
console.log("direct", direct);

const customRows: Row[] = [
    {
        name: "custom-a",
        points: [1, undefined, 7],
        cells: [{ label: "p" }],
    },
    {
        name: "custom-b",
        points: [8, 9, 10],
        cells: [{ label: "q" }],
    },
];
let custom = "";
for (const {
    cells: [{ label: customLabel }],
    points: [customFirst, ...customTail],
    name,
} of new RowIterator(customRows)) {
    custom += name + ":" + customFirst + ":" + customTail.length + ":" + customTail[0] + ":" + customTail[1] + ":" + customLabel + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        {
            name: "lazy-a",
            points: [undefined, 0, 11],
            cells: [{ label: "r" }],
        },
        {
            name: "lazy-b",
            points: [12, 13, 14],
            cells: [{ label: "s" }],
        },
    ];
    delete rows[0]!.points[1];
    for (const {
        name,
        points: [first = 30, ...tail],
        cells: [{ label }],
    } of rows) {
        yield name + ":" + first + ":" + tail.length + ":" + tail[0] + ":" + tail[1] + ":" + label;
    }
    return "typed-nested-array-rest-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
