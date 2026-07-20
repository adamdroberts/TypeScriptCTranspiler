function* sum(): Generator<number, number, number> {
    return (yield 10) + (yield 20);
}

function* bits(): Generator<number, number, number> {
    return (yield 8) & (yield 3);
}

function* chain(): Generator<number, number, number> {
    return (yield 1) + (yield 2) + (yield 3) + (yield 4);
}

function* longChain(): Generator<number, number, number> {
    return (yield 1) + (yield 2) + (yield 3) + (yield 4) + (yield 5) + (yield 6) + (yield 7) + (yield 8) + (yield 9) + (yield 10);
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
const longIter = longChain();
const longValues: any[] = [];
longValues.push(longIter.next());
longValues.push(longIter.next(1));
longValues.push(longIter.next(2));
longValues.push(longIter.next(3));
longValues.push(longIter.next(4));
longValues.push(longIter.next(5));
longValues.push(longIter.next(6));
longValues.push(longIter.next(7));
longValues.push(longIter.next(8));
longValues.push(longIter.next(9));
longValues.push(longIter.next(10));
console.log("long", longValues.map((step: any) => step.value).join(","), longValues[10].done, longValues[10].value);
