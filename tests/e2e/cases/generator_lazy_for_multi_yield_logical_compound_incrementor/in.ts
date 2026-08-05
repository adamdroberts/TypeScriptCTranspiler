function* andIncrementor(): Generator<string, string, number> {
    let gate: any = true;
    let count = 0;
    for (; count < 1; gate &&= (yield "and-a") + (yield "and-b")) {
        yield "and-body";
        count++;
    }
    return "and-done";
}

function* orIncrementor(): Generator<string, string, number> {
    let gate: any = false;
    let count = 0;
    for (; count < 1; gate ||= (yield "or-a") + (yield "or-b")) {
        yield "or-body";
        count++;
    }
    return "or-done";
}

function* nullishIncrementor(): Generator<string, string, number> {
    let gate: any = null;
    let count = 0;
    for (; count < 1; gate ??= (yield "nullish-a") + (yield "nullish-b")) {
        yield "nullish-body";
        count++;
    }
    return "nullish-done";
}

function* skippedAndIncrementor(): Generator<string, string, number> {
    let gate: any = false;
    let count = 0;
    for (; count < 1; gate &&= (yield "skipped-a") + (yield "skipped-b")) {
        yield "skipped-body";
        count++;
    }
    return "skipped-done";
}

const andIterator = andIncrementor();
const andFirst: any = andIterator.next();
console.log("and-1", andFirst.done, andFirst.value);
const andSecond: any = andIterator.next();
console.log("and-2", andSecond.done, andSecond.value);
const andThird: any = andIterator.next(1);
console.log("and-3", andThird.done, andThird.value);
const andFourth: any = andIterator.next(1);
console.log("and-4", andFourth.done, andFourth.value);

const orIterator = orIncrementor();
const orFirst: any = orIterator.next();
console.log("or-1", orFirst.done, orFirst.value);
const orSecond: any = orIterator.next();
console.log("or-2", orSecond.done, orSecond.value);
const orThird: any = orIterator.next(1);
console.log("or-3", orThird.done, orThird.value);
const orFourth: any = orIterator.next(1);
console.log("or-4", orFourth.done, orFourth.value);

const nullishIterator = nullishIncrementor();
const nullishFirst: any = nullishIterator.next();
console.log("nullish-1", nullishFirst.done, nullishFirst.value);
const nullishSecond: any = nullishIterator.next();
console.log("nullish-2", nullishSecond.done, nullishSecond.value);
const nullishThird: any = nullishIterator.next(1);
console.log("nullish-3", nullishThird.done, nullishThird.value);
const nullishFourth: any = nullishIterator.next(1);
console.log("nullish-4", nullishFourth.done, nullishFourth.value);

const skippedIterator = skippedAndIncrementor();
const skippedFirst: any = skippedIterator.next();
console.log("skipped-1", skippedFirst.done, skippedFirst.value);
const skippedSecond: any = skippedIterator.next();
console.log("skipped-2", skippedSecond.done, skippedSecond.value);
