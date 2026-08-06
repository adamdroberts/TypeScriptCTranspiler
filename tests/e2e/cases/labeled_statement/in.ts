function labeledBlock(): string {
    let events = "";
    outer: {
        events += "a";
        break outer;
    }
    return events + "b";
}

function nestedLabeledBlock(): string {
    let events = "";
    outer: {
        events += "o";
        inner: {
            events += "i";
            break outer;
        }
        events += "unreachable";
    }
    return events;
}

function labeledContinueLoop(): string {
    let events = "";
    outer: for (let index = 0; index < 2; index++) {
        events += index;
        continue outer;
    }
    return events;
}

function crossLoopLabeledContinue(): string {
    let events = "";
    outer: for (let outerIndex = 0; outerIndex < 2; outerIndex++) {
        for (let innerIndex = 0; innerIndex < 2; innerIndex++) {
            events += `${outerIndex}${innerIndex}`;
            continue outer;
        }
    }
    return events;
}

function crossLoopWhileContinue(): number {
    let count = 0;
    outer: while (count < 2) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

function crossLoopDoContinue(): number {
    let count = 0;
    outer: do {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    } while (count < 2);
    return count;
}

function crossLoopForInContinue(): number {
    let count = 0;
    outer: for (const key in { a: 1, b: 2 }) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

function crossLoopForOfContinue(): number {
    let count = 0;
    outer: for (const value of ["a", "b"]) {
        count++;
        for (let index = 0; index < 1; index++) continue outer;
    }
    return count;
}

function crossLoopMapForOfContinue(): string {
    const entries = new Map<string, number>();
    entries.set("a", 1);
    entries.set("b", 2);
    let events = "";
    outer: for (const [key, value] of entries) {
        for (let index = 0; index < 1; index++) {
            events += key + value;
            continue outer;
        }
    }
    return events;
}

function crossLoopUrlSearchParamsContinue(): string {
    const params = new URLSearchParams("a=1&b=2");
    let events = "";
    outer: for (const [key, value] of params) {
        for (let index = 0; index < 1; index++) {
            events += key + value;
            continue outer;
        }
    }
    return events;
}

interface CounterStep {
    done: boolean;
    value: number;
}

class CounterIterator {
    current = 0;

    next(): CounterStep {
        if (this.current >= 2) return { done: true, value: 0 };
        const value = this.current;
        this.current++;
        return { done: false, value };
    }

    [Symbol.iterator](): CounterIterator {
        return this;
    }
}

function crossLoopCustomIteratorContinue(): string {
    let events = "";
    outer: for (const value of new CounterIterator()) {
        for (let index = 0; index < 1; index++) {
            events += value;
            continue outer;
        }
    }
    return events;
}

function crossLoopDynamicDestructuringContinue(): string {
    const pairs: any = [["a", 1], ["b", 2]];
    let events = "";
    outer: for (const [key, value] of pairs) {
        for (let index = 0; index < 1; index++) {
            events += `${key}${value}`;
            continue outer;
        }
    }
    return events;
}

function crossLoopEntryDestructuringContinue(): string {
    let events = "";
    outer: for (const [key, value] of Object.entries({ a: 1, b: 2 })) {
        for (let index = 0; index < 1; index++) {
            events += `${key}${value}`;
            continue outer;
        }
    }
    return events;
}

console.log(labeledBlock());
console.log(nestedLabeledBlock());
console.log(labeledContinueLoop());
console.log(crossLoopLabeledContinue());
console.log(crossLoopWhileContinue());
console.log(crossLoopDoContinue());
console.log(crossLoopForInContinue());
console.log(crossLoopForOfContinue());
console.log(crossLoopMapForOfContinue());
console.log(crossLoopUrlSearchParamsContinue());
console.log(crossLoopCustomIteratorContinue());
console.log(crossLoopDynamicDestructuringContinue());
console.log(crossLoopEntryDestructuringContinue());
