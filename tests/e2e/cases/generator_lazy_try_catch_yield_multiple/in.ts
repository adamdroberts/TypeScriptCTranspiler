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

function* terminalThrowExpression(): Generator<string, number, string> {
    try {
        yield "throw-start";
    } catch (error) {
        throw (yield "throw-left") + (yield "throw-right");
    }
    return 0;
}

const throwIter = terminalThrowExpression();
const throwFirst: any = throwIter.next();
const throwSecond: any = throwIter.throw("terminal-throw");
const throwThird: any = throwIter.next("left");
let throwValue: any;
try {
    throwIter.next("right");
} catch (error: any) {
    throwValue = error;
}
console.log("terminal-throw-expression:", throwFirst.done, throwFirst.value, throwSecond.done, throwSecond.value, throwThird.done, throwThird.value, throwValue);
