interface Step {
    done: boolean;
    value: number;
}

class BaseCounterIterator {
    current: number;
    end: number;

    constructor(start: number, end: number) {
        this.current = start;
        this.end = end;
    }

    next(): Step {
        if (this.current > this.end) {
            return { done: true, value: 0 };
        }
        const value = this.current;
        this.current++;
        return { done: false, value };
    }
}

class ChildCounterIterator extends BaseCounterIterator {
    constructor(start: number, end: number) {
        super(start, end);
    }

    [Symbol.iterator](): ChildCounterIterator {
        return this;
    }
}

function* values(input: ChildCounterIterator): Generator<number, string, undefined> {
    yield* input;
    return "done";
}

let total = 0;
let labels = "";
for (const value of values(new ChildCounterIterator(5, 7))) {
    total += value;
    labels = labels + value + "|";
}

console.log("labels:", labels);
console.log("total:", total);
