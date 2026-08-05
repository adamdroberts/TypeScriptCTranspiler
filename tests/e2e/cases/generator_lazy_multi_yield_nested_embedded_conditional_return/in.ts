interface NestedEmbeddedResult {
    left: number;
    middle: number;
    right: number;
    marker: number;
}

function* typedObject(): Generator<string, NestedEmbeddedResult, number> {
    return {
        ...(((yield "typed-outer")
            ? {
                left: yield "typed-true-before",
                ...(((yield "typed-inner")
                    ? { middle: yield "typed-inner-true" }
                    : { middle: yield "typed-inner-false" })),
                right: yield "typed-true-after",
            }
            : {
                left: yield "typed-false-before",
                middle: 0,
                right: yield "typed-false-after",
            })),
        marker: 3,
    };
}

function* dynamicArray(): Generator<string, any[], any> {
    return [
        ...(((yield "array-outer")
            ? [
                yield "array-true-before",
                ...(((yield "array-inner")
                    ? [yield "array-inner-true"]
                    : [yield "array-inner-false"])),
                yield "array-true-after",
            ]
            : [yield "array-false-before", yield "array-false-after"])),
        "!",
    ];
}

const typedTrueFalseIterator = typedObject();
const typedTrueFalseFirst: any = typedTrueFalseIterator.next();
const typedTrueFalseSecond: any = typedTrueFalseIterator.next(1);
const typedTrueFalseThird: any = typedTrueFalseIterator.next(10);
const typedTrueFalseFourth: any = typedTrueFalseIterator.next(0);
const typedTrueFalseFifth: any = typedTrueFalseIterator.next(20);
const typedTrueFalseDone: any = typedTrueFalseIterator.next(30);
const typedTrueFalseValue = typedTrueFalseDone.value as NestedEmbeddedResult;
console.log(
    "typed-true-false",
    typedTrueFalseFirst.done,
    typedTrueFalseFirst.value,
    typedTrueFalseSecond.done,
    typedTrueFalseSecond.value,
    typedTrueFalseThird.done,
    typedTrueFalseThird.value,
    typedTrueFalseFourth.done,
    typedTrueFalseFourth.value,
    typedTrueFalseFifth.done,
    typedTrueFalseFifth.value,
    typedTrueFalseDone.done,
    typedTrueFalseValue.left,
    typedTrueFalseValue.middle,
    typedTrueFalseValue.right,
    typedTrueFalseValue.marker,
);

const typedFalseIterator = typedObject();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseSecond: any = typedFalseIterator.next(0);
const typedFalseThird: any = typedFalseIterator.next(11);
const typedFalseDone: any = typedFalseIterator.next(21);
const typedFalseValue = typedFalseDone.value as NestedEmbeddedResult;
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
    typedFalseValue.middle,
    typedFalseValue.right,
    typedFalseValue.marker,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next(true);
const dynamicArrayThird: any = dynamicArrayIterator.next("B");
const dynamicArrayFourth: any = dynamicArrayIterator.next(true);
const dynamicArrayFifth: any = dynamicArrayIterator.next("T");
const dynamicArrayDone: any = dynamicArrayIterator.next("A");
console.log(
    "dynamic-array",
    dynamicArrayFirst.done,
    dynamicArrayFirst.value,
    dynamicArraySecond.done,
    dynamicArraySecond.value,
    dynamicArrayThird.done,
    dynamicArrayThird.value,
    dynamicArrayFourth.done,
    dynamicArrayFourth.value,
    dynamicArrayFifth.done,
    dynamicArrayFifth.value,
    dynamicArrayDone.done,
    dynamicArrayDone.value.join("|"),
);
