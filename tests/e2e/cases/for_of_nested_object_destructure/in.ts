const directRows: any[] = [
    { name: "direct-a", profile: { label: "x", score: 1 }, extra: "keep-a" },
    { name: "direct-b", profile: { label: "y", score: undefined }, extra: "keep-b" },
];

let directOutput = "";
for (const { name: label, profile: { label: profileLabel, score = 0 }, ...rest } of directRows) {
    directOutput += `${label}:${profileLabel}:${score}:${String(rest.extra)}:${String(rest.profile)};`;
}
console.log("direct", directOutput);

interface ObjectStep {
    done: boolean;
    value: any;
}

class ObjectIterator {
    entries: any[];
    index: number;

    constructor(entries: any[]) {
        this.entries = entries;
        this.index = 0;
    }

    [Symbol.iterator](): ObjectIterator {
        return this;
    }

    next(): ObjectStep {
        if (this.index >= this.entries.length) {
            return { done: true, value: undefined };
        }
        const value = this.entries[this.index];
        this.index++;
        return { done: false, value };
    }
}

let customOutput = "";
for (const { profile: { label: profileLabel, score = 0 }, name: label } of new ObjectIterator([
    { name: "custom-a", profile: { label: "p", score: 2 } },
    { name: "custom-b", profile: { label: "q", score: undefined } },
])) {
    customOutput += `${label}:${profileLabel}:${score};`;
}
console.log("custom", customOutput);

function* lazyNestedObjects(): Generator<string, string, number> {
    const values: any[] = [
        { name: "lazy-a", profile: { label: "r", score: 3 } },
        { name: "lazy-b", profile: { label: "s", score: undefined } },
    ];
    for (const { name: label, profile: { label: profileLabel, score = 0 } } of values) {
        yield `${label}:${profileLabel}:${score}`;
    }
    return "nested-done";
}

const lazy = lazyNestedObjects();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
