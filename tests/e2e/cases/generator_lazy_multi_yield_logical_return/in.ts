let booleanRightCalls = 0;

function booleanRight(value: boolean): boolean {
    booleanRightCalls++;
    return value;
}

let stringRightCalls = 0;

function stringRight(): string {
    stringRightCalls++;
    return "fallback";
}

function* andReturn(): Generator<boolean, boolean, boolean> {
    return (yield true) && booleanRight(true);
}

function* orReturn(): Generator<boolean, boolean, boolean> {
    return (yield false) || booleanRight(true);
}

function* nullishReturn(): Generator<string | null, string | null, string | null> {
    return (yield "value") ?? stringRight();
}

const andTrueIterator = andReturn();
const andTrueFirst: any = andTrueIterator.next();
console.log("and-before", booleanRightCalls, andTrueFirst.done, andTrueFirst.value);
const andTrueDone: any = andTrueIterator.next(true);
console.log("and-done", booleanRightCalls, andTrueDone.done, andTrueDone.value);

const andFalseIterator = andReturn();
const andFalseFirst: any = andFalseIterator.next();
console.log("and-false-before", booleanRightCalls, andFalseFirst.done, andFalseFirst.value);
const andFalseDone: any = andFalseIterator.next(false);
console.log("and-false-done", booleanRightCalls, andFalseDone.done, andFalseDone.value);

const orFalseIterator = orReturn();
const orFalseFirst: any = orFalseIterator.next();
console.log("or-before", booleanRightCalls, orFalseFirst.done, orFalseFirst.value);
const orFalseDone: any = orFalseIterator.next(false);
console.log("or-done", booleanRightCalls, orFalseDone.done, orFalseDone.value);

const orTrueIterator = orReturn();
const orTrueFirst: any = orTrueIterator.next();
console.log("or-true-before", booleanRightCalls, orTrueFirst.done, orTrueFirst.value);
const orTrueDone: any = orTrueIterator.next(true);
console.log("or-true-done", booleanRightCalls, orTrueDone.done, orTrueDone.value);

const nullishValueIterator = nullishReturn();
const nullishValueFirst: any = nullishValueIterator.next();
console.log("nullish-before", stringRightCalls, nullishValueFirst.done, nullishValueFirst.value);
const nullishValueDone: any = nullishValueIterator.next("kept");
console.log("nullish-done", stringRightCalls, nullishValueDone.done, nullishValueDone.value);

const nullishNullIterator = nullishReturn();
const nullishNullFirst: any = nullishNullIterator.next();
console.log("nullish-null-before", stringRightCalls, nullishNullFirst.done, nullishNullFirst.value);
const nullishNullDone: any = nullishNullIterator.next(null);
console.log("nullish-null-done", stringRightCalls, nullishNullDone.done, nullishNullDone.value);
