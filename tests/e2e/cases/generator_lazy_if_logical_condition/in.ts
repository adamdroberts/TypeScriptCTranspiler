function* andCondition(): Generator<string, string, any> {
    if ((yield "and-left") && (yield "and-right")) return "and-true";
    return "and-false";
}

function* orCondition(): Generator<string, string, any> {
    if ((yield "or-left") || (yield "or-right")) return "or-true";
    return "or-false";
}

function* nullishCondition(): Generator<string, string, any> {
    if ((yield "nullish-left") ?? (yield "nullish-right")) return "nullish-true";
    return "nullish-false";
}

function* nestedCondition(): Generator<string, string, any> {
    if ((yield "nested-left") && ((yield "nested-middle") || (yield "nested-right"))) {
        return "nested-true";
    }
    return "nested-false";
}

const andFalse = andCondition();
const andFalseFirst: any = andFalse.next();
const andFalseDone: any = andFalse.next(0);
console.log("and-false", andFalseFirst.done, andFalseFirst.value, andFalseDone.done, andFalseDone.value);

const andTrue = andCondition();
const andTrueFirst: any = andTrue.next();
const andTrueSecond: any = andTrue.next(1);
const andTrueDone: any = andTrue.next(1);
console.log(
    "and-true",
    andTrueFirst.done,
    andTrueFirst.value,
    andTrueSecond.done,
    andTrueSecond.value,
    andTrueDone.done,
    andTrueDone.value,
);

const orTrue = orCondition();
const orTrueFirst: any = orTrue.next();
const orTrueDone: any = orTrue.next(1);
console.log("or-true", orTrueFirst.done, orTrueFirst.value, orTrueDone.done, orTrueDone.value);

const orFalse = orCondition();
const orFalseFirst: any = orFalse.next();
const orFalseSecond: any = orFalse.next(0);
const orFalseDone: any = orFalse.next(1);
console.log(
    "or-false",
    orFalseFirst.done,
    orFalseFirst.value,
    orFalseSecond.done,
    orFalseSecond.value,
    orFalseDone.done,
    orFalseDone.value,
);

const nullishValue = nullishCondition();
const nullishValueFirst: any = nullishValue.next();
const nullishValueDone: any = nullishValue.next("value");
console.log(
    "nullish-value",
    nullishValueFirst.done,
    nullishValueFirst.value,
    nullishValueDone.done,
    nullishValueDone.value,
);

const nullishNull = nullishCondition();
const nullishNullFirst: any = nullishNull.next();
const nullishNullSecond: any = nullishNull.next(null);
const nullishNullDone: any = nullishNull.next(1);
console.log(
    "nullish-null",
    nullishNullFirst.done,
    nullishNullFirst.value,
    nullishNullSecond.done,
    nullishNullSecond.value,
    nullishNullDone.done,
    nullishNullDone.value,
);

const nestedLeftFalse = nestedCondition();
const nestedLeftFalseFirst: any = nestedLeftFalse.next();
const nestedLeftFalseDone: any = nestedLeftFalse.next(0);
console.log(
    "nested-left-false",
    nestedLeftFalseFirst.done,
    nestedLeftFalseFirst.value,
    nestedLeftFalseDone.done,
    nestedLeftFalseDone.value,
);

const nestedMiddleTrue = nestedCondition();
const nestedMiddleTrueFirst: any = nestedMiddleTrue.next();
const nestedMiddleTrueSecond: any = nestedMiddleTrue.next(1);
const nestedMiddleTrueDone: any = nestedMiddleTrue.next(1);
console.log(
    "nested-middle-true",
    nestedMiddleTrueFirst.done,
    nestedMiddleTrueFirst.value,
    nestedMiddleTrueSecond.done,
    nestedMiddleTrueSecond.value,
    nestedMiddleTrueDone.done,
    nestedMiddleTrueDone.value,
);

const nestedMiddleFalse = nestedCondition();
const nestedMiddleFalseFirst: any = nestedMiddleFalse.next();
const nestedMiddleFalseSecond: any = nestedMiddleFalse.next(1);
const nestedMiddleFalseThird: any = nestedMiddleFalse.next(0);
const nestedMiddleFalseDone: any = nestedMiddleFalse.next(1);
console.log(
    "nested-middle-false",
    nestedMiddleFalseFirst.done,
    nestedMiddleFalseFirst.value,
    nestedMiddleFalseSecond.done,
    nestedMiddleFalseSecond.value,
    nestedMiddleFalseThird.done,
    nestedMiddleFalseThird.value,
    nestedMiddleFalseDone.done,
    nestedMiddleFalseDone.value,
);
