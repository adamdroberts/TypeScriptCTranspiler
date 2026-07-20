const events: string[] = [];

function* flow(): Generator<string, string, string> {
    events.push("start");
    try {
        events.push("try-before");
        const value = yield "pause";
        events.push("resumed:" + value);
    } finally {
        events.push("finally");
    }
    return "done";
}

const iter = flow();
const first: any = iter.next("ignored");
const done: any = iter.next("answer");
const after: any = iter.next("after");

console.log("steps:", first.done, first.value, done.done, done.value, after.done, after.value);
console.log("events:", events.join("|"));
