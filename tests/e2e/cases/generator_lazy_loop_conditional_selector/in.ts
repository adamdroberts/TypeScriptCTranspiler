let events: string[] = [];

function mark(label: string, value: boolean): boolean {
    events.push(label);
    return value;
}

function* whileConditional(): Generator<string, string, any> {
    let count = 0;
    while ((yield "while-condition") ? mark("while-then", count === 0) : mark("while-else", false)) {
        count++;
        yield "while-body-" + count;
    }
    return "while-" + count;
}

function* doConditional(): Generator<string, string, any> {
    let count = 0;
    do {
        count++;
        yield "do-body-" + count;
    } while (((yield "do-left") && (yield "do-right")) ? count < 2 : false);
    return "do-" + count;
}

function* forConditional(): Generator<string, string, any> {
    let count = 0;
    for (; ((yield "for-left") || (yield "for-right")) ? count < 1 : false; count++) {
        yield "for-body-" + count;
    }
    return "for-" + count;
}

events = [];
const whileIterator = whileConditional();
const whileFirst: any = whileIterator.next();
console.log("while", whileFirst.done, whileFirst.value, events.join("|"));
const whileBody: any = whileIterator.next(1);
console.log("while", whileBody.done, whileBody.value, events.join("|"));
const whileConditionAgain: any = whileIterator.next("body");
console.log("while", whileConditionAgain.done, whileConditionAgain.value, events.join("|"));
const whileDone: any = whileIterator.next(0);
console.log("while", whileDone.done, whileDone.value, events.join("|"));

const doIterator = doConditional();
const doBodyOne: any = doIterator.next();
const doLeftOne: any = doIterator.next("body");
const doRightOne: any = doIterator.next(1);
const doBodyTwo: any = doIterator.next(1);
const doLeftTwo: any = doIterator.next("body");
const doDone: any = doIterator.next(0);
console.log(
    "do",
    doBodyOne.done,
    doBodyOne.value,
    doLeftOne.done,
    doLeftOne.value,
    doRightOne.done,
    doRightOne.value,
    doBodyTwo.done,
    doBodyTwo.value,
    doLeftTwo.done,
    doLeftTwo.value,
    doDone.done,
    doDone.value,
);

const forIterator = forConditional();
const forLeftOne: any = forIterator.next();
const forRightOne: any = forIterator.next(0);
const forBody: any = forIterator.next(1);
const forLeftTwo: any = forIterator.next("body");
const forRightTwo: any = forIterator.next(0);
const forDone: any = forIterator.next(0);
console.log(
    "for",
    forLeftOne.done,
    forLeftOne.value,
    forRightOne.done,
    forRightOne.value,
    forBody.done,
    forBody.value,
    forLeftTwo.done,
    forLeftTwo.value,
    forRightTwo.done,
    forRightTwo.value,
    forDone.done,
    forDone.value,
);
