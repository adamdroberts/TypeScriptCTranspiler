interface Profile {
    label: string;
    score: number | undefined;
}

interface Row {
    name: string;
    profile: Profile;
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
                value: { name: "", profile: { label: "", score: 0 } },
            };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directRows: Row[] = [
    { name: "direct-a", profile: { label: "x", score: undefined } },
    { name: "direct-b", profile: { label: "y", score: 2 } },
];
let direct = "";
for (const { name, profile: { label: profileLabel, score = 40 } } of directRows) {
    direct += name + ":" + profileLabel + ":" + score + ";";
}
console.log("direct", direct);

const customRows: Row[] = [
    { name: "custom-a", profile: { label: "p", score: undefined } },
    { name: "custom-b", profile: { label: "q", score: 4 } },
];
let custom = "";
for (const { profile: { label: profileLabel, score: points = 30 }, name } of new RowIterator(customRows)) {
    custom += name + ":" + profileLabel + ":" + points + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        { name: "lazy-a", profile: { label: "r", score: undefined } },
        { name: "lazy-b", profile: { label: "s", score: 6 } },
    ];
    for (const { name, profile: { label, score = 20 } } of rows) {
        yield name + ":" + label + ":" + score;
    }
    return "typed-nested-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
