interface Profile {
    label: string;
    score: number | undefined;
}

interface Cell {
    label: string;
    score: number | undefined;
}

interface Row {
    name: string;
    profile: Profile | undefined;
    cells: Array<Cell>;
}

interface RowStep {
    done: boolean;
    value: Row;
}

class RowIterator {
    rows: Array<Row>;
    index: number;

    constructor(rows: Array<Row>) {
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
                value: { name: "", profile: undefined, cells: [] },
            };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

const directRows: Array<Row> = [
    {
        name: "direct-a",
        profile: undefined,
        cells: [
            { label: "direct-first", score: undefined },
            { label: "direct-second", score: 2 },
        ],
    },
    {
        name: "direct-b",
        profile: { label: "direct-real", score: 3 },
        cells: [{ label: "direct-third", score: 4 }, { label: "direct-fourth", score: 5 }],
    },
];
const directProfileFallback: Profile = { label: "direct-profile-fallback", score: undefined };
const directFirstFallback: Cell = { label: "direct-first-fallback", score: undefined };
const directSecondFallback: Cell = { label: "direct-second-fallback", score: 80 };
delete directRows[0]!.cells[0];
delete directRows[1]!.cells[1];
let direct = "";
for (const {
    name,
    profile: { label: profileLabel, score: profileScore = 70 } = directProfileFallback,
    cells: [
        { label: firstLabel, score: firstScore = 80 } = directFirstFallback,
        { label: secondLabel, score: secondScore } = directSecondFallback,
    ],
} of directRows) {
    direct += name + ":" + profileLabel + ":" + profileScore + ":" + firstLabel + ":" + firstScore + ":" + secondLabel + ":" + secondScore + ";";
}
console.log("direct", direct);

const customRows: Array<Row> = [
    {
        name: "custom-a",
        profile: undefined,
        cells: [{ label: "custom-first", score: undefined }, { label: "custom-second", score: 6 }],
    },
    {
        name: "custom-b",
        profile: { label: "custom-real", score: 7 },
        cells: [{ label: "custom-third", score: 8 }, { label: "custom-fourth", score: 9 }],
    },
];
const customProfileFallback: Profile = { label: "custom-profile-fallback", score: undefined };
const customFirstFallback: Cell = { label: "custom-first-fallback", score: undefined };
const customSecondFallback: Cell = { label: "custom-second-fallback", score: 90 };
delete customRows[0]!.cells[0];
delete customRows[1]!.cells[1];
let custom = "";
for (const {
    name,
    profile: { label: profileLabel, score: profileScore = 71 } = customProfileFallback,
    cells: [
        { label: firstLabel, score: firstScore = 81 } = customFirstFallback,
        { label: secondLabel, score: secondScore } = customSecondFallback,
    ],
} of new RowIterator(customRows)) {
    custom += name + ":" + profileLabel + ":" + profileScore + ":" + firstLabel + ":" + firstScore + ":" + secondLabel + ":" + secondScore + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Array<Row> = [
        {
            name: "lazy-a",
            profile: undefined,
            cells: [{ label: "lazy-first", score: undefined }, { label: "lazy-second", score: 10 }],
        },
        {
            name: "lazy-b",
            profile: { label: "lazy-real", score: 11 },
            cells: [{ label: "lazy-third", score: 12 }, { label: "lazy-fourth", score: 13 }],
        },
    ];
    const profileFallback: Profile = { label: "lazy-profile-fallback", score: undefined };
    const firstFallback: Cell = { label: "lazy-first-fallback", score: undefined };
    const secondFallback: Cell = { label: "lazy-second-fallback", score: 100 };
    delete rows[0]!.cells[0];
    delete rows[1]!.cells[1];
    for (const {
        name,
        profile: { label: profileLabel, score: profileScore = 72 } = profileFallback,
        cells: [
            { label: firstLabel, score: firstScore = 82 } = firstFallback,
            { label: secondLabel, score: secondScore } = secondFallback,
        ],
    } of rows) {
        yield name + ":" + profileLabel + ":" + profileScore + ":" + firstLabel + ":" + firstScore + ":" + secondLabel + ":" + secondScore;
    }
    return "deeper-default-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);

const dynamicRows: any[] = [
    {
        profile: undefined,
        cells: [undefined, { label: "dynamic-second", score: 14 }],
    },
    {
        profile: { label: "dynamic-real", score: 15 },
        cells: [{ label: "dynamic-third", score: undefined }, undefined],
    },
];
const dynamicProfileFallback = { label: "dynamic-profile-fallback", score: undefined };
const dynamicFirstFallback = { label: "dynamic-first-fallback", score: undefined };
const dynamicSecondFallback = { label: "dynamic-second-fallback", score: 110 };
let dynamic = "";
for (const {
    profile: { label: profileLabel, score: profileScore = 73 } = dynamicProfileFallback,
    cells: [
        { label: firstLabel, score: firstScore = 83 } = dynamicFirstFallback,
        { label: secondLabel, score: secondScore } = dynamicSecondFallback,
    ],
} of dynamicRows) {
    dynamic += profileLabel + ":" + profileScore + ":" + firstLabel + ":" + firstScore + ":" + secondLabel + ":" + secondScore + ";";
}
console.log("dynamic", dynamic);
