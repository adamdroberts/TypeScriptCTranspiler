interface Step {
    done: boolean;
    value: number;
}

class SelfCounter {
    current: number;
    end: number;

    constructor(start: number, end: number) {
        this.current = start;
        this.end = end;
    }

    [Symbol.iterator](): SelfCounter {
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

function* values(input: SelfCounter): Generator<number, string, undefined> {
    yield* input;
    return "done";
}

let total = 0;
let labels = "";
for (const value of values(new SelfCounter(4, 6))) {
    total += value;
    labels = labels + value + "|";
}

console.log("labels:", labels);
console.log("total:", total);
