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

const bag = new NumberBag([1, 2, 3]);
let total = 0;
for (const n of bag) {
    total += n;
    console.log("bag", n);
}
console.log("total", total);

const child = new ChildBag([4, 5]);
let childTotal = 0;
for (const n of child) {
    childTotal += n;
}
console.log("child total", childTotal);
