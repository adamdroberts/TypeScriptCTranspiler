interface TypedResult {
    left: number;
    right: number;
    marker: number;
    tail: number;
}

function* typedObject(): Generator<string, TypedResult, number> {
    return {
        left: yield "typed-before",
        ...(((yield "typed-condition")
            ? { right: yield "typed-true" }
            : { right: yield "typed-false" })),
        marker: 3,
        tail: yield "typed-after",
    };
}

function* dynamicArray(): Generator<string, any[], any> {
    return [
        yield "array-before",
        ...(((yield "array-condition") ? [yield "array-true"] : [yield "array-false"])),
        yield "array-after",
    ];
}

const typedTrueIterator = typedObject();
const typedTrueFirst: any = typedTrueIterator.next();
const typedTrueSecond: any = typedTrueIterator.next(10);
const typedTrueThird: any = typedTrueIterator.next(1);
const typedTrueFourth: any = typedTrueIterator.next(20);
const typedTrueDone: any = typedTrueIterator.next(30);
const typedTrueValue = typedTrueDone.value as TypedResult;
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
    typedTrueValue.tail,
);

const typedFalseIterator = typedObject();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseSecond: any = typedFalseIterator.next(11);
const typedFalseThird: any = typedFalseIterator.next(0);
const typedFalseFourth: any = typedFalseIterator.next(21);
const typedFalseDone: any = typedFalseIterator.next(31);
const typedFalseValue = typedFalseDone.value as TypedResult;
console.log(
    "typed-false",
    typedFalseFirst.done,
    typedFalseFirst.value,
    typedFalseSecond.done,
    typedFalseSecond.value,
    typedFalseThird.done,
    typedFalseThird.value,
    typedFalseFourth.done,
    typedFalseFourth.value,
    typedFalseDone.done,
    typedFalseValue.left,
    typedFalseValue.right,
    typedFalseValue.marker,
    typedFalseValue.tail,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next("B");
const dynamicArrayThird: any = dynamicArrayIterator.next(true);
const dynamicArrayFourth: any = dynamicArrayIterator.next("T");
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
    dynamicArrayDone.done,
    dynamicArrayDone.value.join("|"),
);
