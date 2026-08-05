function* logicalSelector(): Generator<string, any, any> {
    return ((yield "condition-left") && (yield "condition-right"))
        ? (yield "true-value")
        : (yield "false-value");
}

function* logicalSelectorArray(): Generator<string, any[], any> {
    return [
        yield "before",
        (((yield "array-condition-left") && (yield "array-condition-right"))
            ? yield "array-true"
            : yield "array-false"),
        yield "after",
    ];
}

const leftFalseIterator = logicalSelector();
const leftFalseFirst: any = leftFalseIterator.next();
const leftFalseSecond: any = leftFalseIterator.next(0);
const leftFalseDone: any = leftFalseIterator.next("false");
console.log(
    "left-false",
    leftFalseFirst.done,
    leftFalseFirst.value,
    leftFalseSecond.done,
    leftFalseSecond.value,
    leftFalseDone.done,
    leftFalseDone.value,
);

const rightFalseIterator = logicalSelector();
const rightFalseFirst: any = rightFalseIterator.next();
const rightFalseSecond: any = rightFalseIterator.next(1);
const rightFalseThird: any = rightFalseIterator.next(0);
const rightFalseDone: any = rightFalseIterator.next("false");
console.log(
    "right-false",
    rightFalseFirst.done,
    rightFalseFirst.value,
    rightFalseSecond.done,
    rightFalseSecond.value,
    rightFalseThird.done,
    rightFalseThird.value,
    rightFalseDone.done,
    rightFalseDone.value,
);

const selectorTrueIterator = logicalSelector();
const selectorTrueFirst: any = selectorTrueIterator.next();
const selectorTrueSecond: any = selectorTrueIterator.next(1);
const selectorTrueThird: any = selectorTrueIterator.next(1);
const selectorTrueDone: any = selectorTrueIterator.next("true");
console.log(
    "selector-true",
    selectorTrueFirst.done,
    selectorTrueFirst.value,
    selectorTrueSecond.done,
    selectorTrueSecond.value,
    selectorTrueThird.done,
    selectorTrueThird.value,
    selectorTrueDone.done,
    selectorTrueDone.value,
);

const arrayFalseIterator = logicalSelectorArray();
const arrayFalseFirst: any = arrayFalseIterator.next();
const arrayFalseSecond: any = arrayFalseIterator.next("before");
const arrayFalseThird: any = arrayFalseIterator.next(0);
const arrayFalseFourth: any = arrayFalseIterator.next("false");
const arrayFalseDone: any = arrayFalseIterator.next("after");
console.log(
    "array-false",
    arrayFalseFirst.done,
    arrayFalseFirst.value,
    arrayFalseSecond.done,
    arrayFalseSecond.value,
    arrayFalseThird.done,
    arrayFalseThird.value,
    arrayFalseFourth.done,
    arrayFalseFourth.value,
    arrayFalseDone.done,
    (arrayFalseDone.value as any[]).join("|"),
);

const arrayTrueIterator = logicalSelectorArray();
const arrayTrueFirst: any = arrayTrueIterator.next();
const arrayTrueSecond: any = arrayTrueIterator.next("before");
const arrayTrueThird: any = arrayTrueIterator.next(1);
const arrayTrueFourth: any = arrayTrueIterator.next(1);
const arrayTrueFifth: any = arrayTrueIterator.next("true");
const arrayTrueDone: any = arrayTrueIterator.next("after");
console.log(
    "array-true",
    arrayTrueFirst.done,
    arrayTrueFirst.value,
    arrayTrueSecond.done,
    arrayTrueSecond.value,
    arrayTrueThird.done,
    arrayTrueThird.value,
    arrayTrueFourth.done,
    arrayTrueFourth.value,
    arrayTrueFifth.done,
    arrayTrueFifth.value,
    arrayTrueDone.done,
    (arrayTrueDone.value as any[]).join("|"),
);
