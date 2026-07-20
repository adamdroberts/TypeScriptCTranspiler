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

function* mixedLeaves(): Generator<number, number, number> {
    return 100 + (yield 1) + (yield 2) * 10;
}

function* unaryLeaves(): Generator<number, number, number> {
    return -(yield 5) + ~(yield 2);
}

function* booleanUnaryLeaves(): Generator<any, any, any> {
    return !(yield 0) + (yield 2);
}

function* typeofLeaves(): Generator<number, string, number> {
    return typeof (yield 7) + (yield 8);
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
const mixedIter = mixedLeaves();
const mixedFirst: any = mixedIter.next();
const mixedSecond: any = mixedIter.next(3);
const mixedDone: any = mixedIter.next(4);
console.log("mixed", mixedFirst.value, mixedSecond.value, mixedDone.done, mixedDone.value);
const unaryIter = unaryLeaves();
const unaryFirst: any = unaryIter.next();
const unarySecond: any = unaryIter.next(3);
const unaryDone: any = unaryIter.next(1);
console.log("unary", unaryFirst.value, unarySecond.value, unaryDone.done, unaryDone.value);
const booleanUnaryIter = booleanUnaryLeaves();
const booleanUnaryFirst: any = booleanUnaryIter.next();
const booleanUnarySecond: any = booleanUnaryIter.next(0);
const booleanUnaryDone: any = booleanUnaryIter.next(2);
console.log("boolean-unary", booleanUnaryFirst.value, booleanUnarySecond.value, booleanUnaryDone.done, booleanUnaryDone.value);
const typeofIter = typeofLeaves();
const typeofFirst: any = typeofIter.next();
const typeofSecond: any = typeofIter.next(1);
const typeofDone: any = typeofIter.next(2);
console.log("typeof", typeofFirst.value, typeofSecond.value, typeofDone.done, typeofDone.value);
