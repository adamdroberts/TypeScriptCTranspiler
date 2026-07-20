function* sum(): Generator<number, number, number> {
    return (yield 10) + (yield 20);
}

function* bits(): Generator<number, number, number> {
    return (yield 8) & (yield 3);
}

function* chain(): Generator<number, number, number> {
    return (yield 1) + (yield 2) + (yield 3) + (yield 4);
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
const chainIter = chain();
const chainFirst: any = chainIter.next();
const chainSecond: any = chainIter.next(1);
const chainThird: any = chainIter.next(2);
const chainFourth: any = chainIter.next(3);
const chainDone: any = chainIter.next(4);
console.log("chain", chainFirst.value, chainSecond.value, chainThird.value, chainFourth.value, chainDone.done, chainDone.value);
