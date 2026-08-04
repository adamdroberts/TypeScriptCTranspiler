function* caught(): Generator<string, string, string> {
    try {
        yield "source";
    } catch {
        return "caught";
    } finally {
        yield "cleanup-one";
        yield "cleanup-two";
    }
    return "normal";
}

const normal = caught();
const normalFirst: any = normal.next();
const normalSecond: any = normal.next("source-resume");
const normalThird: any = normal.next("cleanup-one-resume");
const normalDone: any = normal.next("cleanup-two-resume");
console.log("catch-finally-yield-normal:", normalFirst.done, normalFirst.value, normalSecond.done, normalSecond.value, normalThird.done, normalThird.value, normalDone.done, normalDone.value);

const thrown = caught();
const thrownFirst: any = thrown.next();
const thrownSecond: any = thrown.throw("source-throw");
const thrownThird: any = thrown.next("cleanup-one-throw");
const thrownDone: any = thrown.next("cleanup-two-throw");
console.log("catch-finally-yield-throw:", thrownFirst.done, thrownFirst.value, thrownSecond.done, thrownSecond.value, thrownThird.done, thrownThird.value, thrownDone.done, thrownDone.value);

const closed = caught();
const closedFirst: any = closed.next();
const closedSecond: any = closed.return("closed");
const closedThird: any = closed.next("cleanup-one-close");
const closedDone: any = closed.next("cleanup-two-close");
console.log("catch-finally-yield-close:", closedFirst.done, closedFirst.value, closedSecond.done, closedSecond.value, closedThird.done, closedThird.value, closedDone.done, closedDone.value);

function* caughtStar(): Generator<string, string, string> {
    try {
        yield "star-source";
    } catch {
        return "star-caught";
    } finally {
        yield* (["star-one", "star-two"] as any);
    }
    return "star-normal";
}

const starNormal = caughtStar();
const starNormalFirst: any = starNormal.next();
const starNormalSecond: any = starNormal.next("source-resume");
const starNormalThird: any = starNormal.next("one-resume");
const starNormalDone: any = starNormal.next("two-resume");
console.log("catch-finally-yield-star-normal:", starNormalFirst.done, starNormalFirst.value, starNormalSecond.done, starNormalSecond.value, starNormalThird.done, starNormalThird.value, starNormalDone.done, starNormalDone.value);

const starThrow = caughtStar();
const starThrowFirst: any = starThrow.next();
const starThrowSecond: any = starThrow.throw("source-throw");
const starThrowThird: any = starThrow.next("one-throw");
const starThrowDone: any = starThrow.next("two-throw");
console.log("catch-finally-yield-star-throw:", starThrowFirst.done, starThrowFirst.value, starThrowSecond.done, starThrowSecond.value, starThrowThird.done, starThrowThird.value, starThrowDone.done, starThrowDone.value);

function* caughtThrow(): Generator<string, string, string> {
    try {
        yield "throw-source";
    } catch {
        throw "caught-throw";
    } finally {
        yield "throw-cleanup-one";
        yield "throw-cleanup-two";
    }
    return "throw-normal";
}

const throwNormal = caughtThrow();
const throwNormalFirst: any = throwNormal.next();
const throwNormalSecond: any = throwNormal.next("source-resume");
const throwNormalThird: any = throwNormal.next("one-resume");
const throwNormalDone: any = throwNormal.next("two-resume");
console.log("catch-finally-yield-throw-normal:", throwNormalFirst.done, throwNormalFirst.value, throwNormalSecond.done, throwNormalSecond.value, throwNormalThird.done, throwNormalThird.value, throwNormalDone.done, throwNormalDone.value);

const throwThrow = caughtThrow();
const throwThrowFirst: any = throwThrow.next();
const throwThrowSecond: any = throwThrow.throw("source-throw");
const throwThrowThird: any = throwThrow.next("one-throw");
let throwThrowValue: any;
try {
    throwThrow.next("two-throw");
} catch (error: any) {
    throwThrowValue = error;
}
console.log("catch-finally-yield-throw-throw:", throwThrowFirst.done, throwThrowFirst.value, throwThrowSecond.done, throwThrowSecond.value, throwThrowThird.done, throwThrowThird.value, throwThrowValue);

function* caughtBodyThenReturn(): Generator<string, string, string> {
    try {
        yield "tail-source";
    } catch {
        return "tail-caught";
    } finally {
        yield "tail-cleanup";
        return (yield "tail-left") + (yield "tail-right");
    }
}

const tailNormal = caughtBodyThenReturn();
const tailNormalFirst: any = tailNormal.next();
const tailNormalSecond: any = tailNormal.next("source-resume");
const tailNormalThird: any = tailNormal.next("left-resume");
const tailNormalFourth: any = tailNormal.next("right-resume");
const tailNormalDone: any = tailNormal.next("tail-return-resume");
console.log("catch-finally-yield-tail-normal:", tailNormalFirst.done, tailNormalFirst.value, tailNormalSecond.done, tailNormalSecond.value, tailNormalThird.done, tailNormalThird.value, tailNormalFourth.done, tailNormalFourth.value, tailNormalDone.done, tailNormalDone.value);

const tailThrow = caughtBodyThenReturn();
const tailThrowFirst: any = tailThrow.next();
const tailThrowSecond: any = tailThrow.throw("source-throw");
const tailThrowThird: any = tailThrow.next("left-throw");
const tailThrowFourth: any = tailThrow.next("right-throw");
const tailThrowDone: any = tailThrow.next("tail-return-throw");
console.log("catch-finally-yield-tail-throw:", tailThrowFirst.done, tailThrowFirst.value, tailThrowSecond.done, tailThrowSecond.value, tailThrowThird.done, tailThrowThird.value, tailThrowFourth.done, tailThrowFourth.value, tailThrowDone.done, tailThrowDone.value);

const tailClosed = caughtBodyThenReturn();
const tailClosedFirst: any = tailClosed.next();
const tailClosedSecond: any = tailClosed.return("closed");
const tailClosedThird: any = tailClosed.next("left-close");
const tailClosedFourth: any = tailClosed.next("right-close");
const tailClosedDone: any = tailClosed.next("tail-return-close");
console.log("catch-finally-yield-tail-close:", tailClosedFirst.done, tailClosedFirst.value, tailClosedSecond.done, tailClosedSecond.value, tailClosedThird.done, tailClosedThird.value, tailClosedFourth.done, tailClosedFourth.value, tailClosedDone.done, tailClosedDone.value);
