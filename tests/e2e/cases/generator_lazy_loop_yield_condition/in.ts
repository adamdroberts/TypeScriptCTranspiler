let events: string[] = [];

function* whileCondition(): Generator<string, string, any> {
    events.push("while-start");
    let count = 0;
    while (yield "while-condition") {
        events.push("while-body:" + count);
        if (count === 0) {
            count++;
            yield "while-body-yield";
            continue;
        }
    }
    events.push("while-done");
    return "while-result";
}

function* doCondition(): Generator<string, string, any> {
    let count = 0;
    do {
        events.push("do-body:" + count);
        count++;
        if (count === 1) {
            yield "do-body-yield";
            continue;
        }
    } while (yield "do-condition");
    events.push("do-done");
    return "do-result";
}

function* forCondition(): Generator<string, string, any> {
    for (let i = 0; yield "for-condition"; i++) {
        events.push("for-body:" + i);
        if (i === 0) {
            yield "for-body-yield";
            continue;
        }
    }
    events.push("for-done");
    return "for-result";
}

function* closeCondition(): Generator<string, string, any> {
    try {
        while (yield "close-condition") {
            events.push("close-body");
        }
    } finally {
        events.push("close-finally");
    }
    return "close-result";
}

events = [];
const whileIter = whileCondition();
let step: any = whileIter.next();
console.log("while", step.done, step.value, events.join("|"));
step = whileIter.next(true);
console.log("while", step.done, step.value, events.join("|"));
step = whileIter.next("resume");
console.log("while", step.done, step.value, events.join("|"));
step = whileIter.next(true);
console.log("while", step.done, step.value, events.join("|"));
step = whileIter.next(false);
console.log("while", step.done, step.value, events.join("|"));

events = [];
const doIter = doCondition();
step = doIter.next();
console.log("do", step.done, step.value, events.join("|"));
step = doIter.next("resume");
console.log("do", step.done, step.value, events.join("|"));
step = doIter.next(true);
console.log("do", step.done, step.value, events.join("|"));
step = doIter.next(false);
console.log("do", step.done, step.value, events.join("|"));

events = [];
const forIter = forCondition();
step = forIter.next();
console.log("for", step.done, step.value, events.length ? events.join("|") : "none");
step = forIter.next(true);
console.log("for", step.done, step.value, events.length ? events.join("|") : "none");
step = forIter.next("resume");
console.log("for", step.done, step.value, events.length ? events.join("|") : "none");
step = forIter.next(true);
console.log("for", step.done, step.value, events.length ? events.join("|") : "none");
step = forIter.next(false);
console.log("for", step.done, step.value, events.length ? events.join("|") : "none");

events = [];
const closeIter = closeCondition();
const closeFirst: any = closeIter.next();
const closeResult: any = closeIter.return("closed");
console.log("close", closeFirst.done, closeFirst.value, closeResult.done, closeResult.value, events.join("|"));
