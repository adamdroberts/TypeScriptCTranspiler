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
