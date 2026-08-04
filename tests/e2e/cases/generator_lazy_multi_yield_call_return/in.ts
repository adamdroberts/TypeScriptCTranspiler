let calls = 0;

function combine(first: number, second: number): number {
    calls++;
    return first * 10 + second;
}

let mixedCalls = 0;

function mix(first: number, second: number, third: number): number {
    mixedCalls++;
    return first + second + third;
}

let constructions = 0;

class ResultBox {
    value: number;

    constructor(first: number, second: number) {
        constructions++;
        this.value = first * 10 + second;
    }
}

function* callReturn(): Generator<number, number, number> {
    return combine(yield 1, yield 2);
}

const iterator = callReturn();
const first: any = iterator.next();
console.log("before", calls, first.done, first.value);
const second: any = iterator.next(4);
console.log("middle", calls, second.done, second.value);
const done: any = iterator.next(7);
console.log("done", calls, done.done, done.value);

function* newReturn(): Generator<number, ResultBox, number> {
    return new ResultBox(yield 3, yield 5);
}

const newIterator = newReturn();
const newFirst: any = newIterator.next();
console.log("new-before", constructions, newFirst.done, newFirst.value);
const newSecond: any = newIterator.next(8);
console.log("new-middle", constructions, newSecond.done, newSecond.value);
const newDone: any = newIterator.next(9);
console.log("new-done", constructions, newDone.done, newDone.value.value);

function* mixedCallReturn(): Generator<number, number, number> {
    return mix(10, yield 6, 20) + (yield 7);
}

const mixedIterator = mixedCallReturn();
const mixedFirst: any = mixedIterator.next();
console.log("mixed-before", mixedCalls, mixedFirst.done, mixedFirst.value);
const mixedSecond: any = mixedIterator.next(4);
console.log("mixed-middle", mixedCalls, mixedSecond.done, mixedSecond.value);
const mixedDone: any = mixedIterator.next(5);
console.log("mixed-done", mixedCalls, mixedDone.done, mixedDone.value);
