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

let logicalCallCount = 0;
function sideEffectingLogicalCall(prefix: string): string {
    logicalCallCount++;
    return prefix + logicalCallCount;
}

function* stagedCallOperandReturn(): Generator<string, string, any> {
    return (yield "call-left") && sideEffectingLogicalCall("call-rhs-");
}

function* stagedCallLeftReturn(): Generator<string, string, any> {
    return sideEffectingLogicalCall("call-left-") && (yield "call-right");
}

function* stagedCallArrayReturn(): Generator<string, string[], any> {
    return [
        (yield "array-call-left") && sideEffectingLogicalCall("array-call-rhs-"),
        yield "array-after",
    ];
}

function* stagedCallLeftArrayReturn(): Generator<string, string[], any> {
    return [
        sideEffectingLogicalCall("array-left-") && (yield "array-right"),
        yield "array-after",
    ];
}

let logicalNewCount = 0;
class StagedLogicalBox {
    value: string;

    constructor(prefix: string) {
        logicalNewCount++;
        this.value = prefix + logicalNewCount;
    }
}

function* stagedNewOperandReturn(): Generator<StagedLogicalBox, StagedLogicalBox, any> {
    return (yield new StagedLogicalBox("new-left-")) && new StagedLogicalBox("new-rhs-");
}

let logicalPropertyCount = 0;
const logicalPropertyBox: any = {};
Object.defineProperty(logicalPropertyBox, "value", {
    get: () => {
        logicalPropertyCount++;
        return "property-" + logicalPropertyCount;
    },
});

let logicalElementKeyCount = 0;
const logicalElementBox: any = { "element-key": "element-result" };
function logicalElementKey(): string {
    logicalElementKeyCount++;
    return "element-key";
}

function* stagedPropertyOperandReturn(): Generator<string, string, any> {
    return (yield "property-left") && logicalPropertyBox.value;
}

function* stagedElementOperandReturn(): Generator<string, string, any> {
    return (yield "element-left") && logicalElementBox[logicalElementKey()];
}

let logicalDeleteBox: any = {};

function* stagedDeleteOperandReturn(): Generator<string, boolean, any> {
    return (yield "delete-left") && delete logicalDeleteBox.value;
}

let logicalAssignmentValue = "assignment-initial";

function* stagedAssignmentOperandReturn(): Generator<string, any, any> {
    return (yield "assignment-left") && (logicalAssignmentValue = "assignment-result");
}

let logicalConditionalCount = 0;
function logicalConditionalValue(): string {
    logicalConditionalCount++;
    return "conditional-" + logicalConditionalCount;
}

function* stagedConditionalOperandReturn(): Generator<string, any, any> {
    return (yield "conditional-left") && (true ? logicalConditionalValue() : "conditional-fallback");
}

let logicalTemplateCount = 0;
function logicalTemplateValue(): string {
    logicalTemplateCount++;
    return "template-" + logicalTemplateCount;
}

function* stagedTemplateOperandReturn(): Generator<string, any, any> {
    return (yield "template-left") && `${logicalTemplateValue()}`;
}

let logicalTaggedTemplateCount = 0;
function logicalTaggedTemplateValue(_strings: TemplateStringsArray): string {
    logicalTaggedTemplateCount++;
    return "tagged-" + logicalTaggedTemplateCount;
}

function* stagedTaggedTemplateOperandReturn(): Generator<string, any, any> {
    return (yield "tagged-left") && logicalTaggedTemplateValue`tagged`;
}

let logicalPostfixValue = 10;

function* stagedPostfixOperandReturn(): Generator<string, any, any> {
    return (yield "postfix-left") && logicalPostfixValue++;
}

let logicalPrefixValue = 20;

function* stagedPrefixOperandReturn(): Generator<string, any, any> {
    return (yield "prefix-left") && ++logicalPrefixValue;
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

logicalCallCount = 0;
const callSkipped = stagedCallOperandReturn();
const callSkippedFirst: any = callSkipped.next();
console.log("call-skipped-first", callSkippedFirst.done, callSkippedFirst.value, logicalCallCount);
const callSkippedDone: any = callSkipped.next(false);
console.log("call-skipped-done", callSkippedDone.done, callSkippedDone.value, logicalCallCount);

logicalCallCount = 0;
const callSelected = stagedCallOperandReturn();
const callSelectedFirst: any = callSelected.next();
console.log("call-selected-first", callSelectedFirst.done, callSelectedFirst.value, logicalCallCount);
const callSelectedDone: any = callSelected.next(true);
console.log("call-selected-done", callSelectedDone.done, callSelectedDone.value, logicalCallCount);

logicalCallCount = 0;
const callLeft = stagedCallLeftReturn();
const callLeftFirst: any = callLeft.next();
console.log("call-left-first", callLeftFirst.done, callLeftFirst.value, logicalCallCount);
const callLeftDone: any = callLeft.next("call-result");
console.log("call-left-done", callLeftDone.done, callLeftDone.value, logicalCallCount);

logicalCallCount = 0;
const callArraySkipped = stagedCallArrayReturn();
const callArraySkippedFirst: any = callArraySkipped.next();
console.log("call-array-skipped-first", callArraySkippedFirst.done, callArraySkippedFirst.value, logicalCallCount);
const callArraySkippedSecond: any = callArraySkipped.next(false);
console.log("call-array-skipped-second", callArraySkippedSecond.done, callArraySkippedSecond.value, logicalCallCount);
const callArraySkippedDone: any = callArraySkipped.next("array-after");
console.log("call-array-skipped-done", callArraySkippedDone.done, (callArraySkippedDone.value as any[]).join("|"), logicalCallCount);

logicalCallCount = 0;
const callArraySelected = stagedCallArrayReturn();
const callArraySelectedFirst: any = callArraySelected.next();
console.log("call-array-selected-first", callArraySelectedFirst.done, callArraySelectedFirst.value, logicalCallCount);
const callArraySelectedSecond: any = callArraySelected.next(true);
console.log("call-array-selected-second", callArraySelectedSecond.done, callArraySelectedSecond.value, logicalCallCount);
const callArraySelectedDone: any = callArraySelected.next("array-after");
console.log("call-array-selected-done", callArraySelectedDone.done, (callArraySelectedDone.value as any[]).join("|"), logicalCallCount);

logicalCallCount = 0;
const callLeftArray = stagedCallLeftArrayReturn();
const callLeftArrayFirst: any = callLeftArray.next();
console.log("call-left-array-first", callLeftArrayFirst.done, callLeftArrayFirst.value, logicalCallCount);
const callLeftArraySecond: any = callLeftArray.next("array-right");
console.log("call-left-array-second", callLeftArraySecond.done, callLeftArraySecond.value, logicalCallCount);
const callLeftArrayDone: any = callLeftArray.next("array-after");
console.log("call-left-array-done", callLeftArrayDone.done, (callLeftArrayDone.value as any[]).join("|"), logicalCallCount);

logicalNewCount = 0;
const newSkipped = stagedNewOperandReturn();
const newSkippedFirst: any = newSkipped.next();
logicalNewCount = 0;
console.log("new-skipped-first", newSkippedFirst.done, newSkippedFirst.value.value, logicalNewCount);
const newSkippedDone: any = newSkipped.next(null);
console.log("new-skipped-done", newSkippedDone.done, newSkippedDone.value, logicalNewCount);

logicalNewCount = 0;
const newSelected = stagedNewOperandReturn();
const newSelectedFirst: any = newSelected.next();
logicalNewCount = 0;
console.log("new-selected-first", newSelectedFirst.done, newSelectedFirst.value.value, logicalNewCount);
const newSelectedDone: any = newSelected.next(true);
console.log("new-selected-done", newSelectedDone.done, newSelectedDone.value.value, logicalNewCount);

logicalPropertyCount = 0;
const propertySkipped = stagedPropertyOperandReturn();
const propertySkippedFirst: any = propertySkipped.next();
console.log("property-skipped-first", propertySkippedFirst.done, propertySkippedFirst.value, logicalPropertyCount);
const propertySkippedDone: any = propertySkipped.next(false);
console.log("property-skipped-done", propertySkippedDone.done, propertySkippedDone.value, logicalPropertyCount);

logicalPropertyCount = 0;
const propertySelected = stagedPropertyOperandReturn();
const propertySelectedFirst: any = propertySelected.next();
console.log("property-selected-first", propertySelectedFirst.done, propertySelectedFirst.value, logicalPropertyCount);
const propertySelectedDone: any = propertySelected.next(true);
console.log("property-selected-done", propertySelectedDone.done, propertySelectedDone.value, logicalPropertyCount);

logicalElementKeyCount = 0;
const elementSkipped = stagedElementOperandReturn();
const elementSkippedFirst: any = elementSkipped.next();
console.log("element-skipped-first", elementSkippedFirst.done, elementSkippedFirst.value, logicalElementKeyCount);
const elementSkippedDone: any = elementSkipped.next(false);
console.log("element-skipped-done", elementSkippedDone.done, elementSkippedDone.value, logicalElementKeyCount);

logicalElementKeyCount = 0;
const elementSelected = stagedElementOperandReturn();
const elementSelectedFirst: any = elementSelected.next();
console.log("element-selected-first", elementSelectedFirst.done, elementSelectedFirst.value, logicalElementKeyCount);
const elementSelectedDone: any = elementSelected.next(true);
console.log("element-selected-done", elementSelectedDone.done, elementSelectedDone.value, logicalElementKeyCount);

logicalDeleteBox = { value: "delete-value" };
const deleteSkipped = stagedDeleteOperandReturn();
const deleteSkippedFirst: any = deleteSkipped.next();
console.log("delete-skipped-first", deleteSkippedFirst.done, deleteSkippedFirst.value, "value" in logicalDeleteBox);
const deleteSkippedDone: any = deleteSkipped.next(false);
console.log("delete-skipped-done", deleteSkippedDone.done, deleteSkippedDone.value, "value" in logicalDeleteBox);

logicalDeleteBox = { value: "delete-value" };
const deleteSelected = stagedDeleteOperandReturn();
const deleteSelectedFirst: any = deleteSelected.next();
console.log("delete-selected-first", deleteSelectedFirst.done, deleteSelectedFirst.value, "value" in logicalDeleteBox);
const deleteSelectedDone: any = deleteSelected.next(true);
console.log("delete-selected-done", deleteSelectedDone.done, deleteSelectedDone.value, "value" in logicalDeleteBox);

logicalAssignmentValue = "assignment-initial";
const assignmentSkipped = stagedAssignmentOperandReturn();
const assignmentSkippedFirst: any = assignmentSkipped.next();
console.log("assignment-skipped-first", assignmentSkippedFirst.done, assignmentSkippedFirst.value, logicalAssignmentValue);
const assignmentSkippedDone: any = assignmentSkipped.next(false);
console.log("assignment-skipped-done", assignmentSkippedDone.done, assignmentSkippedDone.value, logicalAssignmentValue);

logicalAssignmentValue = "assignment-initial";
const assignmentSelected = stagedAssignmentOperandReturn();
const assignmentSelectedFirst: any = assignmentSelected.next();
console.log("assignment-selected-first", assignmentSelectedFirst.done, assignmentSelectedFirst.value, logicalAssignmentValue);
const assignmentSelectedDone: any = assignmentSelected.next(true);
console.log("assignment-selected-done", assignmentSelectedDone.done, assignmentSelectedDone.value, logicalAssignmentValue);

logicalConditionalCount = 0;
const conditionalSkipped = stagedConditionalOperandReturn();
const conditionalSkippedFirst: any = conditionalSkipped.next();
console.log("conditional-skipped-first", conditionalSkippedFirst.done, conditionalSkippedFirst.value, logicalConditionalCount);
const conditionalSkippedDone: any = conditionalSkipped.next(false);
console.log("conditional-skipped-done", conditionalSkippedDone.done, conditionalSkippedDone.value, logicalConditionalCount);

logicalConditionalCount = 0;
const conditionalSelected = stagedConditionalOperandReturn();
const conditionalSelectedFirst: any = conditionalSelected.next();
console.log("conditional-selected-first", conditionalSelectedFirst.done, conditionalSelectedFirst.value, logicalConditionalCount);
const conditionalSelectedDone: any = conditionalSelected.next(true);
console.log("conditional-selected-done", conditionalSelectedDone.done, conditionalSelectedDone.value, logicalConditionalCount);

logicalTemplateCount = 0;
const templateSkipped = stagedTemplateOperandReturn();
const templateSkippedFirst: any = templateSkipped.next();
console.log("template-skipped-first", templateSkippedFirst.done, templateSkippedFirst.value, logicalTemplateCount);
const templateSkippedDone: any = templateSkipped.next(false);
console.log("template-skipped-done", templateSkippedDone.done, templateSkippedDone.value, logicalTemplateCount);

logicalTemplateCount = 0;
const templateSelected = stagedTemplateOperandReturn();
const templateSelectedFirst: any = templateSelected.next();
console.log("template-selected-first", templateSelectedFirst.done, templateSelectedFirst.value, logicalTemplateCount);
const templateSelectedDone: any = templateSelected.next(true);
console.log("template-selected-done", templateSelectedDone.done, templateSelectedDone.value, logicalTemplateCount);

logicalTaggedTemplateCount = 0;
const taggedTemplateSkipped = stagedTaggedTemplateOperandReturn();
const taggedTemplateSkippedFirst: any = taggedTemplateSkipped.next();
console.log("tagged-template-skipped-first", taggedTemplateSkippedFirst.done, taggedTemplateSkippedFirst.value, logicalTaggedTemplateCount);
const taggedTemplateSkippedDone: any = taggedTemplateSkipped.next(false);
console.log("tagged-template-skipped-done", taggedTemplateSkippedDone.done, taggedTemplateSkippedDone.value, logicalTaggedTemplateCount);

logicalTaggedTemplateCount = 0;
const taggedTemplateSelected = stagedTaggedTemplateOperandReturn();
const taggedTemplateSelectedFirst: any = taggedTemplateSelected.next();
console.log("tagged-template-selected-first", taggedTemplateSelectedFirst.done, taggedTemplateSelectedFirst.value, logicalTaggedTemplateCount);
const taggedTemplateSelectedDone: any = taggedTemplateSelected.next(true);
console.log("tagged-template-selected-done", taggedTemplateSelectedDone.done, taggedTemplateSelectedDone.value, logicalTaggedTemplateCount);

logicalPostfixValue = 10;
const postfixSkipped = stagedPostfixOperandReturn();
const postfixSkippedFirst: any = postfixSkipped.next();
console.log("postfix-skipped-first", postfixSkippedFirst.done, postfixSkippedFirst.value, logicalPostfixValue);
const postfixSkippedDone: any = postfixSkipped.next(false);
console.log("postfix-skipped-done", postfixSkippedDone.done, postfixSkippedDone.value, logicalPostfixValue);

logicalPostfixValue = 10;
const postfixSelected = stagedPostfixOperandReturn();
const postfixSelectedFirst: any = postfixSelected.next();
console.log("postfix-selected-first", postfixSelectedFirst.done, postfixSelectedFirst.value, logicalPostfixValue);
const postfixSelectedDone: any = postfixSelected.next(true);
console.log("postfix-selected-done", postfixSelectedDone.done, postfixSelectedDone.value, logicalPostfixValue);

logicalPrefixValue = 20;
const prefixSkipped = stagedPrefixOperandReturn();
const prefixSkippedFirst: any = prefixSkipped.next();
console.log("prefix-skipped-first", prefixSkippedFirst.done, prefixSkippedFirst.value, logicalPrefixValue);
const prefixSkippedDone: any = prefixSkipped.next(false);
console.log("prefix-skipped-done", prefixSkippedDone.done, prefixSkippedDone.value, logicalPrefixValue);

logicalPrefixValue = 20;
const prefixSelected = stagedPrefixOperandReturn();
const prefixSelectedFirst: any = prefixSelected.next();
console.log("prefix-selected-first", prefixSelectedFirst.done, prefixSelectedFirst.value, logicalPrefixValue);
const prefixSelectedDone: any = prefixSelected.next(true);
console.log("prefix-selected-done", prefixSelectedDone.done, prefixSelectedDone.value, logicalPrefixValue);
