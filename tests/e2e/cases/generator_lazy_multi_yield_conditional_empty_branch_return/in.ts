function* typedValue(): Generator<string, number, number> {
    return (yield "typed-condition") ? 7 : yield "typed-false-value";
}

function* dynamicArray(): Generator<string, any[], any> {
    return [
        ...(((yield "array-condition") ? ["true"] : [yield "array-false-value"])),
        "!",
    ];
}

const typedTrueIterator = typedValue();
const typedTrueFirst: any = typedTrueIterator.next();
const typedTrueDone: any = typedTrueIterator.next(1);
console.log("typed-true", typedTrueFirst.done, typedTrueFirst.value, typedTrueDone.done, typedTrueDone.value);

const typedFalseIterator = typedValue();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseSecond: any = typedFalseIterator.next(0);
const typedFalseDone: any = typedFalseIterator.next(42);
console.log(
    "typed-false",
    typedFalseFirst.done,
    typedFalseFirst.value,
    typedFalseSecond.done,
    typedFalseSecond.value,
    typedFalseDone.done,
    typedFalseDone.value,
);

const dynamicTrueIterator = dynamicArray();
const dynamicTrueFirst: any = dynamicTrueIterator.next();
const dynamicTrueDone: any = dynamicTrueIterator.next(true);
console.log(
    "dynamic-true",
    dynamicTrueFirst.done,
    dynamicTrueFirst.value,
    dynamicTrueDone.done,
    dynamicTrueDone.value.join("|"),
);

const dynamicFalseIterator = dynamicArray();
const dynamicFalseFirst: any = dynamicFalseIterator.next();
const dynamicFalseSecond: any = dynamicFalseIterator.next(false);
const dynamicFalseDone: any = dynamicFalseIterator.next("F");
console.log(
    "dynamic-false",
    dynamicFalseFirst.done,
    dynamicFalseFirst.value,
    dynamicFalseSecond.done,
    dynamicFalseSecond.value,
    dynamicFalseDone.done,
    dynamicFalseDone.value.join("|"),
);
