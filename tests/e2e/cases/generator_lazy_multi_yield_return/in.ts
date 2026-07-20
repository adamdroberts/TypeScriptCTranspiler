function* sum(): Generator<number, number, number> {
    return (yield 10) + (yield 20);
}

function* bits(): Generator<number, number, number> {
    return (yield 8) & (yield 3);
}

const iter = sum();
const first: any = iter.next();
const second: any = iter.next(3);
const done: any = iter.next(4);
console.log("steps", first.done, first.value, second.done, second.value, done.done, done.value);
const bitIter = bits();
const bitFirst: any = bitIter.next();
const bitSecond: any = bitIter.next(6);
const bitDone: any = bitIter.next(3);
console.log("bits", bitFirst.value, bitSecond.value, bitDone.done, bitDone.value);
