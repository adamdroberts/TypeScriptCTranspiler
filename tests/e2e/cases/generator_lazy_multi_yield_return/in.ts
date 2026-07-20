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

function* comparisonLeaves(): Generator<number, boolean, number> {
    return (yield 9) < (yield 10);
}

function* equalityLeaves(): Generator<number, boolean, number> {
    return (yield 11) === (yield 12);
}

function* exponentLeaves(): Generator<number, number, number> {
    return (yield 13) ** (yield 14);
}

function* commaLeaves(): Generator<number, number, number> {
    return (yield 18), (yield 19);
}

function* inLeaves(): Generator<any, boolean, any> {
    return (yield "x") in (yield { x: 1 });
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
const comparisonIter = comparisonLeaves();
const comparisonFirst: any = comparisonIter.next();
const comparisonSecond: any = comparisonIter.next(1);
const comparisonDone: any = comparisonIter.next(3);
console.log("comparison", comparisonFirst.value, comparisonSecond.value, comparisonDone.done, comparisonDone.value);
const equalityIter = equalityLeaves();
const equalityFirst: any = equalityIter.next();
const equalitySecond: any = equalityIter.next(4);
const equalityDone: any = equalityIter.next(4);
console.log("equality", equalityFirst.value, equalitySecond.value, equalityDone.done, equalityDone.value);
const exponentIter = exponentLeaves();
const exponentFirst: any = exponentIter.next();
const exponentSecond: any = exponentIter.next(2);
const exponentDone: any = exponentIter.next(3);
console.log("exponent", exponentFirst.value, exponentSecond.value, exponentDone.done, exponentDone.value);
const commaIter = commaLeaves();
const commaFirst: any = commaIter.next();
const commaSecond: any = commaIter.next(4);
const commaDone: any = commaIter.next(4);
console.log("comma", commaFirst.value, commaSecond.value, commaDone.done, commaDone.value);
const inIter = inLeaves();
const inFirst: any = inIter.next();
const inSecond: any = inIter.next("x");
const inDone: any = inIter.next({ x: 1 });
console.log("in", inFirst.value, inSecond.value.x, inDone.done, inDone.value);
