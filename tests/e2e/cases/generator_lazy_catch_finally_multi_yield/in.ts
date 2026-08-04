function* caughtReturn(): Generator<string, string, string> {
    try {
        yield "return-source";
    } catch {
        return "caught-return";
    } finally {
        return (yield "return-left") + (yield "return-right");
    }
}

const returnNormal = caughtReturn();
const returnNormalFirst: any = returnNormal.next();
const returnNormalSecond: any = returnNormal.next("source-resume");
const returnNormalThird: any = returnNormal.next("left");
const returnNormalDone: any = returnNormal.next("right");
console.log("catch-finally-return-normal:", returnNormalFirst.done, returnNormalFirst.value, returnNormalSecond.done, returnNormalSecond.value, returnNormalThird.done, returnNormalThird.value, returnNormalDone.done, returnNormalDone.value);

const returnThrow = caughtReturn();
const returnThrowFirst: any = returnThrow.next();
const returnThrowSecond: any = returnThrow.throw("source-throw");
const returnThrowThird: any = returnThrow.next("left");
const returnThrowDone: any = returnThrow.next("right");
console.log("catch-finally-return-throw:", returnThrowFirst.done, returnThrowFirst.value, returnThrowSecond.done, returnThrowSecond.value, returnThrowThird.done, returnThrowThird.value, returnThrowDone.done, returnThrowDone.value);

function* caughtThrow(): Generator<string, string, string> {
    try {
        yield "throw-source";
    } catch {
        throw "caught-throw";
    } finally {
        throw (yield "throw-left") + (yield "throw-right");
    }
}

const throwNormal = caughtThrow();
const throwNormalFirst: any = throwNormal.next();
const throwNormalSecond: any = throwNormal.next("source-resume");
const throwNormalThird: any = throwNormal.next("left");
let throwNormalValue: any;
try {
    throwNormal.next("right");
} catch (error: any) {
    throwNormalValue = error;
}
console.log("catch-finally-throw-normal:", throwNormalFirst.done, throwNormalFirst.value, throwNormalSecond.done, throwNormalSecond.value, throwNormalThird.done, throwNormalThird.value, throwNormalValue);

const throwThrow = caughtThrow();
const throwThrowFirst: any = throwThrow.next();
const throwThrowSecond: any = throwThrow.throw("source-throw");
const throwThrowThird: any = throwThrow.next("left");
let throwThrowValue: any;
try {
    throwThrow.next("right");
} catch (error: any) {
    throwThrowValue = error;
}
console.log("catch-finally-throw-throw:", throwThrowFirst.done, throwThrowFirst.value, throwThrowSecond.done, throwThrowSecond.value, throwThrowThird.done, throwThrowThird.value, throwThrowValue);
