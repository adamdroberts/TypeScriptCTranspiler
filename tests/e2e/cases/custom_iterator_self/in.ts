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

    [Symbol.iterator](): CounterIterator {
        return this;
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

let total = 0;
for (const n of new CounterIterator(1, 3)) {
    total += n;
    console.log("n", n);
}
console.log("total", total);
