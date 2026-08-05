function* nestedAndOr(): Generator<string, any, any> {
    return ((yield "and-or-outer") && (yield "and-or-inner")) || (yield "and-or-fallback");
}

function* nestedAndNullish(): Generator<string, any, any> {
    return (yield "and-nullish-outer") && ((yield "and-nullish-left") ?? (yield "and-nullish-right"));
}

function* nestedNullishAnd(): Generator<string, any, any> {
    return ((yield "nullish-and-outer") ?? (yield "nullish-and-fallback")) && (yield "nullish-and-right");
}

function* typedNested(): Generator<boolean, boolean, boolean> {
    return ((yield true) && (yield false)) || (yield true);
}

const andOrFalseIterator = nestedAndOr();
const andOrFalseFirst: any = andOrFalseIterator.next();
const andOrFalseSecond: any = andOrFalseIterator.next(0);
const andOrFalseDone: any = andOrFalseIterator.next(7);
console.log(
    "and-or-false",
    andOrFalseFirst.done,
    andOrFalseFirst.value,
    andOrFalseSecond.done,
    andOrFalseSecond.value,
    andOrFalseDone.done,
    andOrFalseDone.value,
);

const andOrNestedFalseIterator = nestedAndOr();
const andOrNestedFalseFirst: any = andOrNestedFalseIterator.next();
const andOrNestedFalseSecond: any = andOrNestedFalseIterator.next(1);
const andOrNestedFalseThird: any = andOrNestedFalseIterator.next(0);
const andOrNestedFalseDone: any = andOrNestedFalseIterator.next(8);
console.log(
    "and-or-nested-false",
    andOrNestedFalseFirst.done,
    andOrNestedFalseFirst.value,
    andOrNestedFalseSecond.done,
    andOrNestedFalseSecond.value,
    andOrNestedFalseThird.done,
    andOrNestedFalseThird.value,
    andOrNestedFalseDone.done,
    andOrNestedFalseDone.value,
);

const andOrTrueIterator = nestedAndOr();
const andOrTrueFirst: any = andOrTrueIterator.next();
const andOrTrueSecond: any = andOrTrueIterator.next(1);
const andOrTrueDone: any = andOrTrueIterator.next(2);
console.log(
    "and-or-true",
    andOrTrueFirst.done,
    andOrTrueFirst.value,
    andOrTrueSecond.done,
    andOrTrueSecond.value,
    andOrTrueDone.done,
    andOrTrueDone.value,
);

const andNullishFalseIterator = nestedAndNullish();
const andNullishFalseFirst: any = andNullishFalseIterator.next();
const andNullishFalseDone: any = andNullishFalseIterator.next(0);
console.log(
    "and-nullish-false",
    andNullishFalseFirst.done,
    andNullishFalseFirst.value,
    andNullishFalseDone.done,
    andNullishFalseDone.value,
);

const andNullishNullIterator = nestedAndNullish();
const andNullishNullFirst: any = andNullishNullIterator.next();
const andNullishNullSecond: any = andNullishNullIterator.next(1);
const andNullishNullThird: any = andNullishNullIterator.next(null);
const andNullishNullDone: any = andNullishNullIterator.next("right");
console.log(
    "and-nullish-null",
    andNullishNullFirst.done,
    andNullishNullFirst.value,
    andNullishNullSecond.done,
    andNullishNullSecond.value,
    andNullishNullThird.done,
    andNullishNullThird.value,
    andNullishNullDone.done,
    andNullishNullDone.value,
);

const andNullishValueIterator = nestedAndNullish();
const andNullishValueFirst: any = andNullishValueIterator.next();
const andNullishValueSecond: any = andNullishValueIterator.next(1);
const andNullishValueDone: any = andNullishValueIterator.next("kept");
console.log(
    "and-nullish-value",
    andNullishValueFirst.done,
    andNullishValueFirst.value,
    andNullishValueSecond.done,
    andNullishValueSecond.value,
    andNullishValueDone.done,
    andNullishValueDone.value,
);

const nullishAndNullIterator = nestedNullishAnd();
const nullishAndNullFirst: any = nullishAndNullIterator.next();
const nullishAndNullSecond: any = nullishAndNullIterator.next(null);
const nullishAndNullThird: any = nullishAndNullIterator.next(1);
const nullishAndNullDone: any = nullishAndNullIterator.next(2);
console.log(
    "nullish-and-null",
    nullishAndNullFirst.done,
    nullishAndNullFirst.value,
    nullishAndNullSecond.done,
    nullishAndNullSecond.value,
    nullishAndNullThird.done,
    nullishAndNullThird.value,
    nullishAndNullDone.done,
    nullishAndNullDone.value,
);

const nullishAndValueIterator = nestedNullishAnd();
const nullishAndValueFirst: any = nullishAndValueIterator.next();
const nullishAndValueSecond: any = nullishAndValueIterator.next("kept");
const nullishAndValueDone: any = nullishAndValueIterator.next(3);
console.log(
    "nullish-and-value",
    nullishAndValueFirst.done,
    nullishAndValueFirst.value,
    nullishAndValueSecond.done,
    nullishAndValueSecond.value,
    nullishAndValueDone.done,
    nullishAndValueDone.value,
);

const typedFalseIterator = typedNested();
const typedFalseFirst: any = typedFalseIterator.next();
const typedFalseSecond: any = typedFalseIterator.next(false);
const typedFalseDone: any = typedFalseIterator.next(true);
console.log(
    "typed-false",
    typedFalseFirst.done,
    typedFalseFirst.value,
    typedFalseSecond.done,
    typedFalseSecond.value,
    typedFalseDone.done,
    typedFalseDone.value,
);

const typedNestedIterator = typedNested();
const typedNestedFirst: any = typedNestedIterator.next();
const typedNestedSecond: any = typedNestedIterator.next(true);
const typedNestedDone: any = typedNestedIterator.next(false);
const typedNestedFinal: any = typedNestedIterator.next(true);
console.log(
    "typed-nested",
    typedNestedFirst.done,
    typedNestedFirst.value,
    typedNestedSecond.done,
    typedNestedSecond.value,
    typedNestedDone.done,
    typedNestedDone.value,
    typedNestedFinal.done,
    typedNestedFinal.value,
);
