const events: string[] = [];

function* inner(): Generator<string, string, string> {
    events.push("inner-start");
    const first = yield "one";
    events.push("inner-resume:" + first);
    const second = yield "two";
    events.push("inner-resume:" + second);
    return "inner-done";
}

function* outer(): Generator<string, string, string> {
    events.push("outer-start");
    yield* inner();
    events.push("outer-after");
    return "outer-done";
}

function* closableInner(): Generator<string, string, string> {
    try {
        events.push("closable-inner-start");
        yield "close-me";
    } finally {
        events.push("closable-inner-finally");
    }
    return "closable-inner-done";
}

function* closableOuter(): Generator<string, string, string> {
    yield* closableInner();
    events.push("closable-outer-after");
    return "closable-outer-done";
}

function* throwingInner(): Generator<string, string, string> {
    try {
        events.push("throwing-inner-start");
        yield "throw-me";
    } finally {
        events.push("throwing-inner-finally");
    }
    return "throwing-inner-done";
}

function* throwingOuter(): Generator<string, string, string> {
    yield* throwingInner();
    return "throwing-outer-done";
}

const iter = outer();
console.log("created", events.join("|"));
const first: any = iter.next("ignored");
console.log("first", first.done, first.value, events.join("|"));
const second: any = iter.next("alpha");
console.log("second", second.done, second.value, events.join("|"));
const third: any = iter.next("beta");
console.log("third", third.done, third.value, events.join("|"));
const closable = closableOuter();
const closeFirst: any = closable.next();
const closeResult: any = closable.return("closed");
console.log("close", closeFirst.done, closeFirst.value, closeResult.done, closeResult.value, events.join("|"));
const throwing = throwingOuter();
const throwFirst: any = throwing.next();
try {
    throwing.throw("boom");
} catch {
    console.log("throw", throwFirst.done, throwFirst.value, events.join("|"));
}
