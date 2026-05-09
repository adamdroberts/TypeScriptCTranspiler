interface Step {
    done: boolean;
    value: number;
}

class CounterIterator {
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

class Counter {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    [Symbol.iterator](): CounterIterator {
        return new CounterIterator(this.start, this.end);
    }
}

let total = 0;
for (const n of new Counter(2, 4)) {
    total += n;
    console.log("n", n);
}
console.log("total", total);
