function* caughtThrow(): Generator<any, string, any> {
    try {
        yield "source";
    } catch {
        yield* (["recovery-one", "recovery-two"] as any);
        throw "caught-throw";
    } finally {
        yield "cleanup-one";
        yield "cleanup-two";
    }
    return "normal";
}

const normal = caughtThrow();
const normalFirst: any = normal.next();
const normalCleanupOne: any = normal.next("source-resume");
const normalCleanupTwo: any = normal.next("cleanup-one-resume");
const normalDone: any = normal.next("cleanup-two-resume");
console.log("normal", normalFirst.done, normalFirst.value, normalCleanupOne.done, normalCleanupOne.value, normalCleanupTwo.done, normalCleanupTwo.value, normalDone.done, normalDone.value);

const thrown = caughtThrow();
const thrownFirst: any = thrown.next();
const thrownRecoveryOne: any = thrown.throw("source-throw");
const thrownRecoveryTwo: any = thrown.next("one-resume");
const thrownCleanupOne: any = thrown.next("two-resume");
const thrownCleanupTwo: any = thrown.next("cleanup-one-resume");
let thrownValue: any;
try {
    thrown.next("cleanup-two-resume");
} catch (error: any) {
    thrownValue = error;
}
console.log("throw", thrownFirst.done, thrownFirst.value, thrownRecoveryOne.done, thrownRecoveryOne.value, thrownRecoveryTwo.done, thrownRecoveryTwo.value, thrownCleanupOne.done, thrownCleanupOne.value, thrownCleanupTwo.done, thrownCleanupTwo.value, thrownValue);

const closed = caughtThrow();
const closedFirst: any = closed.next();
const closedRecovery: any = closed.throw("source-throw");
const closedCleanupOne: any = closed.return("closed");
const closedCleanupTwo: any = closed.next("cleanup-one-resume");
const closedDone: any = closed.next("cleanup-two-resume");
console.log("close", closedFirst.done, closedFirst.value, closedRecovery.done, closedRecovery.value, closedCleanupOne.done, closedCleanupOne.value, closedCleanupTwo.done, closedCleanupTwo.value, closedDone.done, closedDone.value);
