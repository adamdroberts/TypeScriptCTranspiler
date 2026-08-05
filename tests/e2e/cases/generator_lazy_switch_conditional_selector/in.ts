let events: string[] = [];

function mark(label: string, value: string): string {
    events.push(label);
    return value;
}

function* directDiscriminant(): Generator<string, string, any> {
    switch ((yield "direct-discriminant") ? mark("direct-true", "hit") : mark("direct-false", "miss")) {
        case "hit":
            return "direct-hit";
        default:
            return "direct-miss";
    }
}

function* logicalDiscriminant(): Generator<string, string, any> {
    switch (((yield "logical-left") || (yield "logical-right")) ? "hit" : "miss") {
        case "hit":
            return "logical-hit";
        default:
            return "logical-miss";
    }
}

function* conditionalCase(): Generator<string, string, any> {
    switch ("case-match") {
        case (((yield "case-left") && (yield "case-right"))
            ? mark("case-true", "case-match")
            : mark("case-false", "other")):
            return "conditional-case";
        case "case-match":
            return "static-case";
        default:
            return "default-case";
    }
}

events = [];
const directFalse = directDiscriminant();
const directFalseFirst: any = directFalse.next();
const directFalseDone: any = directFalse.next(0);
console.log("direct-false", directFalseFirst.done, directFalseFirst.value, directFalseDone.done, directFalseDone.value, events.join("|"));

events = [];
const directTrue = directDiscriminant();
const directTrueFirst: any = directTrue.next();
const directTrueDone: any = directTrue.next(1);
console.log("direct-true", directTrueFirst.done, directTrueFirst.value, directTrueDone.done, directTrueDone.value, events.join("|"));

const logicalFalse = logicalDiscriminant();
const logicalFalseFirst: any = logicalFalse.next();
const logicalFalseSecond: any = logicalFalse.next(0);
const logicalFalseDone: any = logicalFalse.next(0);
console.log("logical-false", logicalFalseFirst.done, logicalFalseFirst.value, logicalFalseSecond.done, logicalFalseSecond.value, logicalFalseDone.done, logicalFalseDone.value);

const logicalTrue = logicalDiscriminant();
const logicalTrueFirst: any = logicalTrue.next();
const logicalTrueSecond: any = logicalTrue.next(0);
const logicalTrueDone: any = logicalTrue.next(1);
console.log("logical-true", logicalTrueFirst.done, logicalTrueFirst.value, logicalTrueSecond.done, logicalTrueSecond.value, logicalTrueDone.done, logicalTrueDone.value);

events = [];
const caseFalse = conditionalCase();
const caseFalseFirst: any = caseFalse.next();
const caseFalseDone: any = caseFalse.next(0);
console.log("case-false", caseFalseFirst.done, caseFalseFirst.value, caseFalseDone.done, caseFalseDone.value, events.join("|"));

events = [];
const caseTrue = conditionalCase();
const caseTrueFirst: any = caseTrue.next();
const caseTrueSecond: any = caseTrue.next(1);
const caseTrueDone: any = caseTrue.next("case-match");
console.log("case-true", caseTrueFirst.done, caseTrueFirst.value, caseTrueSecond.done, caseTrueSecond.value, caseTrueDone.done, caseTrueDone.value, events.join("|"));
