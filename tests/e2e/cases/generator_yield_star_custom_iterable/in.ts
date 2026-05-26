class NumberBag {
    items: number[];

    constructor(items: number[]) {
        this.items = items;
    }

    [Symbol.iterator](): IterableIterator<number> {
        return this.items as unknown as IterableIterator<number>;
    }
}

class ChildBag extends NumberBag {
    constructor(items: number[]) {
        super(items);
    }
}

function* values(input: ChildBag): Generator<number, string, undefined> {
    yield* input;
    return "done";
}

let total = 0;
let labels = "";
for (const value of values(new ChildBag([2, 3, 5]))) {
    total += value;
    labels = labels + value + "|";
}

console.log("labels:", labels);
console.log("total:", total);
