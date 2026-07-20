const events: string[] = [];

function* flow(): Generator<string, string, string> {
    events.push("start");
    try {
        events.push("try-before");
        const value = yield "pause";
        events.push("resumed:" + value);
    } finally {
        events.push("finally");
    }
    return "done";
}

const iter = flow();
const first: any = iter.next("ignored");
const done: any = iter.next("answer");
const after: any = iter.next("after");

console.log("steps:", first.done, first.value, done.done, done.value, after.done, after.value);
console.log("events:", events.join("|"));

function* terminalReturn(): Generator<string, string, string> {
    try {
        yield "return-pause";
        return "returned";
    } finally {
        events.push("return-finally");
    }
}

const returned = terminalReturn();
const returnFirst: any = returned.next();
const returnDone: any = returned.next("resume");
console.log("return:", returnFirst.done, returnFirst.value, returnDone.done, returnDone.value, events.join("|"));

function* terminalThrow(): Generator<string, string, string> {
    try {
        yield "throw-pause";
        throw "source-boom";
    } finally {
        events.push("throw-finally");
    }
}

const thrown = terminalThrow();
const throwFirst: any = thrown.next();
try {
    thrown.next("resume");
} catch {
    console.log("throw:", throwFirst.done, throwFirst.value, events.join("|"));
}

function* caughtThrow(): Generator<string, string, string> {
    try {
        yield "catch-pause";
    } catch {
        return "caught";
    }
    return "normal";
}

const caught = caughtThrow();
const caughtFirst: any = caught.next();
const caughtDone: any = caught.throw("handled");
console.log("caught:", caughtFirst.done, caughtFirst.value, caughtDone.done, caughtDone.value);

function* caughtBoundThrow(): Generator<string, string, string> {
    try {
        yield "bound-catch-pause";
    } catch (error) {
        return "bound-caught";
    }
    return "normal";
}

const caughtBound = caughtBoundThrow();
const caughtBoundFirst: any = caughtBound.next();
const caughtBoundDone: any = caughtBound.throw("handled-bound");
console.log("caught-bound:", caughtBoundFirst.done, caughtBoundFirst.value, caughtBoundDone.done, caughtBoundDone.value);

function* caughtUsedBoundThrow(): Generator<string, string, string> {
    try {
        yield "used-catch-pause";
    } catch (error: any) {
        return error;
    }
    return "normal";
}

const caughtUsedBound = caughtUsedBoundThrow();
const caughtUsedBoundFirst: any = caughtUsedBound.next();
const caughtUsedBoundDone: any = caughtUsedBound.throw("handled-used-bound");
console.log("caught-used-bound:", caughtUsedBoundFirst.done, caughtUsedBoundFirst.value, caughtUsedBoundDone.done, caughtUsedBoundDone.value);
