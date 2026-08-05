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
