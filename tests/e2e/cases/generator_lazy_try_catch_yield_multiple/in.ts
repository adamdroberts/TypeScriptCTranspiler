const events: string[] = [];

function* multi(): Generator<string, string, string> {
    try {
        yield "pause";
    } catch (error: any) {
        events.push("catch:" + error);
        yield "recovery-one";
        events.push("between");
        yield "recovery-two";
        events.push("after");
        return "done";
    } finally {
        events.push("finally");
    }
    return "normal";
}

const iter = multi();
const first: any = iter.next();
const recoveryOne: any = iter.throw("boom");
const recoveryTwo: any = iter.next("one");
const done: any = iter.next("two");
console.log("multi:", first.done, first.value, recoveryOne.done, recoveryOne.value, recoveryTwo.done, recoveryTwo.value, done.done, done.value, events.join("|"));
