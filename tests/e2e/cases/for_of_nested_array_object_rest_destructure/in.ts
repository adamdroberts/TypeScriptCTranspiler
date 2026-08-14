const directRows: any[] = [
    {
        name: "direct-a",
        groups: [
            { id: "a", meta: { label: "alpha" }, extra: "entry-a" },
            { id: "unused", meta: { label: "tail" } },
        ] as any[],
        extra: "outer-a",
    },
    {
        name: "direct-b",
        groups: [{ id: "b", meta: { label: "beta" } }] as any[],
        extra: "outer-b",
    },
];

let directOutput = "";
for (const { name, groups: [{ id, meta: { label }, ...entryRest }, ...groupTail], ...outer } of directRows) {
    directOutput += `${name}:${id}:${label}:${String(entryRest.id)}:${String(entryRest.meta)}:${String(entryRest.extra)}:${groupTail.length}:${String(outer.groups)}:${String(outer.extra)};`;
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
for (const { name, groups: [{ id, meta: { label }, ...entryRest }, ...groupTail], ...outer } of new ObjectIterator([
    {
        name: "custom-a",
        groups: [
            { id: "p", meta: { label: "one" }, extra: "entry-p" },
            { id: "unused", meta: { label: "tail" } },
        ] as any[],
        extra: "outer-p",
    },
    {
        name: "custom-b",
        groups: [{ id: "q", meta: { label: "two" } }] as any[],
        extra: "outer-q",
    },
])) {
    customOutput += `${name}:${id}:${label}:${String(entryRest.id)}:${String(entryRest.meta)}:${String(entryRest.extra)}:${groupTail.length}:${String(outer.groups)}:${String(outer.extra)};`;
}
console.log("custom", customOutput);

function* lazyNestedArrayObjectRest(): Generator<string, string, number> {
    const values: any[] = [
        {
            name: "lazy-a",
            groups: [
                { id: "r", meta: { label: "red" }, extra: "entry-r" },
                { id: "unused", meta: { label: "tail" } },
            ] as any[],
            extra: "outer-r",
        },
        {
            name: "lazy-b",
            groups: [{ id: "s", meta: { label: "blue" } }] as any[],
            extra: "outer-s",
        },
    ];
    for (const { name, groups: [{ id, meta: { label }, ...entryRest }, ...groupTail], ...outer } of values) {
        yield `${name}:${id}:${label}:${String(entryRest.extra)}:${groupTail.length}:${String(outer.extra)}`;
    }
    return "nested-array-object-rest-done";
}

const lazy = lazyNestedArrayObjectRest();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
