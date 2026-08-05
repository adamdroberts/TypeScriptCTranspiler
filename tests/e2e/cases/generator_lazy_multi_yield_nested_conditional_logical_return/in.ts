function* nestedConditionalLogicalAndReturn(): Generator<string, string, any> {
    return (yield "and-left") && ((yield "and-selector") ? (yield "and-true") : (yield "and-false"));
}

function* nestedConditionalLogicalOrReturn(): Generator<string, string, any> {
    return (yield "or-left") || ((yield "or-selector") ? (yield "or-true") : (yield "or-false"));
}

const andSkipped = nestedConditionalLogicalAndReturn();
const andSkippedFirst: any = andSkipped.next();
console.log("and-skipped-first", andSkippedFirst.done, andSkippedFirst.value);
const andSkippedDone: any = andSkipped.next(false);
console.log("and-skipped-done", andSkippedDone.done, andSkippedDone.value);

const andSelected = nestedConditionalLogicalAndReturn();
const andSelectedFirst: any = andSelected.next();
console.log("and-selected-first", andSelectedFirst.done, andSelectedFirst.value);
const andSelectedSecond: any = andSelected.next(true);
console.log("and-selected-second", andSelectedSecond.done, andSelectedSecond.value);
const andSelectedArm: any = andSelected.next("and-result");
console.log("and-selected-arm", andSelectedArm.done, andSelectedArm.value);
const andSelectedDone: any = andSelected.next("and-arm-result");
console.log("and-selected-done", andSelectedDone.done, andSelectedDone.value);

const orSkipped = nestedConditionalLogicalOrReturn();
const orSkippedFirst: any = orSkipped.next();
console.log("or-skipped-first", orSkippedFirst.done, orSkippedFirst.value);
const orSkippedDone: any = orSkipped.next(true);
console.log("or-skipped-done", orSkippedDone.done, orSkippedDone.value);

const orSelected = nestedConditionalLogicalOrReturn();
const orSelectedFirst: any = orSelected.next();
console.log("or-selected-first", orSelectedFirst.done, orSelectedFirst.value);
const orSelectedSecond: any = orSelected.next(false);
console.log("or-selected-second", orSelectedSecond.done, orSelectedSecond.value);
const orSelectedArm: any = orSelected.next(false);
console.log("or-selected-arm", orSelectedArm.done, orSelectedArm.value);
const orSelectedDone: any = orSelected.next("or-arm-result");
console.log("or-selected-done", orSelectedDone.done, orSelectedDone.value);
