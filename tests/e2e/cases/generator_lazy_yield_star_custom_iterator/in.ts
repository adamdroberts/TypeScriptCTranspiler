const events: string[] = [];

interface Step {
    done: boolean;
    value: number;
}

class CounterIterator {
    current: number;

    constructor(start: number) {
        this.current = start;
    }

    next(): Step {
        events.push("next:" + this.current);
        if (this.current > 2) return { done: true, value: 0 };
        const value = this.current;
        this.current++;
        return { done: false, value };
    }
}

class Counter {
    [Symbol.iterator](): CounterIterator {
        return new CounterIterator(1);
    }
}

function* outer(): Generator<number, string, undefined> {
    const delegated: any = yield* new Counter();
    events.push("outer-after:" + delegated);
    return "outer-done";
}

const iter = outer();
const first: any = iter.next();
const second: any = iter.next();
const done: any = iter.next();
console.log("custom-iterator", first.done, first.value, second.done, second.value, done.done, done.value, events.join("|"));
