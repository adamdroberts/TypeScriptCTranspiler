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

let total = 0;
for (const n of new ChildCounterIterator(3, 5)) {
    total += n;
    console.log("n", n);
}
console.log("total", total);
