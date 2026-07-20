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
    try {
        yield* closableInner();
        events.push("closable-outer-after");
    } finally {
        events.push("closable-outer-finally");
    }
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
    try {
        yield* throwingInner();
    } finally {
        events.push("throwing-outer-finally");
    }
    return "throwing-outer-done";
}

function* recoveringInner(): Generator<string, string, string> {
    try {
        events.push("recovering-inner-start");
        yield "recover-me";
    } catch (error: any) {
        events.push("recovering-inner-catch:" + error);
        return "recovering-inner-done";
    } finally {
        events.push("recovering-inner-finally");
    }
    return "recovering-inner-normal";
}

function* recoveringOuter(): Generator<string, string, string> {
    const delegated = yield* recoveringInner();
    events.push("recovering-outer-after:" + delegated);
    return "recovering-outer-done";
}

function convertRecoveringSource(iter: Generator<string, string, string>): Generator<any, string, string> {
    return iter;
}

function* recoveringConvertedOuter(): Generator<string, string, string> {
    const delegated = yield* convertRecoveringSource(recoveringInner());
    events.push("recovering-converted-outer-after:" + delegated);
    return "recovering-converted-outer-done";
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
const recovering = recoveringOuter();
const recoveringFirst: any = recovering.next();
const recoveringResult: any = recovering.throw("recover-error");
console.log("recover", recoveringFirst.done, recoveringFirst.value, recoveringResult.done, recoveringResult.value, events.join("|"));
const recoveringConverted = recoveringConvertedOuter();
const recoveringConvertedFirst: any = recoveringConverted.next();
const recoveringConvertedResult: any = recoveringConverted.throw("converted-recover-error");
console.log("recover-converted", recoveringConvertedFirst.done, recoveringConvertedFirst.value, recoveringConvertedResult.done, recoveringConvertedResult.value, events.join("|"));
