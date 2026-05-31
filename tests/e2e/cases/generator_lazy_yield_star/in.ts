class NumberBag {
    items: number[];
    constructor(items: number[]) {
        this.items = items;
    }
    [Symbol.iterator](): IterableIterator<number> {
        return this.items as unknown as IterableIterator<number>;
    }
}

function* lazyYieldStarGen(): Generator<any, string, undefined> {
    console.log("lazyYieldStarGen - start");

    console.log("Yielding array");
    yield* [10, 20];
    console.log("Yielded array");

    console.log("Yielding string");
    yield* "abc";
    console.log("Yielded string");

    console.log("Yielding set");
    const s = new Set<number>();
    s.add(100);
    s.add(200);
    yield* s;
    console.log("Yielded set");

    console.log("Yielding custom iterable");
    const bag = new NumberBag([300, 400]);
    yield* bag;
    console.log("Yielded custom iterable");

    return "lazyDone";
}

console.log("--- 1. Initialization ---");
const g = lazyYieldStarGen();
console.log("Generator initialized lazily");

console.log("--- 2. Stepping through next() ---");
let step = g.next();
while (!step.done) {
    console.log("Yielded value:", step.value);
    step = g.next();
}
console.log("Generator done. Return value:", step.value);
