interface SiblingResult {
    before: number;
    first: number;
    second: number;
    after: number;
}

function* typedObject(): Generator<string, SiblingResult, number> {
    return {
        before: yield "typed-before",
        ...(((yield "typed-first-condition")
            ? { first: yield "typed-first-true" }
            : { first: yield "typed-first-false" })),
        ...(((yield "typed-second-condition")
            ? { second: yield "typed-second-true" }
            : { second: yield "typed-second-false" })),
        after: yield "typed-after",
    };
}

function* dynamicArray(): Generator<string, any[], any> {
    return [
        yield "array-before",
        ...(((yield "array-first-condition") ? [yield "array-first-true"] : [yield "array-first-false"])),
        ...(((yield "array-second-condition") ? [yield "array-second-true"] : [yield "array-second-false"])),
        yield "array-after",
    ];
}

const typedTrueFalseIterator = typedObject();
const typedTrueFalseFirst: any = typedTrueFalseIterator.next();
const typedTrueFalseSecond: any = typedTrueFalseIterator.next(10);
const typedTrueFalseThird: any = typedTrueFalseIterator.next(1);
const typedTrueFalseFourth: any = typedTrueFalseIterator.next(20);
const typedTrueFalseFifth: any = typedTrueFalseIterator.next(0);
const typedTrueFalseSixth: any = typedTrueFalseIterator.next(30);
const typedTrueFalseDone: any = typedTrueFalseIterator.next(40);
const typedTrueFalseValue = typedTrueFalseDone.value as SiblingResult;
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
    typedTrueFalseSixth.done,
    typedTrueFalseSixth.value,
    typedTrueFalseDone.done,
    typedTrueFalseValue.before,
    typedTrueFalseValue.first,
    typedTrueFalseValue.second,
    typedTrueFalseValue.after,
);

const typedFalseTrueIterator = typedObject();
const typedFalseTrueFirst: any = typedFalseTrueIterator.next();
const typedFalseTrueSecond: any = typedFalseTrueIterator.next(11);
const typedFalseTrueThird: any = typedFalseTrueIterator.next(0);
const typedFalseTrueFourth: any = typedFalseTrueIterator.next(21);
const typedFalseTrueFifth: any = typedFalseTrueIterator.next(1);
const typedFalseTrueSixth: any = typedFalseTrueIterator.next(31);
const typedFalseTrueDone: any = typedFalseTrueIterator.next(41);
const typedFalseTrueValue = typedFalseTrueDone.value as SiblingResult;
console.log(
    "typed-false-true",
    typedFalseTrueFirst.done,
    typedFalseTrueFirst.value,
    typedFalseTrueSecond.done,
    typedFalseTrueSecond.value,
    typedFalseTrueThird.done,
    typedFalseTrueThird.value,
    typedFalseTrueFourth.done,
    typedFalseTrueFourth.value,
    typedFalseTrueFifth.done,
    typedFalseTrueFifth.value,
    typedFalseTrueSixth.done,
    typedFalseTrueSixth.value,
    typedFalseTrueDone.done,
    typedFalseTrueValue.before,
    typedFalseTrueValue.first,
    typedFalseTrueValue.second,
    typedFalseTrueValue.after,
);

const dynamicArrayIterator = dynamicArray();
const dynamicArrayFirst: any = dynamicArrayIterator.next();
const dynamicArraySecond: any = dynamicArrayIterator.next("B");
const dynamicArrayThird: any = dynamicArrayIterator.next(true);
const dynamicArrayFourth: any = dynamicArrayIterator.next("F1");
const dynamicArrayFifth: any = dynamicArrayIterator.next(false);
const dynamicArraySixth: any = dynamicArrayIterator.next("F2");
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
    dynamicArraySixth.done,
    dynamicArraySixth.value,
    dynamicArrayDone.done,
    dynamicArrayDone.value.join("|"),
);
