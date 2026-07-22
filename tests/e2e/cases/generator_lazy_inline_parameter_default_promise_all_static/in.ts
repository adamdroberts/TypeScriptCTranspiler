function* values(): Generator<number, number, number> {
    return (yield 1) + ((items: Promise<number[]> = Promise.all([Promise.resolve(1), Promise.resolve(2)]), valid: boolean = items === items) => valid ? 1 : 0)() + (yield 2);
}

const iter = values();
const first: any = iter.next();
const second: any = iter.next(3);
const done: any = iter.next(4);
console.log(first.value, second.value, done.done, done.value);

function makeCapturedValues(): () => Generator<number, number, number> {
    let offset = 5;
    offset = 6;
    return function* (): Generator<number, number, number> {
        return (yield 1) + ((items: Promise<number[]> = Promise.all([Promise.resolve(1), Promise.resolve(2)]), valid: boolean = items === items) => (valid ? 1 : 0) + offset)() + (yield 2);
    };
}

const capturedIter = makeCapturedValues()();
const capturedFirst: any = capturedIter.next();
const capturedSecond: any = capturedIter.next(3);
const capturedDone: any = capturedIter.next(4);
console.log(capturedFirst.value, capturedSecond.value, capturedDone.done, capturedDone.value);
