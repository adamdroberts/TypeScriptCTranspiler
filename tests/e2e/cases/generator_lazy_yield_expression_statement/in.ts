const events: string[] = [];

function mark(label: string, value: string): string {
    events.push(label);
    return value;
}

function record(label: string, value: string): void {
    events.push(label + ":" + value);
}

function* flow(): Generator<string, string, string> {
    events.push("start");
    console.log("log", yield "first");
    record("record", yield "second");
    (yield "third").toUpperCase();
    events.push("after expr");
    return "done";
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored", "unused"));
const second: any = iter.next(mark("alpha", "alpha"));
const third: any = iter.next(mark("beta", "beta"));
const done: any = iter.next(mark("gamma", "gamma"));

console.log("steps:", first.done, first.value, second.done, second.value, third.done, third.value, done.done, done.value);
console.log("events:", events.join("|"));
