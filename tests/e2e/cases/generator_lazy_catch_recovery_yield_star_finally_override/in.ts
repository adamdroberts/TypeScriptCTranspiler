function* caughtReturnOverride(): Generator<any, string, any> {
    try {
        yield "source";
    } catch {
        yield* (["recovery-one", "recovery-two"] as any);
        return "caught";
    } finally {
        return (yield "left") + (yield "right");
    }
}

const returnNormal = caughtReturnOverride();
const returnNormalFirst: any = returnNormal.next();
const returnNormalLeft: any = returnNormal.next("source-resume");
const returnNormalRight: any = returnNormal.next("left-resume");
const returnNormalDone: any = returnNormal.next("right-resume");
console.log("return-normal", returnNormalFirst.value, returnNormalLeft.value, returnNormalRight.value, returnNormalDone.done, returnNormalDone.value);

const returnThrow = caughtReturnOverride();
const returnThrowFirst: any = returnThrow.next();
const returnThrowRecoveryOne: any = returnThrow.throw("source-throw");
const returnThrowRecoveryTwo: any = returnThrow.next("one-resume");
const returnThrowLeft: any = returnThrow.next("two-resume");
const returnThrowRight: any = returnThrow.next("left-resume");
const returnThrowDone: any = returnThrow.next("right-resume");
console.log("return-throw", returnThrowFirst.value, returnThrowRecoveryOne.value, returnThrowRecoveryTwo.value, returnThrowLeft.value, returnThrowRight.value, returnThrowDone.done, returnThrowDone.value);

const returnClose = caughtReturnOverride();
const returnCloseFirst: any = returnClose.next();
const returnCloseRecovery: any = returnClose.throw("source-throw");
const returnCloseLeft: any = returnClose.return("closed");
const returnCloseRight: any = returnClose.next("right-resume");
const returnCloseDone: any = returnClose.next("extra-resume");
console.log("return-close", returnCloseFirst.value, returnCloseRecovery.value, returnCloseLeft.value, returnCloseRight.value, returnCloseDone.done, returnCloseDone.value);

function* caughtThrowOverride(): Generator<any, string, any> {
    try {
        yield "source";
    } catch {
        yield* (["recovery-one", "recovery-two"] as any);
        return "caught";
    } finally {
        throw (yield "left") + (yield "right");
    }
}

const throwNormal = caughtThrowOverride();
const throwNormalFirst: any = throwNormal.next();
const throwNormalLeft: any = throwNormal.next("source-resume");
const throwNormalRight: any = throwNormal.next("left-resume");
let throwNormalValue: any;
try {
    throwNormal.next("right-resume");
} catch (error: any) {
    throwNormalValue = error;
}
console.log("throw-normal", throwNormalFirst.value, throwNormalLeft.value, throwNormalRight.value, throwNormalValue);

const throwThrow = caughtThrowOverride();
const throwThrowFirst: any = throwThrow.next();
const throwThrowRecoveryOne: any = throwThrow.throw("source-throw");
const throwThrowRecoveryTwo: any = throwThrow.next("one-resume");
const throwThrowLeft: any = throwThrow.next("two-resume");
const throwThrowRight: any = throwThrow.next("left-resume");
let throwThrowValue: any;
try {
    throwThrow.next("right-resume");
} catch (error: any) {
    throwThrowValue = error;
}
console.log("throw-throw", throwThrowFirst.value, throwThrowRecoveryOne.value, throwThrowRecoveryTwo.value, throwThrowLeft.value, throwThrowRight.value, throwThrowValue);

const throwClose = caughtThrowOverride();
const throwCloseFirst: any = throwClose.next();
const throwCloseRecovery: any = throwClose.throw("source-throw");
const throwCloseLeft: any = throwClose.return("closed");
const throwCloseRight: any = throwClose.next("right-resume");
let throwCloseValue: any;
try {
    throwClose.next("extra-resume");
} catch (error: any) {
    throwCloseValue = error;
}
console.log("throw-close", throwCloseFirst.value, throwCloseRecovery.value, throwCloseLeft.value, throwCloseRight.value, throwCloseValue);
