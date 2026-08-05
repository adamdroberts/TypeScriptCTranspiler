function* andValue(): Generator<string, any, any> {
    return (yield "and-left") && (yield "and-right");
}

function* orValue(): Generator<string, any, any> {
    return (yield "or-left") || (yield "or-right");
}

function* nullishValue(): Generator<string, any, any> {
    return (yield "nullish-left") ?? (yield "nullish-right");
}

const andFalseIterator = andValue();
const andFalseFirst: any = andFalseIterator.next();
const andFalseDone: any = andFalseIterator.next(0);
console.log("and-false", andFalseFirst.done, andFalseFirst.value, andFalseDone.done, andFalseDone.value);

const andTrueIterator = andValue();
const andTrueFirst: any = andTrueIterator.next();
const andTrueSecond: any = andTrueIterator.next(2);
const andTrueDone: any = andTrueIterator.next(3);
console.log(
    "and-true",
    andTrueFirst.done,
    andTrueFirst.value,
    andTrueSecond.done,
    andTrueSecond.value,
    andTrueDone.done,
    andTrueDone.value,
);

const orTrueIterator = orValue();
const orTrueFirst: any = orTrueIterator.next();
const orTrueDone: any = orTrueIterator.next(2);
console.log("or-true", orTrueFirst.done, orTrueFirst.value, orTrueDone.done, orTrueDone.value);

const orFalseIterator = orValue();
const orFalseFirst: any = orFalseIterator.next();
const orFalseSecond: any = orFalseIterator.next(0);
const orFalseDone: any = orFalseIterator.next(4);
console.log(
    "or-false",
    orFalseFirst.done,
    orFalseFirst.value,
    orFalseSecond.done,
    orFalseSecond.value,
    orFalseDone.done,
    orFalseDone.value,
);

const nullishNullIterator = nullishValue();
const nullishNullFirst: any = nullishNullIterator.next();
const nullishNullSecond: any = nullishNullIterator.next(null);
const nullishNullDone: any = nullishNullIterator.next("R");
console.log(
    "nullish-null",
    nullishNullFirst.done,
    nullishNullFirst.value,
    nullishNullSecond.done,
    nullishNullSecond.value,
    nullishNullDone.done,
    nullishNullDone.value,
);

const nullishValueIterator = nullishValue();
const nullishValueFirst: any = nullishValueIterator.next();
const nullishValueDone: any = nullishValueIterator.next("L");
console.log(
    "nullish-value",
    nullishValueFirst.done,
    nullishValueFirst.value,
    nullishValueDone.done,
    nullishValueDone.value,
);
