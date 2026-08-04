const events: string[] = [];

function* recoveryDelegate(): Generator<string, string, string> {
    try {
        events.push("delegate-start");
        yield "delegate-one";
        yield "delegate-two";
        return "delegate-normal";
    } catch (error: any) {
        events.push("delegate-catch:" + error);
        return "delegate-recovered";
    } finally {
        events.push("delegate-finally");
    }
}

function* caught(): Generator<any, string, any> {
    try {
        yield "source";
    } catch {
        yield* recoveryDelegate();
        return "outer-done";
    }
    return "outer-normal";
}

const delegatedNormal = caught();
const delegatedNormalFirst: any = delegatedNormal.next();
const delegatedNormalRecovery: any = delegatedNormal.throw("source-throw");
const delegatedNormalSecond: any = delegatedNormal.next("delegate-one-resume");
const delegatedNormalDone: any = delegatedNormal.next("delegate-two-resume");
console.log("normal", delegatedNormalFirst.done, delegatedNormalFirst.value, delegatedNormalRecovery.done, delegatedNormalRecovery.value, delegatedNormalSecond.done, delegatedNormalSecond.value, delegatedNormalDone.done, delegatedNormalDone.value, events.join("|"));

const delegatedThrow = caught();
const delegatedThrowFirst: any = delegatedThrow.next();
const delegatedThrowRecovery: any = delegatedThrow.throw("source-throw");
const delegatedThrowDone: any = delegatedThrow.throw("delegated-throw");
console.log("throw", delegatedThrowFirst.done, delegatedThrowFirst.value, delegatedThrowRecovery.done, delegatedThrowRecovery.value, delegatedThrowDone.done, delegatedThrowDone.value, events.join("|"));

const delegatedClose = caught();
const delegatedCloseFirst: any = delegatedClose.next();
const delegatedCloseRecovery: any = delegatedClose.throw("source-throw");
const delegatedCloseDone: any = delegatedClose.return("closed");
console.log("close", delegatedCloseFirst.done, delegatedCloseFirst.value, delegatedCloseRecovery.done, delegatedCloseRecovery.value, delegatedCloseDone.done, delegatedCloseDone.value, events.join("|"));
