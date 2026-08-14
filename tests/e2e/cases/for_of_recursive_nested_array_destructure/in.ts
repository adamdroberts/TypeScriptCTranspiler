const directRows: any[] = [
    {
        name: "direct-a",
        groups: [["a", 1, "tail"] as any[], ["unused"]] as any[],
        extra: "outer-a",
    },
    {
        name: "direct-b",
        groups: [["b"] as any[]] as any[],
        extra: "outer-b",
    },
];

let directOutput = "";
for (const { name, groups: [[id, ...innerTail], ...groupTail], ...outer } of directRows) {
    directOutput += `${name}:${id}:${innerTail.length}:${String(innerTail[0])}:${groupTail.length}:${String(outer.groups)}:${String(outer.extra)};`;
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
for (const { name, groups: [[id, ...innerTail], ...groupTail], ...outer } of new ObjectIterator([
    {
        name: "custom-a",
        groups: [["p", 2, "tail"] as any[], ["unused"]] as any[],
        extra: "outer-p",
    },
    {
        name: "custom-b",
        groups: [["q"] as any[]] as any[],
        extra: "outer-q",
    },
])) {
    customOutput += `${name}:${id}:${innerTail.length}:${String(innerTail[0])}:${groupTail.length}:${String(outer.groups)}:${String(outer.extra)};`;
}
console.log("custom", customOutput);

function* lazyRecursiveNestedArray(): Generator<string, string, number> {
    const values: any[] = [
        {
            name: "lazy-a",
            groups: [["r", 3, "tail"] as any[], ["unused"]] as any[],
            extra: "outer-r",
        },
        {
            name: "lazy-b",
            groups: [["s"] as any[]] as any[],
            extra: "outer-s",
        },
    ];
    for (const { name, groups: [[id, ...innerTail], ...groupTail], ...outer } of values) {
        yield `${name}:${id}:${innerTail.length}:${String(innerTail[0])}:${groupTail.length}:${String(outer.extra)}`;
    }
    return "recursive-nested-array-done";
}

const lazy = lazyRecursiveNestedArray();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
