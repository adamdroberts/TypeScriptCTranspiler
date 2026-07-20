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
