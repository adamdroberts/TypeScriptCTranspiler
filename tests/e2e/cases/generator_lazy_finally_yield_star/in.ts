function* cleanup(): Generator<string, string, string> {
    try {
        yield "source";
    } finally {
        yield* (["cleanup-one", "cleanup-two"] as any);
    }
    return "done";
}

const normal = cleanup();
const normalFirst: any = normal.next();
const normalSecond: any = normal.next("source-resume");
const normalThird: any = normal.next("cleanup-one-resume");
const normalDone: any = normal.next("cleanup-two-resume");
console.log("finally-yield-star-normal:", normalFirst.done, normalFirst.value, normalSecond.done, normalSecond.value, normalThird.done, normalThird.value, normalDone.done, normalDone.value);

const closed = cleanup();
const closedFirst: any = closed.next();
const closedSecond: any = closed.return("closed");
const closedThird: any = closed.next("cleanup-one-return");
const closedDone: any = closed.next("cleanup-two-return");
console.log("finally-yield-star-close:", closedFirst.done, closedFirst.value, closedSecond.done, closedSecond.value, closedThird.done, closedThird.value, closedDone.done, closedDone.value);

const thrown = cleanup();
const thrownFirst: any = thrown.next();
const thrownSecond: any = thrown.next("source-resume");
let thrownValue: any;
try {
    thrown.throw("finalizer-throw");
} catch (error: any) {
    thrownValue = error;
}
console.log("finally-yield-star-throw:", thrownFirst.done, thrownFirst.value, thrownSecond.done, thrownSecond.value, thrownValue);

const returned = cleanup();
const returnedFirst: any = returned.next();
const returnedSecond: any = returned.next("source-resume");
const returnedDone: any = returned.return("delegated-return");
console.log("finally-yield-star-active-return:", returnedFirst.done, returnedFirst.value, returnedSecond.done, returnedSecond.value, returnedDone.done, returnedDone.value);
