function* values(): Generator<number, number, number> {
    return (yield 1) + ((value: number = -7, finite: boolean = Number.isFinite(value), integer: boolean = Number.isInteger(value), safe: boolean = Number.isSafeInteger(value)) => (finite ? 1 : 0) + (integer ? 2 : 0) + (safe ? 4 : 0))() + (yield 2);
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
        return (yield 1) + ((value: number = -7, finite: boolean = Number.isFinite(value), integer: boolean = Number.isInteger(value), safe: boolean = Number.isSafeInteger(value)) => (finite ? 1 : 0) + (integer ? 2 : 0) + (safe ? 4 : 0) + offset)() + (yield 2);
    };
}

const capturedIter = makeCapturedValues()();
const capturedFirst: any = capturedIter.next();
const capturedSecond: any = capturedIter.next(3);
const capturedDone: any = capturedIter.next(4);
console.log(capturedFirst.value, capturedSecond.value, capturedDone.done, capturedDone.value);
