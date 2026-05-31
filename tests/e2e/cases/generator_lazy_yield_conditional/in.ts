const events: string[] = [];

function mark(label: string): boolean {
    events.push(label);
    return label.indexOf("yes") >= 0;
}

function* choose(label: string): Generator<string, string, boolean> {
    events.push(label + " start");
    const first = (yield label + " first") ? "YES" : "NO";
    events.push("first " + first);
    return first + ":" + ((yield label + " second") ? "again" : "stop");
}

const iter = choose("C");
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first: any = iter.next(mark("ignored yes"));
const second: any = iter.next(mark("yes branch"), mark("yes extra"));
const done: any = iter.next(mark("no branch"));
const after: any = iter.next(mark("after yes"));

console.log("steps:", first.done, first.value, second.done, second.value, done.done, done.value, after.done, String(after.value));
console.log("events:", events.join("|"));
