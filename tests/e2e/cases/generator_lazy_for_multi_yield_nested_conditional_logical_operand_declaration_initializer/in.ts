function* nestedConditionalLogicalOperand(): Generator<string, string, any> {
    for (
        let value: any = (yield "left") && ((yield "selector") ? (yield "true-arm") : (yield "false-arm")),
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function* nestedConditionalLogicalOrOperand(): Generator<string, string, any> {
    for (
        let value: any = (yield "or-left") || ((yield "or-selector") ? (yield "or-true-arm") : (yield "or-false-arm")),
        count = 0;
        count < 1;
        count++
    ) {
        yield "or-body-" + String(value);
    }
    return "or-done";
}

let sideEffectingCallCount = 0;
function sideEffectingConditionalCall(value: any): string {
    sideEffectingCallCount++;
    return "call-" + String(value);
}

function* nestedConditionalLogicalSideEffectingOperand(): Generator<string, string, any> {
    for (
        let value: any = (yield "side-left") && ((yield "side-selector")
            ? ((yield "side-arm-left") && sideEffectingConditionalCall(yield "side-call-arg"))
            : sideEffectingConditionalCall(yield "side-false-call")),
        count = 0;
        count < 1;
        count++
    ) {
        yield "side-body-" + String(value);
    }
    return "side-done";
}

function* nestedConditionalLogicalNestedOperand(): Generator<string, string, any> {
    for (
        let value: any = (yield "deep-left") && ((yield "deep-selector")
            ? ((yield "deep-arm-left") && ((yield "deep-inner-selector")
                ? sideEffectingConditionalCall(yield "deep-call-arg")
                : sideEffectingConditionalCall(yield "deep-fallback-arg")))
            : "deep-fallback"),
        count = 0;
        count < 1;
        count++
    ) {
        yield "deep-body-" + String(value);
    }
    return "deep-done";
}

const iterator = nestedConditionalLogicalOperand();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(false);
console.log("second", second.done, second.value);
const third: any = iterator.next(true);
console.log("third", third.done, third.value);
const fourth: any = iterator.next("unused");
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next();
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next();
console.log("sixth", sixth.done, sixth.value);

const selectedIterator = nestedConditionalLogicalOperand();
const selectedFirst: any = selectedIterator.next();
console.log("selected-first", selectedFirst.done, selectedFirst.value);
const selectedSecond: any = selectedIterator.next(true);
console.log("selected-second", selectedSecond.done, selectedSecond.value);
const selectedThird: any = selectedIterator.next(true);
console.log("selected-third", selectedThird.done, selectedThird.value);
const selectedFourth: any = selectedIterator.next("and-value");
console.log("selected-fourth", selectedFourth.done, selectedFourth.value);
const selectedFifth: any = selectedIterator.next();
console.log("selected-fifth", selectedFifth.done, selectedFifth.value);

const orIterator: any = nestedConditionalLogicalOrOperand();
const orFirst: any = orIterator.next();
console.log("or-first", orFirst.done, orFirst.value);
const orSecond: any = orIterator.next(false);
console.log("or-second", orSecond.done, orSecond.value);
const orThird: any = orIterator.next(false);
console.log("or-third", orThird.done, orThird.value);
const orFourth: any = orIterator.next("or-false-value");
console.log("or-fourth", orFourth.done, orFourth.value);
const orFifth: any = orIterator.next();
console.log("or-fifth", orFifth.done, orFifth.value);
const orSixth: any = orIterator.next();
console.log("or-sixth", orSixth.done, orSixth.value);

const sideSkippedIterator = nestedConditionalLogicalSideEffectingOperand();
const sideSkippedFirst: any = sideSkippedIterator.next();
console.log("side-skipped-first", sideSkippedFirst.done, sideSkippedFirst.value, sideEffectingCallCount);
const sideSkippedSecond: any = sideSkippedIterator.next(false);
console.log("side-skipped-second", sideSkippedSecond.done, sideSkippedSecond.value, sideEffectingCallCount);
const sideSkippedDone: any = sideSkippedIterator.next();
console.log("side-skipped-done", sideSkippedDone.done, sideSkippedDone.value, sideEffectingCallCount);

const sideSelectedIterator = nestedConditionalLogicalSideEffectingOperand();
const sideSelectedFirst: any = sideSelectedIterator.next();
console.log("side-selected-first", sideSelectedFirst.done, sideSelectedFirst.value, sideEffectingCallCount);
const sideSelectedSecond: any = sideSelectedIterator.next(true);
console.log("side-selected-second", sideSelectedSecond.done, sideSelectedSecond.value, sideEffectingCallCount);
const sideSelectedThird: any = sideSelectedIterator.next(true);
console.log("side-selected-third", sideSelectedThird.done, sideSelectedThird.value, sideEffectingCallCount);
const sideSelectedFourth: any = sideSelectedIterator.next(true);
console.log("side-selected-fourth", sideSelectedFourth.done, sideSelectedFourth.value, sideEffectingCallCount);
const sideSelectedFifth: any = sideSelectedIterator.next("argument");
console.log("side-selected-fifth", sideSelectedFifth.done, sideSelectedFifth.value, sideEffectingCallCount);
const sideSelectedSixth: any = sideSelectedIterator.next();
console.log("side-selected-sixth", sideSelectedSixth.done, sideSelectedSixth.value, sideEffectingCallCount);
const sideSelectedDone: any = sideSelectedIterator.next();
console.log("side-selected-done", sideSelectedDone.done, sideSelectedDone.value, sideEffectingCallCount);

sideEffectingCallCount = 0;
const deepSkippedIterator = nestedConditionalLogicalNestedOperand();
const deepSkippedFirst: any = deepSkippedIterator.next();
console.log("deep-skipped-first", deepSkippedFirst.done, deepSkippedFirst.value, sideEffectingCallCount);
const deepSkippedSecond: any = deepSkippedIterator.next(false);
console.log("deep-skipped-second", deepSkippedSecond.done, deepSkippedSecond.value, sideEffectingCallCount);
const deepSkippedDone: any = deepSkippedIterator.next();
console.log("deep-skipped-done", deepSkippedDone.done, deepSkippedDone.value, sideEffectingCallCount);

const deepSelectedIterator = nestedConditionalLogicalNestedOperand();
const deepSelectedFirst: any = deepSelectedIterator.next();
console.log("deep-selected-first", deepSelectedFirst.done, deepSelectedFirst.value, sideEffectingCallCount);
const deepSelectedSecond: any = deepSelectedIterator.next(true);
console.log("deep-selected-second", deepSelectedSecond.done, deepSelectedSecond.value, sideEffectingCallCount);
const deepSelectedThird: any = deepSelectedIterator.next(true);
console.log("deep-selected-third", deepSelectedThird.done, deepSelectedThird.value, sideEffectingCallCount);
const deepSelectedFourth: any = deepSelectedIterator.next(true);
console.log("deep-selected-fourth", deepSelectedFourth.done, deepSelectedFourth.value, sideEffectingCallCount);
const deepSelectedFifth: any = deepSelectedIterator.next(true);
console.log("deep-selected-fifth", deepSelectedFifth.done, deepSelectedFifth.value, sideEffectingCallCount);
const deepSelectedSixth: any = deepSelectedIterator.next("deep-value");
console.log("deep-selected-sixth", deepSelectedSixth.done, deepSelectedSixth.value, sideEffectingCallCount);
const deepSelectedDone: any = deepSelectedIterator.next();
console.log("deep-selected-done", deepSelectedDone.done, deepSelectedDone.value, sideEffectingCallCount);
