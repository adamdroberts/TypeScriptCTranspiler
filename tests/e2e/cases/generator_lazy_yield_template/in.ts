const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(label);
    return value;
}

function* flow(prefix: string): Generator<any, string, any> {
    events.push("start " + prefix);
    const first = `${prefix}:${yield 1}!`;
    events.push("first " + first);
    const second = `left ${prefix} ${yield 2} right`;
    events.push("second " + second);
    return first + "|" + second;
}

const iter = flow("T");
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const r1: any = iter.next(mark("ignored", "unused"));
const r2: any = iter.next(mark("alpha", "go"));
const r3: any = iter.next(mark("beta", "done"));

console.log("steps:", r1.done, r1.value, r2.done, r2.value, r3.done, r3.value);
console.log("events:", events.join("|"));
