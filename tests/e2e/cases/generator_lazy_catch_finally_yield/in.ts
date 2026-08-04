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
