function* whileLogical(): Generator<string, string, any> {
    let count = 0;
    while ((yield "while-left") && (yield "while-right")) {
        count++;
        yield "while-body-" + count;
    }
    return "while-" + count;
}

function* doLogical(): Generator<string, string, any> {
    let count = 0;
    do {
        count++;
        yield "do-body-" + count;
    } while ((yield "do-left") || (yield "do-right"));
    return "do-" + count;
}

function* forLogical(): Generator<string, string, any> {
    let count = 0;
    for (; (yield "for-left") ?? (yield "for-right"); count++) {
        yield "for-body-" + count;
    }
    return "for-" + count;
}

const whileFalse = whileLogical();
const whileFalseFirst: any = whileFalse.next();
const whileFalseDone: any = whileFalse.next(0);
console.log("while-false", whileFalseFirst.done, whileFalseFirst.value, whileFalseDone.done, whileFalseDone.value);

const whileTrue = whileLogical();
const whileTrueFirst: any = whileTrue.next();
const whileTrueSecond: any = whileTrue.next(1);
const whileTrueThird: any = whileTrue.next(1);
const whileTrueFourth: any = whileTrue.next("body");
const whileTrueDone: any = whileTrue.next(0);
console.log(
    "while-true",
    whileTrueFirst.done,
    whileTrueFirst.value,
    whileTrueSecond.done,
    whileTrueSecond.value,
    whileTrueThird.done,
    whileTrueThird.value,
    whileTrueFourth.done,
    whileTrueFourth.value,
    whileTrueDone.done,
    whileTrueDone.value,
);

const doFalse = doLogical();
const doFalseFirst: any = doFalse.next();
const doFalseSecond: any = doFalse.next("body");
const doFalseThird: any = doFalse.next(0);
const doFalseDone: any = doFalse.next(0);
console.log(
    "do-false",
    doFalseFirst.done,
    doFalseFirst.value,
    doFalseSecond.done,
    doFalseSecond.value,
    doFalseThird.done,
    doFalseThird.value,
    doFalseDone.done,
    doFalseDone.value,
);

const forLogicalIterator = forLogical();
const forFirst: any = forLogicalIterator.next();
const forSecond: any = forLogicalIterator.next("ready");
const forThird: any = forLogicalIterator.next("body");
const forFourth: any = forLogicalIterator.next(null);
const forFifth: any = forLogicalIterator.next("fallback");
const forSixth: any = forLogicalIterator.next("body");
const forDone: any = forLogicalIterator.next(0);
console.log(
    "for",
    forFirst.done,
    forFirst.value,
    forSecond.done,
    forSecond.value,
    forThird.done,
    forThird.value,
    forFourth.done,
    forFourth.value,
    forFifth.done,
    forFifth.value,
    forSixth.done,
    forSixth.value,
    forDone.done,
    forDone.value,
);
