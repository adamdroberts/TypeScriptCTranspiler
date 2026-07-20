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

    return(value: string): Step {
        events.push("return:" + value);
        if (value === "yield-return") return { done: false, value: 5 };
        return { done: true, value: 7 };
    }

    throw(error: string): Step {
        events.push("throw:" + error);
        if (error === "yield-error") return { done: false, value: 6 };
        return { done: true, value: 9 };
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

function* outerThrow(): Generator<number, string, string> {
    const delegated: any = yield* new Counter();
    events.push("throw-outer-after:" + delegated);
    return "throw-outer-done";
}

function* outerThrowYield(): Generator<number, string, string> {
    const delegated: any = yield* new Counter();
    events.push("throw-yield-outer-after:" + delegated);
    return "throw-yield-outer-done";
}

function* outerReturn(): Generator<number, string, string> {
    const delegated: any = yield* new Counter();
    events.push("return-outer-after:" + delegated);
    return "return-outer-done";
}

function* outerReturnYield(): Generator<number, string, string> {
    const delegated: any = yield* new Counter();
    events.push("return-yield-outer-after:" + delegated);
    return "return-yield-outer-done";
}

const iter = outer();
const first: any = iter.next();
const second: any = iter.next();
const done: any = iter.next();
console.log("custom-iterator", first.done, first.value, second.done, second.value, done.done, done.value, events.join("|"));

const throwing = outerThrow();
const throwingFirst: any = throwing.next();
const throwingDone: any = throwing.throw("custom-error");
console.log("custom-iterator-throw", throwingFirst.done, throwingFirst.value, throwingDone.done, throwingDone.value, events.join("|"));

const throwingYield = outerThrowYield();
const throwingYieldFirst: any = throwingYield.next();
const throwingYieldStep: any = throwingYield.throw("yield-error");
const throwingYieldSecond: any = throwingYield.next();
const throwingYieldDone: any = throwingYield.next();
console.log("custom-iterator-throw-yield", throwingYieldFirst.done, throwingYieldFirst.value, throwingYieldStep.done, throwingYieldStep.value, throwingYieldSecond.done, throwingYieldSecond.value, throwingYieldDone.done, throwingYieldDone.value, events.join("|"));

const returning = outerReturn();
const returningFirst: any = returning.next();
const returningDone: any = returning.return("custom-return");
console.log("custom-iterator-return", returningFirst.done, returningFirst.value, returningDone.done, returningDone.value, events.join("|"));

const returningYield = outerReturnYield();
const returningYieldFirst: any = returningYield.next();
const returningYieldStep: any = returningYield.return("yield-return");
const returningYieldSecond: any = returningYield.next();
const returningYieldDone: any = returningYield.next();
console.log("custom-iterator-return-yield", returningYieldFirst.done, returningYieldFirst.value, returningYieldStep.done, returningYieldStep.value, returningYieldSecond.done, returningYieldSecond.value, returningYieldDone.done, returningYieldDone.value, events.join("|"));
