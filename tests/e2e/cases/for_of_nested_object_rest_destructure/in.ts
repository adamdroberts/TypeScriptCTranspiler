const directRows: any[] = [
    { name: "direct-a", payload: { id: "a", meta: { label: "alpha" }, extra: "inner-a" }, extra: "outer-a" },
    { name: "direct-b", payload: { id: "b", meta: { label: "beta" }, extra: "inner-b" }, extra: "outer-b" },
];

let directOutput = "";
for (const { name, payload: { id, meta: { label }, ...inner }, ...outer } of directRows) {
    directOutput += `${name}:${id}:${label}:${String(inner.id)}:${String(inner.meta)}:${String(inner.extra)}:${String(outer.payload)}:${String(outer.extra)};`;
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
for (const { name, payload: { id, meta: { label }, ...inner }, ...outer } of new ObjectIterator([
    { name: "custom-a", payload: { id: "p", meta: { label: "one" }, extra: "inner-p" }, extra: "outer-p" },
    { name: "custom-b", payload: { id: "q", meta: { label: "two" }, extra: "inner-q" }, extra: "outer-q" },
])) {
    customOutput += `${name}:${id}:${label}:${String(inner.id)}:${String(inner.meta)}:${String(inner.extra)}:${String(outer.payload)}:${String(outer.extra)};`;
}
console.log("custom", customOutput);

function* lazyNestedObjectRest(): Generator<string, string, number> {
    const values: any[] = [
        { name: "lazy-a", payload: { id: "r", meta: { label: "red" }, extra: "inner-r" }, extra: "outer-r" },
        { name: "lazy-b", payload: { id: "s", meta: { label: "blue" }, extra: "inner-s" }, extra: "outer-s" },
    ];
    for (const { name, payload: { id, meta: { label }, ...inner }, ...outer } of values) {
        yield `${name}:${id}:${label}:${String(inner.extra)}:${String(outer.extra)}`;
    }
    return "nested-object-rest-done";
}

const lazy = lazyNestedObjectRest();
const one: any = lazy.next(0);
const two: any = lazy.next(0);
const three: any = lazy.next(0);
console.log("one", one.done, one.value);
console.log("two", two.done, two.value);
console.log("three", three.done, three.value);
