function* range(start: number, end: number): IterableIterator<number> {
    for (let value = start; value <= end; value++) {
        yield value;
    }
}

class RangeBag {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    [Symbol.iterator](): IterableIterator<number> {
        return range(this.start, this.end);
    }
}

class ChildRangeBag extends RangeBag {
    constructor(start: number, end: number) {
        super(start, end);
    }
}

const bag = new RangeBag(2, 4);
const seen: number[] = [];
for (const value of bag) {
    seen.push(value);
}
console.log("bag:", seen.join(","));

let childTotal = 0;
for (const value of new ChildRangeBag(5, 7)) {
    childTotal += value;
}
console.log("child:", childTotal);
