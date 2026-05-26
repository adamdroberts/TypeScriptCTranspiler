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

function* values(input: Counter): Generator<number, string, undefined> {
    yield* input;
    return "done";
}

let total = 0;
let labels = "";
for (const value of values(new Counter(3, 5))) {
    total += value;
    labels = labels + value + "|";
}

console.log("labels:", labels);
console.log("total:", total);
