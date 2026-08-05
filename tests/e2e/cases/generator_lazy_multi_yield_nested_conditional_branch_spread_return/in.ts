interface NestedResult {
    left: number;
    right: number;
    marker: number;
}

function* typedObject(): Generator<string, NestedResult, number> {
    return {
        ...((yield "typed-outer")
            ? ((yield "typed-inner")
                ? { left: yield "typed-true-true-left", right: yield "typed-true-true-right" }
                : { left: yield "typed-true-false-left", right: yield "typed-true-false-right" })
            : { left: yield "typed-outer-false-left", right: yield "typed-outer-false-right" }),
        marker: 3,
    };
}

function* dynamicArray(): Generator<any, any, any> {
    return [
        ...((yield "array-outer")
            ? ((yield "array-inner") ? (yield "array-true") : (yield "array-false"))
            : ((yield "array-outer-false-a") + (yield "array-outer-false-b"))),
        "!",
    ];
}

const typedTrueIterator = typedObject();
const typedTrueFirst: any = typedTrueIterator.next();
const typedTrueSecond: any = typedTrueIterator.next(1);
const typedTrueThird: any = typedTrueIterator.next(0);
const typedTrueFourth: any = typedTrueIterator.next(10);
const typedTrueDone: any = typedTrueIterator.next(20);
const typedTrueValue = typedTrueDone.value as NestedResult;
console.log(
    "typed-true",
    typedTrueFirst.done,
    typedTrueFirst.value,
    typedTrueSecond.done,
    typedTrueSecond.value,
    typedTrueThird.done,
    typedTrueThird.value,
    typedTrueFourth.done,
    typedTrueFourth.value,
    typedTrueDone.done,
    typedTrueValue.left,
    typedTrueValue.right,
    typedTrueValue.marker,
);

const typedFalseIterator = typedObject();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseSecond: any = typedFalseIterator.next(0);
const typedFalseThird: any = typedFalseIterator.next(20);
const typedFalseDone: any = typedFalseIterator.next(30);
const typedFalseValue = typedFalseDone.value as NestedResult;
console.log(
    "typed-false",
    typedFalseFirst.done,
    typedFalseFirst.value,
    typedFalseSecond.done,
    typedFalseSecond.value,
    typedFalseThird.done,
    typedFalseThird.value,
    typedFalseDone.done,
    typedFalseValue.left,
    typedFalseValue.right,
    typedFalseValue.marker,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next(true);
const dynamicArrayThird: any = dynamicArrayIterator.next(true);
const dynamicArrayDone: any = dynamicArrayIterator.next("A");
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value,
    dynamicArraySecond.done,
    dynamicArraySecond.value,
    dynamicArrayThird.done,
    dynamicArrayThird.value,
    dynamicArrayDone.done,
    (dynamicArrayDone.value as any[]).join("|"),
);
