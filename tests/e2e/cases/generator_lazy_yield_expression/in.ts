const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

function* decorate(label: string): Generator<string, string, string> {
    events.push(label + " start");
    const first = (yield label + " first") + "!";
    events.push("first " + first);
    let second = "";
    second = (yield first) + "?";
    events.push("second " + second);
    return (yield second) + ".";
}

const iter = decorate("E");
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored first"));
const second: any = iter.next(mark("alpha"), mark("alpha extra"));
const third: any = iter.next(mark("omega"));
const done: any = iter.next(mark("final"));
const after: any = iter.next(mark("after"));

console.log("steps:", first.done, first.value, second.done, second.value, third.done, third.value, done.done, done.value, after.done, String(after.value));
console.log("events:", events.join("|"));
