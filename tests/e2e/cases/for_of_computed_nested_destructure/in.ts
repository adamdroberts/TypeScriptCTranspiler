let keyReads = 0;
function payloadKey(): string {
    keyReads++;
    return "payload";
}

const directRows: any[] = [
    { payload: { label: "direct-a", values: ["x", 1, "tail"] as any[] } },
    { payload: { label: "direct-b", values: ["y"] as any[] } },
];

let directOutput = "";
for (const { [payloadKey()]: { label, values: [first, ...tail] } } of directRows) {
    directOutput += `${label}:${first}:${tail.length}:${String(tail[0])};`;
}
console.log("direct", directOutput, keyReads);

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
for (const { [payloadKey()]: { label, values: [first, ...tail] } } of new ObjectIterator([
    { payload: { label: "custom-a", values: ["p", 2, "tail"] as any[] } },
    { payload: { label: "custom-b", values: ["q"] as any[] } },
])) {
    customOutput += `${label}:${first}:${tail.length}:${String(tail[0])};`;
}
console.log("custom", customOutput, keyReads);

function* lazyComputedNested(): Generator<string, string, number> {
    const values: any[] = [
        { payload: { label: "lazy-a", values: ["r", 3, "tail"] as any[] } },
        { payload: { label: "lazy-b", values: ["s"] as any[] } },
    ];
    for (const { [payloadKey()]: { label, values: [first, ...tail] } } of values) {
        yield `${label}:${first}:${tail.length}:${String(tail[0])}`;
    }
    return "computed-nested-done";
}

const lazy = lazyComputedNested();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
console.log("keyReads", keyReads);
