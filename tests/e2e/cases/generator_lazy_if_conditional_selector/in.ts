function* directConditional(): Generator<string, string, any> {
    if ((yield "direct-condition") ? "direct-true" : "") return "direct-then";
    return "direct-else";
}

function* logicalConditional(): Generator<string, string, any> {
    if (((yield "logical-left") && (yield "logical-right")) ? "logical-true" : "") {
        return "logical-then";
    }
    return "logical-else";
}

let branchEvents: string[] = [];

function markBranch(label: string, value: boolean): boolean {
    branchEvents.push(label);
    return value;
}

function* lazyArms(): Generator<string, string, any> {
    if ((yield "arm-condition") ? markBranch("then-arm", true) : markBranch("else-arm", false)) {
        return "arm-then";
    }
    return "arm-else";
}

const directFalse = directConditional();
const directFalseFirst: any = directFalse.next();
const directFalseDone: any = directFalse.next(0);
console.log("direct-false", directFalseFirst.done, directFalseFirst.value, directFalseDone.done, directFalseDone.value);

const directTrue = directConditional();
const directTrueFirst: any = directTrue.next();
const directTrueDone: any = directTrue.next(1);
console.log("direct-true", directTrueFirst.done, directTrueFirst.value, directTrueDone.done, directTrueDone.value);

const logicalFalse = logicalConditional();
const logicalFalseFirst: any = logicalFalse.next();
const logicalFalseDone: any = logicalFalse.next(0);
console.log("logical-false", logicalFalseFirst.done, logicalFalseFirst.value, logicalFalseDone.done, logicalFalseDone.value);

const logicalTrue = logicalConditional();
const logicalTrueFirst: any = logicalTrue.next();
const logicalTrueSecond: any = logicalTrue.next(1);
const logicalTrueDone: any = logicalTrue.next(1);
console.log(
    "logical-true",
    logicalTrueFirst.done,
    logicalTrueFirst.value,
    logicalTrueSecond.done,
    logicalTrueSecond.value,
    logicalTrueDone.done,
    logicalTrueDone.value,
);

branchEvents = [];
const armsFalse = lazyArms();
const armsFalseFirst: any = armsFalse.next();
const armsFalseDone: any = armsFalse.next(0);
console.log("arms-false", armsFalseFirst.done, armsFalseFirst.value, armsFalseDone.done, armsFalseDone.value, branchEvents.join("|"));

branchEvents = [];
const armsTrue = lazyArms();
const armsTrueFirst: any = armsTrue.next();
const armsTrueDone: any = armsTrue.next(1);
console.log("arms-true", armsTrueFirst.done, armsTrueFirst.value, armsTrueDone.done, armsTrueDone.value, branchEvents.join("|"));
