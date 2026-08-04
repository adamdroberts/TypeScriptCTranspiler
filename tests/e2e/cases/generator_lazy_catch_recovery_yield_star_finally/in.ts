function* caught(): Generator<any, string, any> {
    try {
        yield "source";
    } catch {
        yield* (["recovery-one", "recovery-two"] as any);
        return "caught";
    } finally {
        yield "cleanup-one";
        yield "cleanup-two";
    }
    return "normal";
}

const normal = caught();
const normalFirst: any = normal.next();
const normalCleanupOne: any = normal.next("source-resume");
const normalCleanupTwo: any = normal.next("cleanup-one-resume");
const normalDone: any = normal.next("cleanup-two-resume");
console.log("normal", normalFirst.done, normalFirst.value, normalCleanupOne.done, normalCleanupOne.value, normalCleanupTwo.done, normalCleanupTwo.value, normalDone.done, normalDone.value);

const thrown = caught();
const thrownFirst: any = thrown.next();
const thrownRecoveryOne: any = thrown.throw("source-throw");
const thrownRecoveryTwo: any = thrown.next("one-resume");
const thrownCleanupOne: any = thrown.next("two-resume");
const thrownCleanupTwo: any = thrown.next("cleanup-one-resume");
const thrownDone: any = thrown.next("cleanup-two-resume");
console.log("throw", thrownFirst.done, thrownFirst.value, thrownRecoveryOne.done, thrownRecoveryOne.value, thrownRecoveryTwo.done, thrownRecoveryTwo.value, thrownCleanupOne.done, thrownCleanupOne.value, thrownCleanupTwo.done, thrownCleanupTwo.value, thrownDone.done, thrownDone.value);

const closed = caught();
const closedFirst: any = closed.next();
const closedRecovery: any = closed.throw("source-throw");
const closedCleanupOne: any = closed.return("closed");
const closedCleanupTwo: any = closed.next("cleanup-one-resume");
const closedDone: any = closed.next("cleanup-two-resume");
console.log("close", closedFirst.done, closedFirst.value, closedRecovery.done, closedRecovery.value, closedCleanupOne.done, closedCleanupOne.value, closedCleanupTwo.done, closedCleanupTwo.value, closedDone.done, closedDone.value);

function* caughtDelegatedFinalizer(): Generator<any, string, any> {
    try {
        yield "delegated-source";
    } catch {
        yield* (["delegated-recovery-one", "delegated-recovery-two"] as any);
        return "delegated-caught";
    } finally {
        yield* (["delegated-cleanup-one", "delegated-cleanup-two"] as any);
    }
    return "delegated-normal";
}

const delegatedNormal = caughtDelegatedFinalizer();
const delegatedNormalFirst: any = delegatedNormal.next();
const delegatedNormalCleanupOne: any = delegatedNormal.next("source-resume");
const delegatedNormalCleanupTwo: any = delegatedNormal.next("cleanup-one-resume");
const delegatedNormalDone: any = delegatedNormal.next("cleanup-two-resume");
console.log("delegated-normal", delegatedNormalFirst.done, delegatedNormalFirst.value, delegatedNormalCleanupOne.done, delegatedNormalCleanupOne.value, delegatedNormalCleanupTwo.done, delegatedNormalCleanupTwo.value, delegatedNormalDone.done, delegatedNormalDone.value);

const delegatedThrow = caughtDelegatedFinalizer();
const delegatedThrowFirst: any = delegatedThrow.next();
const delegatedThrowRecoveryOne: any = delegatedThrow.throw("source-throw");
const delegatedThrowRecoveryTwo: any = delegatedThrow.next("one-resume");
const delegatedThrowCleanupOne: any = delegatedThrow.next("two-resume");
const delegatedThrowCleanupTwo: any = delegatedThrow.next("cleanup-one-resume");
const delegatedThrowDone: any = delegatedThrow.next("cleanup-two-resume");
console.log("delegated-throw", delegatedThrowFirst.done, delegatedThrowFirst.value, delegatedThrowRecoveryOne.done, delegatedThrowRecoveryOne.value, delegatedThrowRecoveryTwo.done, delegatedThrowRecoveryTwo.value, delegatedThrowCleanupOne.done, delegatedThrowCleanupOne.value, delegatedThrowCleanupTwo.done, delegatedThrowCleanupTwo.value, delegatedThrowDone.done, delegatedThrowDone.value);

const delegatedClosed = caughtDelegatedFinalizer();
const delegatedClosedFirst: any = delegatedClosed.next();
const delegatedClosedRecovery: any = delegatedClosed.throw("source-throw");
const delegatedClosedCleanupOne: any = delegatedClosed.return("closed");
const delegatedClosedCleanupTwo: any = delegatedClosed.next("cleanup-one-resume");
const delegatedClosedDone: any = delegatedClosed.next("cleanup-two-resume");
console.log("delegated-close", delegatedClosedFirst.done, delegatedClosedFirst.value, delegatedClosedRecovery.done, delegatedClosedRecovery.value, delegatedClosedCleanupOne.done, delegatedClosedCleanupOne.value, delegatedClosedCleanupTwo.done, delegatedClosedCleanupTwo.value, delegatedClosedDone.done, delegatedClosedDone.value);
