const directRows: any[] = [
    { name: "direct-a", values: ["x", 1, "tail"] as any[], extra: "keep-a" },
    { name: "direct-b", values: ["y", undefined] as any[], extra: "keep-b" },
];

let directOutput = "";
for (const { name, values: [label, score = 0], ...rest } of directRows) {
    directOutput += `${name}:${label}:${score}:${String(rest.extra)}:${String(rest.values)};`;
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
for (const { name, values: [label, score = 0] } of new ObjectIterator([
    { name: "custom-a", values: ["p", 2] as any[] },
    { name: "custom-b", values: ["q", undefined] as any[] },
])) {
    customOutput += `${name}:${label}:${score};`;
}
console.log("custom", customOutput);

function* lazyNestedArrays(): Generator<string, string, number> {
    const values: any[] = [
        { name: "lazy-a", values: ["r", 3] as any[] },
        { name: "lazy-b", values: ["s", undefined] as any[] },
    ];
    for (const { name, values: [label, score = 0] } of values) {
        yield `${name}:${label}:${score}`;
    }
    return "nested-array-done";
}

const lazy = lazyNestedArrays();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
