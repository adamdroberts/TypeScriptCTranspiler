const events: string[] = [];

function* handled(): Generator<string, string, string> {
    try {
        events.push("handled-try");
        yield "handled-pause";
    } catch (error: any) {
        events.push("handled-catch");
        yield "handled-recovery:" + error;
        events.push("handled-after-yield");
        return "handled-done";
    } finally {
        events.push("handled-finally");
    }
    return "handled-normal";
}

const handledIter = handled();
const handledFirst: any = handledIter.next();
const handledRecovery: any = handledIter.throw("boom");
const handledDone: any = handledIter.next("resume");
console.log("handled:", handledFirst.done, handledFirst.value, handledRecovery.done, handledRecovery.value, handledDone.done, handledDone.value, events.join("|"));

function* normal(): Generator<string, string, string> {
    try {
        events.push("normal-try");
        yield "normal-pause";
    } catch {
        yield "unexpected-recovery";
        return "unexpected";
    } finally {
        events.push("normal-finally");
    }
    return "normal-done";
}

const normalIter = normal();
const normalFirst: any = normalIter.next();
const normalDone: any = normalIter.next("answer");
console.log("normal:", normalFirst.done, normalFirst.value, normalDone.done, normalDone.value, events.join("|"));
