function* nestedLiteral(): Generator<string, any, any> {
    return ((yield "outer") && true) || (yield "fallback");
}

function* nullishNestedLiteral(): Generator<string, any, any> {
    return (yield "nullish-outer") ?? ((yield "nullish-inner") || false);
}

function* embeddedLiteral(): Generator<string, any[], any> {
    return ["head", (yield "embedded-left") && "literal-right", yield "embedded-tail"];
}

function* singleLiteral(): Generator<string, any, any> {
    return (yield "single") && true;
}

const literalFalseIterator = nestedLiteral();
const literalFalseFirst: any = literalFalseIterator.next();
const literalFalseSecond: any = literalFalseIterator.next(0);
const literalFalseDone: any = literalFalseIterator.next("fallback");
console.log(
    "literal-false",
    literalFalseFirst.done,
    literalFalseFirst.value,
    literalFalseSecond.done,
    literalFalseSecond.value,
    literalFalseDone.done,
    literalFalseDone.value,
);

const literalTrueIterator = nestedLiteral();
const literalTrueFirst: any = literalTrueIterator.next();
const literalTrueDone: any = literalTrueIterator.next(true);
console.log("literal-true", literalTrueFirst.done, literalTrueFirst.value, literalTrueDone.done, literalTrueDone.value);

const nullishValueIterator = nullishNestedLiteral();
const nullishValueFirst: any = nullishValueIterator.next();
const nullishValueDone: any = nullishValueIterator.next("kept");
console.log("nullish-value", nullishValueFirst.done, nullishValueFirst.value, nullishValueDone.done, nullishValueDone.value);

const nullishNullIterator = nullishNestedLiteral();
const nullishNullFirst: any = nullishNullIterator.next();
const nullishNullSecond: any = nullishNullIterator.next(null);
const nullishNullDone: any = nullishNullIterator.next(3);
console.log(
    "nullish-null",
    nullishNullFirst.done,
    nullishNullFirst.value,
    nullishNullSecond.done,
    nullishNullSecond.value,
    nullishNullDone.done,
    nullishNullDone.value,
);

const embeddedFalseIterator = embeddedLiteral();
const embeddedFalseFirst: any = embeddedFalseIterator.next();
const embeddedFalseSecond: any = embeddedFalseIterator.next(0);
const embeddedFalseDone: any = embeddedFalseIterator.next("tail");
console.log(
    "embedded-false",
    embeddedFalseFirst.done,
    embeddedFalseFirst.value,
    embeddedFalseSecond.done,
    embeddedFalseSecond.value,
    embeddedFalseDone.done,
    (embeddedFalseDone.value as any[]).join("|"),
);

const embeddedTrueIterator = embeddedLiteral();
const embeddedTrueFirst: any = embeddedTrueIterator.next();
const embeddedTrueSecond: any = embeddedTrueIterator.next(2);
const embeddedTrueDone: any = embeddedTrueIterator.next("tail");
console.log(
    "embedded-true",
    embeddedTrueFirst.done,
    embeddedTrueFirst.value,
    embeddedTrueSecond.done,
    embeddedTrueSecond.value,
    embeddedTrueDone.done,
    (embeddedTrueDone.value as any[]).join("|"),
);

const singleIterator = singleLiteral();
const singleFirst: any = singleIterator.next();
const singleDone: any = singleIterator.next(0);
console.log("single-literal", singleFirst.done, singleFirst.value, singleDone.done, singleDone.value);
