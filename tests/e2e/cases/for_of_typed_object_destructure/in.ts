interface Row {
    label: string;
    score: number | undefined;
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
            return { done: true, value: { label: "", score: 0 } };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directRows: Row[] = [
    { label: "direct-a", score: undefined },
    { label: "direct-b", score: 2 },
];
let direct = "";
for (const { label: name, score = 40 } of directRows) {
    direct += name + ":" + score + ";";
}
console.log("direct", direct);

const customRows: Row[] = [
    { label: "custom-a", score: undefined },
    { label: "custom-b", score: 4 },
];
let custom = "";
for (const { label: name, score: points = 30 } of new RowIterator(customRows)) {
    custom += name + ":" + points + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        { label: "lazy-a", score: undefined },
        { label: "lazy-b", score: 6 },
    ];
    for (const { label, score = 20 } of rows) {
        yield label + ":" + score;
    }
    return "typed-object-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
