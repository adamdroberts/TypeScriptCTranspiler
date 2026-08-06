function* logicalDiscriminant(): Generator<string, string, any> {
    switch (((yield "disc-left") && (yield "disc-middle")) || ((yield "disc-right") ?? "disc-fallback")) {
        case "match":
            return "matched";
        case "disc-fallback":
            return "fallback";
        default:
            return "default";
    }
}

function* logicalCase(): Generator<string, string, any> {
    switch ("case-match") {
        case ((yield "case-left") && (yield "case-right")):
            return "logical-case";
        case "case-match":
            return "static-case";
        default:
            return "default-case";
    }
}

let sideEffectingSwitchCallCount = 0;
function sideEffectingSwitchCall(value: any): any {
    sideEffectingSwitchCallCount++;
    return value;
}

function* sideEffectingSwitchDiscriminant(): Generator<string, string, any> {
    switch ((yield "side-effecting-disc-left") && sideEffectingSwitchCall(yield "side-effecting-disc-argument")) {
        case "match":
            return "side-effecting-disc-true-" + sideEffectingSwitchCallCount;
        default:
            return "side-effecting-disc-false-" + sideEffectingSwitchCallCount;
    }
}

function* sideEffectingSwitchCase(): Generator<string, string, any> {
    switch ("side-effecting-case-match") {
        case ((yield "side-effecting-case-left") && sideEffectingSwitchCall(yield "side-effecting-case-argument")):
            return "side-effecting-case-true-" + sideEffectingSwitchCallCount;
        case "side-effecting-case-match":
            return "side-effecting-case-static-" + sideEffectingSwitchCallCount;
        default:
            return "side-effecting-case-default-" + sideEffectingSwitchCallCount;
    }
}

const leftFalse = logicalDiscriminant();
const leftFalseFirst: any = leftFalse.next();
const leftFalseSecond: any = leftFalse.next(0);
const leftFalseDone: any = leftFalse.next("match");
console.log(
    "left-false",
    leftFalseFirst.done,
    leftFalseFirst.value,
    leftFalseSecond.done,
    leftFalseSecond.value,
    leftFalseDone.done,
    leftFalseDone.value,
);

const middleMatch = logicalDiscriminant();
const middleMatchFirst: any = middleMatch.next();
const middleMatchSecond: any = middleMatch.next(1);
const middleMatchDone: any = middleMatch.next("match");
console.log(
    "middle-match",
    middleMatchFirst.done,
    middleMatchFirst.value,
    middleMatchSecond.done,
    middleMatchSecond.value,
    middleMatchDone.done,
    middleMatchDone.value,
);

const rightFallback = logicalDiscriminant();
const rightFallbackFirst: any = rightFallback.next();
const rightFallbackSecond: any = rightFallback.next(1);
const rightFallbackThird: any = rightFallback.next(0);
const rightFallbackDone: any = rightFallback.next(null);
console.log(
    "right-fallback",
    rightFallbackFirst.done,
    rightFallbackFirst.value,
    rightFallbackSecond.done,
    rightFallbackSecond.value,
    rightFallbackThird.done,
    rightFallbackThird.value,
    rightFallbackDone.done,
    rightFallbackDone.value,
);

const caseFalse = logicalCase();
const caseFalseFirst: any = caseFalse.next();
const caseFalseDone: any = caseFalse.next(0);
console.log("case-false", caseFalseFirst.done, caseFalseFirst.value, caseFalseDone.done, caseFalseDone.value);

const caseTrue = logicalCase();
const caseTrueFirst: any = caseTrue.next();
const caseTrueSecond: any = caseTrue.next(1);
const caseTrueDone: any = caseTrue.next("case-match");
console.log(
    "case-true",
    caseTrueFirst.done,
    caseTrueFirst.value,
    caseTrueSecond.done,
    caseTrueSecond.value,
    caseTrueDone.done,
    caseTrueDone.value,
);

sideEffectingSwitchCallCount = 0;
const sideEffectingDiscFalse = sideEffectingSwitchDiscriminant();
const sideEffectingDiscFalseFirst: any = sideEffectingDiscFalse.next();
const sideEffectingDiscFalseDone: any = sideEffectingDiscFalse.next(0);
console.log(
    "side-effecting-disc-false",
    sideEffectingDiscFalseFirst.done,
    sideEffectingDiscFalseFirst.value,
    sideEffectingDiscFalseDone.done,
    sideEffectingDiscFalseDone.value,
);

const sideEffectingDiscTrue = sideEffectingSwitchDiscriminant();
const sideEffectingDiscTrueFirst: any = sideEffectingDiscTrue.next();
const sideEffectingDiscTrueSecond: any = sideEffectingDiscTrue.next(1);
const sideEffectingDiscTrueDone: any = sideEffectingDiscTrue.next("match");
console.log(
    "side-effecting-disc-true",
    sideEffectingDiscTrueFirst.done,
    sideEffectingDiscTrueFirst.value,
    sideEffectingDiscTrueSecond.done,
    sideEffectingDiscTrueSecond.value,
    sideEffectingDiscTrueDone.done,
    sideEffectingDiscTrueDone.value,
);

sideEffectingSwitchCallCount = 0;
const sideEffectingCaseFalse = sideEffectingSwitchCase();
const sideEffectingCaseFalseFirst: any = sideEffectingCaseFalse.next();
const sideEffectingCaseFalseDone: any = sideEffectingCaseFalse.next(0);
console.log(
    "side-effecting-case-false",
    sideEffectingCaseFalseFirst.done,
    sideEffectingCaseFalseFirst.value,
    sideEffectingCaseFalseDone.done,
    sideEffectingCaseFalseDone.value,
);

const sideEffectingCaseTrue = sideEffectingSwitchCase();
const sideEffectingCaseTrueFirst: any = sideEffectingCaseTrue.next();
const sideEffectingCaseTrueSecond: any = sideEffectingCaseTrue.next(1);
const sideEffectingCaseTrueDone: any = sideEffectingCaseTrue.next("side-effecting-case-match");
console.log(
    "side-effecting-case-true",
    sideEffectingCaseTrueFirst.done,
    sideEffectingCaseTrueFirst.value,
    sideEffectingCaseTrueSecond.done,
    sideEffectingCaseTrueSecond.value,
    sideEffectingCaseTrueDone.done,
    sideEffectingCaseTrueDone.value,
);
