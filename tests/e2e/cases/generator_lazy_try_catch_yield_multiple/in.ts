const events: string[] = [];

function* multi(): Generator<string, string, string> {
    try {
        yield "pause";
    } catch (error: any) {
        events.push("catch:" + error);
        yield "recovery-one";
        events.push("between");
        yield "recovery-two:" + error;
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

function* terminalExpression(): Generator<number, number, number> {
    try {
        yield 1;
    } catch (error) {
        return (yield 2) + (yield 3);
    }
    return 0;
}

const expressionIter = terminalExpression();
const expressionFirst: any = expressionIter.next();
const expressionSecond: any = expressionIter.throw("terminal");
const expressionThird: any = expressionIter.next(4);
const expressionDone: any = expressionIter.next(5);
console.log("terminal-expression:", expressionFirst.done, expressionFirst.value, expressionSecond.done, expressionSecond.value, expressionThird.done, expressionThird.value, expressionDone.done, expressionDone.value);
