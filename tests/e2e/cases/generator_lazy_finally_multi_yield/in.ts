function* terminalReturn(): Generator<string, string, string> {
    try {
        yield "source";
    } finally {
        return (yield "return-left") + (yield "return-right");
    }
}

const returnIter = terminalReturn();
const returnFirst: any = returnIter.next();
const returnSecond: any = returnIter.next("source-resume");
const returnThird: any = returnIter.next("left");
const returnDone: any = returnIter.next("right");
console.log("finally-return-multi:", returnFirst.done, returnFirst.value, returnSecond.done, returnSecond.value, returnThird.done, returnThird.value, returnDone.done, returnDone.value);

function* terminalThrow(): Generator<string, string, string> {
    try {
        yield "throw-source";
    } finally {
        throw (yield "throw-left") + (yield "throw-right");
    }
}

const throwIter = terminalThrow();
const throwFirst: any = throwIter.next();
const throwSecond: any = throwIter.next("source-resume");
const throwThird: any = throwIter.next("left");
let throwValue: any;
try {
    throwIter.next("right");
} catch (error: any) {
    throwValue = error;
}
console.log("finally-throw-multi:", throwFirst.done, throwFirst.value, throwSecond.done, throwSecond.value, throwThird.done, throwThird.value, throwValue);
