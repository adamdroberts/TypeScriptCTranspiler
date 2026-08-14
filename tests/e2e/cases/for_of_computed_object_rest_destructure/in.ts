let keyReads = 0;
function payloadKey(): string {
    keyReads++;
    return "payload";
}

const directRows: any[] = [
    { payload: { label: "direct-a" }, keep: "keep-a", extra: 1 },
    { payload: { label: "direct-b" }, keep: "keep-b", extra: 2 },
];

let directOutput = "";
for (const { [payloadKey()]: { label }, ...rest } of directRows) {
    directOutput += `${label}:${String(rest.payload)}:${String(rest.keep)}:${String(rest.extra)};`;
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
for (const { [payloadKey()]: { label }, ...rest } of new ObjectIterator([
    { payload: { label: "custom-a" }, keep: "keep-c", extra: 3 },
    { payload: { label: "custom-b" }, keep: "keep-d", extra: 4 },
])) {
    customOutput += `${label}:${String(rest.payload)}:${String(rest.keep)}:${String(rest.extra)};`;
}
console.log("custom", customOutput, keyReads);

function* lazyComputedObjectRest(): Generator<string, string, number> {
    const values: any[] = [
        { payload: { label: "lazy-a" }, keep: "keep-e", extra: 5 },
        { payload: { label: "lazy-b" }, keep: "keep-f", extra: 6 },
    ];
    for (const { [payloadKey()]: { label }, ...rest } of values) {
        yield `${label}:${String(rest.payload)}:${String(rest.keep)}:${String(rest.extra)}`;
    }
    return "computed-rest-done";
}

const lazy = lazyComputedObjectRest();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
console.log("keyReads", keyReads);
