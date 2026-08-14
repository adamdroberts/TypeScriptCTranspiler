const directKey = "name";
const directRows: any[] = [
    { name: "direct-a", score: 1 },
    { name: "direct-b", score: undefined },
];

let directOutput = "";
for (const { [directKey]: label, score = 0 } of directRows) {
    directOutput += `${label}:${score};`;
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

const customKey = "name";
let customOutput = "";
for (const { [customKey]: label, score = 0 } of new ObjectIterator([
    { name: "custom-a", score: 2 },
    { name: "custom-b", score: undefined },
])) {
    customOutput += `${label}:${score};`;
}
console.log("custom", customOutput);

function* lazyComputedObjects(): Generator<string, string, number> {
    const values: any[] = [
        { name: "lazy-a", score: 3 },
        { name: "lazy-b", score: undefined },
    ];
    const lazyKey = "name";
    for (const { [lazyKey]: label, score = 0 } of values) {
        yield `${label}:${score}`;
    }
    return "computed-done";
}

const lazy = lazyComputedObjects();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
