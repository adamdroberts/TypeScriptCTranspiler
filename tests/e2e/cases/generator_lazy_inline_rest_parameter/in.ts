function* values(): Generator<number, number, number> {
    return (yield 1) + ((...items: number[]) => items[0]! + items[1]!)(7, 8) + (yield 2);
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
        return (yield 1) + ((...items: number[]) => items[0]! + items[1]! + offset)(7, 8) + (yield 2);
    };
}

const capturedIter = makeCapturedValues()();
const capturedFirst: any = capturedIter.next();
const capturedSecond: any = capturedIter.next(3);
const capturedDone: any = capturedIter.next(4);
console.log(capturedFirst.value, capturedSecond.value, capturedDone.done, capturedDone.value);

const spreadItems: number[] = [7, 8, 9];
function* spreadValues(): Generator<number, number, number> {
    return (yield 1) + ((...items: number[]) => items[0]! + items[1]! + items[2]!)(...spreadItems) + (yield 2);
}

const spreadIter = spreadValues();
const spreadFirst: any = spreadIter.next();
const spreadSecond: any = spreadIter.next(3);
const spreadDone: any = spreadIter.next(4);
console.log(spreadFirst.value, spreadSecond.value, spreadDone.done, spreadDone.value);
