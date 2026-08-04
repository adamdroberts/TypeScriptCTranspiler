function* caughtArray(): Generator<string, string, string> {
    try {
        yield "source";
    } catch {
        yield* (["recovery-one", "recovery-two"] as any);
        return "caught-array";
    }
    return "normal-array";
}

const arrayThrown = caughtArray();
const arrayThrownFirst: any = arrayThrown.next();
const arrayThrownSecond: any = arrayThrown.throw("source-throw");
const arrayThrownThird: any = arrayThrown.next("one-resume");
const arrayThrownDone: any = arrayThrown.next("two-resume");
console.log("catch-yield-star-array:", arrayThrownFirst.done, arrayThrownFirst.value, arrayThrownSecond.done, arrayThrownSecond.value, arrayThrownThird.done, arrayThrownThird.value, arrayThrownDone.done, arrayThrownDone.value);

function* recoveryDelegate(): Generator<string, string, string> {
    yield "lazy-one";
    yield "lazy-two";
    return "lazy-result";
}

function* caughtLazy(): Generator<string, string, string> {
    try {
        yield "lazy-source";
    } catch {
        yield* recoveryDelegate();
        return "caught-lazy";
    }
    return "normal-lazy";
}

const lazyThrown = caughtLazy();
const lazyThrownFirst: any = lazyThrown.next();
const lazyThrownSecond: any = lazyThrown.throw("source-throw");
const lazyThrownThird: any = lazyThrown.next("one-resume");
const lazyThrownDone: any = lazyThrown.next("two-resume");
console.log("catch-yield-star-lazy:", lazyThrownFirst.done, lazyThrownFirst.value, lazyThrownSecond.done, lazyThrownSecond.value, lazyThrownThird.done, lazyThrownThird.value, lazyThrownDone.done, lazyThrownDone.value);

const arrayClosed = caughtArray();
const arrayClosedFirst: any = arrayClosed.next();
const arrayClosedSecond: any = arrayClosed.throw("source-throw");
const arrayClosedDone: any = arrayClosed.return("closed");
console.log("catch-yield-star-array-close:", arrayClosedFirst.done, arrayClosedFirst.value, arrayClosedSecond.done, arrayClosedSecond.value, arrayClosedDone.done, arrayClosedDone.value);

const lazyClosed = caughtLazy();
const lazyClosedFirst: any = lazyClosed.next();
const lazyClosedSecond: any = lazyClosed.throw("source-throw");
const lazyClosedDone: any = lazyClosed.return("closed");
console.log("catch-yield-star-lazy-close:", lazyClosedFirst.done, lazyClosedFirst.value, lazyClosedSecond.done, lazyClosedSecond.value, lazyClosedDone.done, lazyClosedDone.value);
