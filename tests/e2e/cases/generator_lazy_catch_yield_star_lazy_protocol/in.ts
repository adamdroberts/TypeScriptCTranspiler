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

function* sourceThrowDelegate(): Generator<string, string, string> {
    try {
        events.push("source-throw-start");
        yield "source-throw-one";
        throw "source-terminal";
    } catch (error: any) {
        events.push("source-throw-catch:" + error);
        yield "source-throw-recovery-one";
        yield "source-throw-recovery-two";
        return "source-throw-recovered";
    } finally {
        events.push("source-throw-finally");
    }
}

function* caughtSourceThrow(): Generator<any, string, any> {
    try {
        yield "source-throw-outer";
    } catch {
        yield* sourceThrowDelegate();
        return "source-throw-outer-done";
    }
    return "source-throw-outer-normal";
}

const sourceThrow = caughtSourceThrow();
const sourceThrowFirst: any = sourceThrow.next();
const sourceThrowRecovery: any = sourceThrow.throw("outer-source-throw");
const sourceThrowCatchFirst: any = sourceThrow.next("source-throw-resume");
const sourceThrowCatchSecond: any = sourceThrow.next("source-throw-recovery-one-resume");
const sourceThrowDone: any = sourceThrow.next("source-throw-recovery-two-resume");
console.log("source-throw", sourceThrowFirst.done, sourceThrowFirst.value, sourceThrowRecovery.done, sourceThrowRecovery.value, sourceThrowCatchFirst.done, sourceThrowCatchFirst.value, sourceThrowCatchSecond.done, sourceThrowCatchSecond.value, sourceThrowDone.done, sourceThrowDone.value, events.join("|"));

const sourceThrowClose = caughtSourceThrow();
const sourceThrowCloseFirst: any = sourceThrowClose.next();
const sourceThrowCloseRecovery: any = sourceThrowClose.throw("outer-source-throw");
const sourceThrowCloseCatch: any = sourceThrowClose.next("source-throw-resume");
const sourceThrowCloseDone: any = sourceThrowClose.return("source-throw-closed");
console.log("source-throw-close", sourceThrowCloseFirst.done, sourceThrowCloseFirst.value, sourceThrowCloseRecovery.done, sourceThrowCloseRecovery.value, sourceThrowCloseCatch.done, sourceThrowCloseCatch.value, sourceThrowCloseDone.done, sourceThrowCloseDone.value, events.join("|"));

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
