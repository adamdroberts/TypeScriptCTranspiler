function* andIncrementor(): Generator<string, string, any> {
    let gate: any = true;
    let count = 0;
    for (; count < 1; gate &&= (yield "and-left") && (yield "and-right")) {
        yield "and-body";
        count++;
    }
    return "and-done";
}

function* orIncrementor(): Generator<string, string, any> {
    let gate: any = false;
    let count = 0;
    for (; count < 1; gate ||= (yield "or-left") || (yield "or-right")) {
        yield "or-body";
        count++;
    }
    return "or-done";
}

function* nullishIncrementor(): Generator<string, string, any> {
    let gate: any = null;
    let count = 0;
    for (; count < 1; gate ??= (yield "nullish-left") ?? (yield "nullish-right")) {
        yield "nullish-body";
        count++;
    }
    return "nullish-done";
}

function* skippedIncrementor(): Generator<string, string, any> {
    let gate: any = false;
    let count = 0;
    for (; count < 1; gate &&= (yield "skipped-left") && (yield "skipped-right")) {
        yield "skipped-body";
        count++;
    }
    return "skipped-done";
}

const andIterator = andIncrementor();
const andFirst: any = andIterator.next();
console.log("and-1", andFirst.done, andFirst.value);
const andSecond: any = andIterator.next(1);
console.log("and-2", andSecond.done, andSecond.value);
const andThird: any = andIterator.next(1);
console.log("and-3", andThird.done, andThird.value);
const andFourth: any = andIterator.next(1);
console.log("and-4", andFourth.done, andFourth.value);

const orIterator = orIncrementor();
const orFirst: any = orIterator.next();
console.log("or-1", orFirst.done, orFirst.value);
const orSecond: any = orIterator.next(1);
console.log("or-2", orSecond.done, orSecond.value);
const orThird: any = orIterator.next(1);
console.log("or-3", orThird.done, orThird.value);

const nullishIterator = nullishIncrementor();
const nullishFirst: any = nullishIterator.next();
console.log("nullish-1", nullishFirst.done, nullishFirst.value);
const nullishSecond: any = nullishIterator.next(1);
console.log("nullish-2", nullishSecond.done, nullishSecond.value);
const nullishThird: any = nullishIterator.next(1);
console.log("nullish-3", nullishThird.done, nullishThird.value);

const skippedIterator = skippedIncrementor();
const skippedFirst: any = skippedIterator.next();
console.log("skipped-1", skippedFirst.done, skippedFirst.value);
const skippedSecond: any = skippedIterator.next();
console.log("skipped-2", skippedSecond.done, skippedSecond.value);
