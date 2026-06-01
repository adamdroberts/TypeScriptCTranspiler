const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(label);
    return value;
}

function format(strings: TemplateStringsArray, value: string): string {
    events.push("format " + value);
    return strings[0] + value.toUpperCase() + strings[1];
}

function* flow(): Generator<any, string, any> {
    events.push("start");
    const first = format`tag ${yield 1}!`;
    events.push("first " + first);
    const second = String.raw`raw\n${yield 2}\t`;
    events.push("second " + second);
    return first + "|" + second;
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const r1: any = iter.next(mark("ignored", "unused"));
const r2: any = iter.next(mark("alpha", "go"));
const r3: any = iter.next(mark("beta", "done"));

console.log("steps:", r1.done, r1.value, r2.done, r2.value, r3.done, r3.value);
console.log("events:", events.join("|"));
