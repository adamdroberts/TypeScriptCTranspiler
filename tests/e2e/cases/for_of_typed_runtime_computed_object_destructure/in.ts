interface Profile {
    red: string;
    blue: string;
    keep: string;
}

interface Row {
    first: string;
    second: string;
    profile: Profile;
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
                    first: "",
                    second: "",
                    profile: { red: "", blue: "", keep: "" },
                    extra: "",
                },
            };
        }
        const value = this.rows[this.index]!;
        this.index++;
        return { done: false, value };
    }
}

let rowKeyReads = 0;
let profileKeyReads = 0;
function nextRowKey(): "first" | "second" {
    rowKeyReads++;
    return rowKeyReads % 2 === 1 ? "first" : "second";
}
function nextProfileKey(): "red" | "blue" {
    profileKeyReads++;
    return profileKeyReads % 2 === 1 ? "red" : "blue";
}

const directRows: Row[] = [
    {
        first: "direct-first-a",
        second: "direct-second-a",
        profile: { red: "direct-red-a", blue: "direct-blue-a", keep: "direct-keep-a" },
        extra: "direct-extra-a",
    },
    {
        first: "direct-first-b",
        second: "direct-second-b",
        profile: { red: "direct-red-b", blue: "direct-blue-b", keep: "direct-keep-b" },
        extra: "direct-extra-b",
    },
];
rowKeyReads = 0;
profileKeyReads = 0;
let direct = "";
for (const {
    [nextRowKey()]: selected,
    profile: { [nextProfileKey()]: nested, ...profileRest },
    ...outerRest
} of directRows) {
    direct += selected + ":" + nested + ":" + profileRest.keep + ":" + outerRest.extra + ":" + String((outerRest as any).first) + ":" + String((outerRest as any).second) + ":" + String((profileRest as any).red) + ":" + String((profileRest as any).blue) + ";";
}
console.log("direct", direct, rowKeyReads, profileKeyReads);

const customRows: Row[] = [
    {
        first: "custom-first-a",
        second: "custom-second-a",
        profile: { red: "custom-red-a", blue: "custom-blue-a", keep: "custom-keep-a" },
        extra: "custom-extra-a",
    },
    {
        first: "custom-first-b",
        second: "custom-second-b",
        profile: { red: "custom-red-b", blue: "custom-blue-b", keep: "custom-keep-b" },
        extra: "custom-extra-b",
    },
];
rowKeyReads = 0;
profileKeyReads = 0;
let custom = "";
for (const {
    [nextRowKey()]: selected,
    profile: { [nextProfileKey()]: nested },
} of new RowIterator(customRows)) {
    custom += selected + ":" + nested + ";";
}
console.log("custom", custom, rowKeyReads, profileKeyReads);

function* lazyRows(): Generator<string, string, number> {
    const rows: Row[] = [
        {
            first: "lazy-first-a",
            second: "lazy-second-a",
            profile: { red: "lazy-red-a", blue: "lazy-blue-a", keep: "lazy-keep-a" },
            extra: "lazy-extra-a",
        },
        {
            first: "lazy-first-b",
            second: "lazy-second-b",
            profile: { red: "lazy-red-b", blue: "lazy-blue-b", keep: "lazy-keep-b" },
            extra: "lazy-extra-b",
        },
    ];
    rowKeyReads = 0;
    profileKeyReads = 0;
    for (const {
        [nextRowKey()]: selected,
        profile: { [nextProfileKey()]: nested },
    } of rows) {
        yield selected + ":" + nested;
    }
    return "runtime-computed-done";
}

const lazy = lazyRows();
const lazy1: any = lazy.next(0);
const lazy2: any = lazy.next(0);
const lazy3: any = lazy.next(0);
console.log("lazy1", lazy1.done, lazy1.value);
console.log("lazy2", lazy2.done, lazy2.value);
console.log("lazy3", lazy3.done, lazy3.value, rowKeyReads, profileKeyReads);
