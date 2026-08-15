interface Profile {
    label: string;
    score: number;
    note: string;
}

interface Row {
    name: string;
    profile: Profile;
    score: number | undefined;
    extra: string;
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
                value: {
                    name: "",
                    profile: { label: "", score: 0, note: "" },
                    score: 0,
                    extra: "",
                },
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
        profile: { label: "x", score: 2, note: "alpha" },
        score: undefined,
        extra: "outer-a",
    },
    {
        name: "direct-b",
        profile: { label: "y", score: 5, note: "beta" },
        score: 6,
        extra: "outer-b",
    },
];
const directNameKey = "name";
const directProfileKey = "profile";
const directLabelKey = "label";
let direct = "";
for (const {
    [directNameKey]: name,
    [directProfileKey]: { [directLabelKey]: label, score: profileScore = 1 },
    score = 10,
    ...outerRest
} of directRows) {
    direct += name + ":" + label + ":" + profileScore + ":" + score + ":" + outerRest.extra + ":" + String((outerRest as any).profile) + ";";
}
console.log("direct", direct);

const customRows: Row[] = [
    {
        name: "custom-a",
        profile: { label: "p", score: 8, note: "one" },
        score: undefined,
        extra: "outer-p",
    },
    {
        name: "custom-b",
        profile: { label: "q", score: 11, note: "two" },
        score: 12,
        extra: "outer-q",
    },
];
const customNameKey = "name";
const customProfileKey = "profile";
const customLabelKey = "label";
let custom = "";
for (const {
    [customProfileKey]: { [customLabelKey]: label },
    [customNameKey]: name,
    score = 20,
    ...outerRest
} of new RowIterator(customRows)) {
    custom += name + ":" + label + ":" + score + ":" + outerRest.extra + ";";
}
console.log("custom", custom);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        {
            name: "lazy-a",
            profile: { label: "r", score: 14, note: "red" },
            score: undefined,
            extra: "outer-r",
        },
        {
            name: "lazy-b",
            profile: { label: "s", score: 17, note: "blue" },
            score: 18,
            extra: "outer-s",
        },
    ];
    const nameKey = "name";
    const profileKey = "profile";
    const labelKey = "label";
    for (const {
        [nameKey]: name,
        [profileKey]: { [labelKey]: label, score: profileScore = 1 },
        score = 30,
        ...outerRest
    } of rows) {
        yield name + ":" + label + ":" + profileScore + ":" + score + ":" + outerRest.extra;
    }
    return "typed-computed-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value);
