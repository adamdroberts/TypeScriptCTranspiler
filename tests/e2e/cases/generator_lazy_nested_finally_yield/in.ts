function* nestedCleanup(): Generator<string, string, string> {
    try {
        try {
            yield "source";
        } finally {
            yield "inner-one";
            yield "inner-two";
        }
    } finally {
        yield "outer-one";
        yield "outer-two";
    }
    return "done";
}

const normal = nestedCleanup();
const normalFirst: any = normal.next();
const normalSecond: any = normal.next("source-resume");
const normalThird: any = normal.next("inner-one-resume");
const normalFourth: any = normal.next("inner-two-resume");
const normalFifth: any = normal.next("outer-one-resume");
const normalDone: any = normal.next("outer-two-resume");
console.log("nested-finally-normal:", normalFirst.done, normalFirst.value, normalSecond.done, normalSecond.value, normalThird.done, normalThird.value, normalFourth.done, normalFourth.value, normalFifth.done, normalFifth.value, normalDone.done, normalDone.value);

const closed = nestedCleanup();
const closedFirst: any = closed.next();
const closedSecond: any = closed.return("closed");
const closedThird: any = closed.next("inner-one-close");
const closedFourth: any = closed.next("inner-two-close");
const closedFifth: any = closed.next("outer-one-close");
const closedDone: any = closed.next("outer-two-close");
console.log("nested-finally-close:", closedFirst.done, closedFirst.value, closedSecond.done, closedSecond.value, closedThird.done, closedThird.value, closedFourth.done, closedFourth.value, closedFifth.done, closedFifth.value, closedDone.done, closedDone.value);

const thrown = nestedCleanup();
const thrownFirst: any = thrown.next();
const thrownSecond: any = thrown.throw("original-throw");
const thrownThird: any = thrown.next("inner-one-throw");
const thrownFourth: any = thrown.next("inner-two-throw");
const thrownFifth: any = thrown.next("outer-one-throw");
let thrownValue: any;
try {
    thrown.next("outer-two-throw");
} catch (error: any) {
    thrownValue = error;
}
console.log("nested-finally-throw:", thrownFirst.done, thrownFirst.value, thrownSecond.done, thrownSecond.value, thrownThird.done, thrownThird.value, thrownFourth.done, thrownFourth.value, thrownFifth.done, thrownFifth.value, thrownValue);
