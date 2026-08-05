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
