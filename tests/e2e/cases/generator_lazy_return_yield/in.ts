const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

function* confirm(label: string): Generator<string, string, string> {
    events.push(label + " start");
    return yield label + " ready";
}

const iter = confirm("R");
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored first"));
const done: any = iter.next(mark("answer"), mark("extra"));
const after: any = iter.next(mark("after"));

console.log("steps:", first.done, first.value, done.done, done.value, after.done, String(after.value));
console.log("events:", events.join("|"));
