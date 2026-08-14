const directRows: any[] = [
    { name: "direct-a", values: ["x", 1, "tail"] as any[], extra: "keep-a" },
    { name: "direct-b", values: ["y", undefined] as any[], extra: "keep-b" },
];

let directOutput = "";
for (const { name, values: [label, ...tail], ...rest } of directRows) {
    directOutput += `${name}:${label}:${tail.length}:${String(tail[0])}:${String(rest.values)}:${String(rest.extra)};`;
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
for (const { name, values: [label, ...tail], ...rest } of new ObjectIterator([
    { name: "custom-a", values: ["p", 2, "tail"] as any[], extra: "keep-c" },
    { name: "custom-b", values: ["q", undefined] as any[], extra: "keep-d" },
])) {
    customOutput += `${name}:${label}:${tail.length}:${String(tail[0])}:${String(rest.values)}:${String(rest.extra)};`;
}
console.log("custom", customOutput);

function* lazyNestedArrayRest(): Generator<string, string, number> {
    const values: any[] = [
        { name: "lazy-a", values: ["r", 3, "tail"] as any[] },
        { name: "lazy-b", values: ["s", undefined] as any[] },
    ];
    for (const { name, values: [label, ...tail] } of values) {
        yield `${name}:${label}:${tail.length}:${String(tail[0])}`;
    }
    return "nested-array-rest-done";
}

const lazy = lazyNestedArrayRest();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
