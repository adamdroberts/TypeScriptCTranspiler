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

let sideEffectingLoopCallCount = 0;
function sideEffectingLoopCall(value: any): any {
    sideEffectingLoopCallCount++;
    return value;
}

function* sideEffectingWhileLogicalCondition(): Generator<string, string, any> {
    while ((yield "side-effecting-while-left") && sideEffectingLoopCall(yield "side-effecting-while-argument")) {
        return "side-effecting-while-true-" + sideEffectingLoopCallCount;
    }
    return "side-effecting-while-false-" + sideEffectingLoopCallCount;
}

function* sideEffectingDoLogicalCondition(): Generator<string, string, any> {
    let bodyCount = 0;
    do {
        bodyCount++;
        if (bodyCount > 1) return "side-effecting-do-true-" + sideEffectingLoopCallCount;
        yield "side-effecting-do-body";
    } while ((yield "side-effecting-do-left") && sideEffectingLoopCall(yield "side-effecting-do-argument"));
    return "side-effecting-do-false-" + sideEffectingLoopCallCount;
}

function* sideEffectingForLogicalCondition(): Generator<string, string, any> {
    for (let i = 0; (yield "side-effecting-for-left") && sideEffectingLoopCall(yield "side-effecting-for-argument"); i++) {
        return "side-effecting-for-true-" + sideEffectingLoopCallCount + "-" + i;
    }
    return "side-effecting-for-false-" + sideEffectingLoopCallCount;
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

sideEffectingLoopCallCount = 0;
const sideEffectingWhileFalse = sideEffectingWhileLogicalCondition();
const sideEffectingWhileFalseFirst: any = sideEffectingWhileFalse.next();
const sideEffectingWhileFalseDone: any = sideEffectingWhileFalse.next(0);
console.log(
    "side-effecting-while-false",
    sideEffectingWhileFalseFirst.done,
    sideEffectingWhileFalseFirst.value,
    sideEffectingWhileFalseDone.done,
    sideEffectingWhileFalseDone.value,
);

const sideEffectingWhileTrue = sideEffectingWhileLogicalCondition();
const sideEffectingWhileTrueFirst: any = sideEffectingWhileTrue.next();
const sideEffectingWhileTrueSecond: any = sideEffectingWhileTrue.next(1);
const sideEffectingWhileTrueDone: any = sideEffectingWhileTrue.next(1);
console.log(
    "side-effecting-while-true",
    sideEffectingWhileTrueFirst.done,
    sideEffectingWhileTrueFirst.value,
    sideEffectingWhileTrueSecond.done,
    sideEffectingWhileTrueSecond.value,
    sideEffectingWhileTrueDone.done,
    sideEffectingWhileTrueDone.value,
);

sideEffectingLoopCallCount = 0;
const sideEffectingDoFalse = sideEffectingDoLogicalCondition();
const sideEffectingDoFalseFirst: any = sideEffectingDoFalse.next();
const sideEffectingDoFalseSecond: any = sideEffectingDoFalse.next("body");
const sideEffectingDoFalseDone: any = sideEffectingDoFalse.next(0);
console.log(
    "side-effecting-do-false",
    sideEffectingDoFalseFirst.done,
    sideEffectingDoFalseFirst.value,
    sideEffectingDoFalseSecond.done,
    sideEffectingDoFalseSecond.value,
    sideEffectingDoFalseDone.done,
    sideEffectingDoFalseDone.value,
);

const sideEffectingDoTrue = sideEffectingDoLogicalCondition();
const sideEffectingDoTrueFirst: any = sideEffectingDoTrue.next();
const sideEffectingDoTrueSecond: any = sideEffectingDoTrue.next("body");
const sideEffectingDoTrueThird: any = sideEffectingDoTrue.next(1);
const sideEffectingDoTrueDone: any = sideEffectingDoTrue.next(1);
console.log(
    "side-effecting-do-true",
    sideEffectingDoTrueFirst.done,
    sideEffectingDoTrueFirst.value,
    sideEffectingDoTrueSecond.done,
    sideEffectingDoTrueSecond.value,
    sideEffectingDoTrueThird.done,
    sideEffectingDoTrueThird.value,
    sideEffectingDoTrueDone.done,
    sideEffectingDoTrueDone.value,
);

sideEffectingLoopCallCount = 0;
const sideEffectingForFalse = sideEffectingForLogicalCondition();
const sideEffectingForFalseFirst: any = sideEffectingForFalse.next();
const sideEffectingForFalseDone: any = sideEffectingForFalse.next(0);
console.log(
    "side-effecting-for-false",
    sideEffectingForFalseFirst.done,
    sideEffectingForFalseFirst.value,
    sideEffectingForFalseDone.done,
    sideEffectingForFalseDone.value,
);

const sideEffectingForTrue = sideEffectingForLogicalCondition();
const sideEffectingForTrueFirst: any = sideEffectingForTrue.next();
const sideEffectingForTrueSecond: any = sideEffectingForTrue.next(1);
const sideEffectingForTrueDone: any = sideEffectingForTrue.next(1);
console.log(
    "side-effecting-for-true",
    sideEffectingForTrueFirst.done,
    sideEffectingForTrueFirst.value,
    sideEffectingForTrueSecond.done,
    sideEffectingForTrueSecond.value,
    sideEffectingForTrueDone.done,
    sideEffectingForTrueDone.value,
);
