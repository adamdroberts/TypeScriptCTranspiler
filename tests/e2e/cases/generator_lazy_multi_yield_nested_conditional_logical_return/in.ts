function* nestedConditionalLogicalAndReturn(): Generator<string, string, any> {
    return (yield "and-left") && ((yield "and-selector") ? (yield "and-true") : (yield "and-false"));
}

function* nestedConditionalLogicalOrReturn(): Generator<string, string, any> {
    return (yield "or-left") || ((yield "or-selector") ? (yield "or-true") : (yield "or-false"));
}

function* nestedConditionalLogicalNullishReturn(): Generator<string, string, any> {
    return (yield "nullish-left") ?? ((yield "nullish-selector") ? (yield "nullish-true") : (yield "nullish-false"));
}

function* nestedConditionalLogicalSelectorReturn(): Generator<string, string, any> {
    return (yield "selector-left") && (((yield "selector-condition-left") || (yield "selector-condition-right"))
        ? (yield "selector-true")
        : (yield "selector-false"));
}

function* nestedConditionalLogicalArmReturn(): Generator<string, string, any> {
    return (yield "arm-left") && ((yield "arm-selector")
        ? ((yield "arm-true-left") || (yield "arm-true-right"))
        : ((yield "arm-false-left") ?? (yield "arm-false-right")));
}

function* pureAndOperandReturn(prefix: string): Generator<string, string, any> {
    return (yield "pure-and-left") && (prefix + "-and");
}

function* pureOrOperandReturn(prefix: string): Generator<string, string, any> {
    return (yield "pure-or-left") || (prefix + "-or");
}

function* pureNullishOperandReturn(prefix: string): Generator<string, string, any> {
    return (yield "pure-nullish-left") ?? (prefix + "-nullish");
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

const nullishSkipped = nestedConditionalLogicalNullishReturn();
const nullishSkippedFirst: any = nullishSkipped.next();
console.log("nullish-skipped-first", nullishSkippedFirst.done, nullishSkippedFirst.value);
const nullishSkippedDone: any = nullishSkipped.next("nullish-result");
console.log("nullish-skipped-done", nullishSkippedDone.done, nullishSkippedDone.value);

const nullishSelected = nestedConditionalLogicalNullishReturn();
const nullishSelectedFirst: any = nullishSelected.next();
console.log("nullish-selected-first", nullishSelectedFirst.done, nullishSelectedFirst.value);
const nullishSelectedSecond: any = nullishSelected.next(null);
console.log("nullish-selected-second", nullishSelectedSecond.done, nullishSelectedSecond.value);
const nullishSelectedArm: any = nullishSelected.next(false);
console.log("nullish-selected-arm", nullishSelectedArm.done, nullishSelectedArm.value);
const nullishSelectedDone: any = nullishSelected.next("nullish-arm-result");
console.log("nullish-selected-done", nullishSelectedDone.done, nullishSelectedDone.value);

const selectorSkipped = nestedConditionalLogicalSelectorReturn();
const selectorSkippedFirst: any = selectorSkipped.next();
console.log("selector-skipped-first", selectorSkippedFirst.done, selectorSkippedFirst.value);
const selectorSkippedDone: any = selectorSkipped.next(false);
console.log("selector-skipped-done", selectorSkippedDone.done, selectorSkippedDone.value);

const selectorShortCircuited = nestedConditionalLogicalSelectorReturn();
const selectorShortCircuitedFirst: any = selectorShortCircuited.next();
console.log("selector-short-circuited-first", selectorShortCircuitedFirst.done, selectorShortCircuitedFirst.value);
const selectorShortCircuitedSecond: any = selectorShortCircuited.next(true);
console.log("selector-short-circuited-second", selectorShortCircuitedSecond.done, selectorShortCircuitedSecond.value);
const selectorShortCircuitedArm: any = selectorShortCircuited.next(true);
console.log("selector-short-circuited-arm", selectorShortCircuitedArm.done, selectorShortCircuitedArm.value);
const selectorShortCircuitedDone: any = selectorShortCircuited.next("selector-true-result");
console.log("selector-short-circuited-done", selectorShortCircuitedDone.done, selectorShortCircuitedDone.value);

const selectorNested = nestedConditionalLogicalSelectorReturn();
const selectorNestedFirst: any = selectorNested.next();
console.log("selector-nested-first", selectorNestedFirst.done, selectorNestedFirst.value);
const selectorNestedSecond: any = selectorNested.next(true);
console.log("selector-nested-second", selectorNestedSecond.done, selectorNestedSecond.value);
const selectorNestedThird: any = selectorNested.next(false);
console.log("selector-nested-third", selectorNestedThird.done, selectorNestedThird.value);
const selectorNestedArm: any = selectorNested.next(false);
console.log("selector-nested-arm", selectorNestedArm.done, selectorNestedArm.value);
const selectorNestedDone: any = selectorNested.next("selector-false-result");
console.log("selector-nested-done", selectorNestedDone.done, selectorNestedDone.value);

const armSkipped = nestedConditionalLogicalArmReturn();
const armSkippedFirst: any = armSkipped.next();
console.log("arm-skipped-first", armSkippedFirst.done, armSkippedFirst.value);
const armSkippedDone: any = armSkipped.next(false);
console.log("arm-skipped-done", armSkippedDone.done, armSkippedDone.value);

const armTrue = nestedConditionalLogicalArmReturn();
const armTrueFirst: any = armTrue.next();
console.log("arm-true-first", armTrueFirst.done, armTrueFirst.value);
const armTrueSecond: any = armTrue.next(true);
console.log("arm-true-second", armTrueSecond.done, armTrueSecond.value);
const armTrueThird: any = armTrue.next(true);
console.log("arm-true-third", armTrueThird.done, armTrueThird.value);
const armTrueDone: any = armTrue.next("arm-true-result");
console.log("arm-true-done", armTrueDone.done, armTrueDone.value);

const armFalse = nestedConditionalLogicalArmReturn();
const armFalseFirst: any = armFalse.next();
console.log("arm-false-first", armFalseFirst.done, armFalseFirst.value);
const armFalseSecond: any = armFalse.next(true);
console.log("arm-false-second", armFalseSecond.done, armFalseSecond.value);
const armFalseThird: any = armFalse.next(false);
console.log("arm-false-third", armFalseThird.done, armFalseThird.value);
const armFalseFourth: any = armFalse.next(null);
console.log("arm-false-fourth", armFalseFourth.done, armFalseFourth.value);
const armFalseDone: any = armFalse.next("arm-false-result");
console.log("arm-false-done", armFalseDone.done, armFalseDone.value);

const pureAndSkipped = pureAndOperandReturn("prefix");
const pureAndSkippedFirst: any = pureAndSkipped.next();
console.log("pure-and-skipped-first", pureAndSkippedFirst.done, pureAndSkippedFirst.value);
const pureAndSkippedDone: any = pureAndSkipped.next(false);
console.log("pure-and-skipped-done", pureAndSkippedDone.done, pureAndSkippedDone.value);

const pureAndSelected = pureAndOperandReturn("prefix");
const pureAndSelectedFirst: any = pureAndSelected.next();
console.log("pure-and-selected-first", pureAndSelectedFirst.done, pureAndSelectedFirst.value);
const pureAndSelectedDone: any = pureAndSelected.next(true);
console.log("pure-and-selected-done", pureAndSelectedDone.done, pureAndSelectedDone.value);

const pureOrSkipped = pureOrOperandReturn("prefix");
const pureOrSkippedFirst: any = pureOrSkipped.next();
console.log("pure-or-skipped-first", pureOrSkippedFirst.done, pureOrSkippedFirst.value);
const pureOrSkippedDone: any = pureOrSkipped.next(true);
console.log("pure-or-skipped-done", pureOrSkippedDone.done, pureOrSkippedDone.value);

const pureOrSelected = pureOrOperandReturn("prefix");
const pureOrSelectedFirst: any = pureOrSelected.next();
console.log("pure-or-selected-first", pureOrSelectedFirst.done, pureOrSelectedFirst.value);
const pureOrSelectedDone: any = pureOrSelected.next(false);
console.log("pure-or-selected-done", pureOrSelectedDone.done, pureOrSelectedDone.value);

const pureNullishSkipped = pureNullishOperandReturn("prefix");
const pureNullishSkippedFirst: any = pureNullishSkipped.next();
console.log("pure-nullish-skipped-first", pureNullishSkippedFirst.done, pureNullishSkippedFirst.value);
const pureNullishSkippedDone: any = pureNullishSkipped.next("left");
console.log("pure-nullish-skipped-done", pureNullishSkippedDone.done, pureNullishSkippedDone.value);

const pureNullishSelected = pureNullishOperandReturn("prefix");
const pureNullishSelectedFirst: any = pureNullishSelected.next();
console.log("pure-nullish-selected-first", pureNullishSelectedFirst.done, pureNullishSelectedFirst.value);
const pureNullishSelectedDone: any = pureNullishSelected.next(null);
console.log("pure-nullish-selected-done", pureNullishSelectedDone.done, pureNullishSelectedDone.value);
