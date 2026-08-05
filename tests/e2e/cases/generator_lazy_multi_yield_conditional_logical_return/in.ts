function* conditionalLogical(): Generator<string, any, any> {
    return (yield "condition")
        ? ((yield "true-left") && (yield "true-right"))
        : ((yield "false-left") || (yield "false-right"));
}

function* conditionalLogicalArray(): Generator<string, any[], any> {
    return [
        yield "before",
        (yield "array-condition")
            ? ((yield "array-true-left") && (yield "array-true-right"))
            : ((yield "array-false-left") || (yield "array-false-right")),
        yield "after",
    ];
}

const rootTrueIterator = conditionalLogical();
const rootTrueFirst: any = rootTrueIterator.next();
const rootTrueSecond: any = rootTrueIterator.next(true);
const rootTrueDone: any = rootTrueIterator.next(0);
console.log(
    "root-true-false",
    rootTrueFirst.done,
    rootTrueFirst.value,
    rootTrueSecond.done,
    rootTrueSecond.value,
    rootTrueDone.done,
    rootTrueDone.value,
);

const rootFalseIterator = conditionalLogical();
const rootFalseFirst: any = rootFalseIterator.next();
const rootFalseSecond: any = rootFalseIterator.next(false);
const rootFalseThird: any = rootFalseIterator.next(0);
const rootFalseDone: any = rootFalseIterator.next(4);
console.log(
    "root-false-false",
    rootFalseFirst.done,
    rootFalseFirst.value,
    rootFalseSecond.done,
    rootFalseSecond.value,
    rootFalseThird.done,
    rootFalseThird.value,
    rootFalseDone.done,
    rootFalseDone.value,
);

const arrayTrueIterator = conditionalLogicalArray();
const arrayTrueFirst: any = arrayTrueIterator.next();
const arrayTrueSecond: any = arrayTrueIterator.next("before");
const arrayTrueThird: any = arrayTrueIterator.next(true);
const arrayTrueFourth: any = arrayTrueIterator.next(0);
const arrayTrueDone: any = arrayTrueIterator.next("after");
console.log(
    "array-true-false",
    arrayTrueFirst.done,
    arrayTrueFirst.value,
    arrayTrueSecond.done,
    arrayTrueSecond.value,
    arrayTrueThird.done,
    arrayTrueThird.value,
    arrayTrueFourth.done,
    arrayTrueFourth.value,
    arrayTrueDone.done,
    (arrayTrueDone.value as any[]).join("|"),
);

const arrayFalseIterator = conditionalLogicalArray();
const arrayFalseFirst: any = arrayFalseIterator.next();
const arrayFalseSecond: any = arrayFalseIterator.next("before");
const arrayFalseThird: any = arrayFalseIterator.next(false);
const arrayFalseFourth: any = arrayFalseIterator.next(0);
const arrayFalseFifth: any = arrayFalseIterator.next(4);
const arrayFalseDone: any = arrayFalseIterator.next("after");
console.log(
    "array-false-false",
    arrayFalseFirst.done,
    arrayFalseFirst.value,
    arrayFalseSecond.done,
    arrayFalseSecond.value,
    arrayFalseThird.done,
    arrayFalseThird.value,
    arrayFalseFourth.done,
    arrayFalseFourth.value,
    arrayFalseFifth.done,
    arrayFalseFifth.value,
    arrayFalseDone.done,
    (arrayFalseDone.value as any[]).join("|"),
);
