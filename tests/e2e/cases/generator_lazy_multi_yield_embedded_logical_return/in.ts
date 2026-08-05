function* typedArray(): Generator<string, number[], number> {
    return [1, (yield "typed-array-left") && (yield "typed-array-right"), 3];
}

function* dynamicObject(): Generator<string, any, any> {
    return {
        before: yield "object-before",
        value: (yield "object-left") || (yield "object-right"),
        after: yield "object-after",
    };
}

function* siblingArray(): Generator<string, any[], any> {
    return [
        yield "sibling-before",
        (yield "first-left") && (yield "first-right"),
        (yield "second-left") || (yield "second-right"),
        yield "sibling-after",
    ];
}

const typedFalseIterator = typedArray();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseDone: any = typedFalseIterator.next(0);
console.log("typed-false", typedFalseFirst.done, typedFalseFirst.value, typedFalseDone.done, (typedFalseDone.value as number[]).join("|"));

const typedTrueIterator = typedArray();
const typedTrueFirst: any = typedTrueIterator.next();
const typedTrueSecond: any = typedTrueIterator.next(2);
const typedTrueDone: any = typedTrueIterator.next(4);
console.log(
    "typed-true",
    typedTrueFirst.done,
    typedTrueFirst.value,
    typedTrueSecond.done,
    typedTrueSecond.value,
    typedTrueDone.done,
    (typedTrueDone.value as number[]).join("|"),
);

const objectTrueIterator = dynamicObject();
const objectTrueFirst: any = objectTrueIterator.next();
const objectTrueSecond: any = objectTrueIterator.next("before");
const objectTrueThird: any = objectTrueIterator.next("kept");
const objectTrueDone: any = objectTrueIterator.next("after");
const objectTrueValue = objectTrueDone.value as any;
console.log(
    "object-true",
    objectTrueFirst.done,
    objectTrueFirst.value,
    objectTrueSecond.done,
    objectTrueSecond.value,
    objectTrueThird.done,
    objectTrueThird.value,
    objectTrueDone.done,
    `${objectTrueValue.before}|${objectTrueValue.value}|${objectTrueValue.after}`,
);

const objectFalseIterator = dynamicObject();
const objectFalseFirst: any = objectFalseIterator.next();
const objectFalseSecond: any = objectFalseIterator.next("before");
const objectFalseThird: any = objectFalseIterator.next(0);
const objectFalseFourth: any = objectFalseIterator.next("fallback");
const objectFalseDone: any = objectFalseIterator.next("after");
const objectFalseValue = objectFalseDone.value as any;
console.log(
    "object-false",
    objectFalseFirst.done,
    objectFalseFirst.value,
    objectFalseSecond.done,
    objectFalseSecond.value,
    objectFalseThird.done,
    objectFalseThird.value,
    objectFalseFourth.done,
    objectFalseFourth.value,
    objectFalseDone.done,
    `${objectFalseValue.before}|${objectFalseValue.value}|${objectFalseValue.after}`,
);

const siblingIterator = siblingArray();
const siblingFirst: any = siblingIterator.next();
const siblingSecond: any = siblingIterator.next("before");
const siblingThird: any = siblingIterator.next(0);
const siblingFourth: any = siblingIterator.next(0);
const siblingFifth: any = siblingIterator.next(2);
const siblingDone: any = siblingIterator.next("after");
console.log(
    "siblings",
    siblingFirst.done,
    siblingFirst.value,
    siblingSecond.done,
    siblingSecond.value,
    siblingThird.done,
    siblingThird.value,
    siblingFourth.done,
    siblingFourth.value,
    siblingFifth.done,
    siblingFifth.value,
    siblingDone.done,
    (siblingDone.value as any[]).join("|"),
);
