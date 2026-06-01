const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(label);
    return value;
}

function combine(prefix: string, value: number): string {
    events.push("combine " + value);
    return prefix + ":" + value;
}

class Box {
    value: string;

    constructor(value: string) {
        events.push("box " + value);
        this.value = value;
    }
}

function* flow(): Generator<any, string, any> {
    events.push("start");
    const first = combine("call", yield 1);
    events.push("first " + first);

    const second = combine("second", yield 2);
    events.push("second " + second);

    const box = new Box(yield 3);
    events.push("boxed " + box.value);

    return first + "|" + second + "|" + box.value;
}

const iter = flow();
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const r1: any = iter.next(mark("ignored", 99));
const r2: any = iter.next(mark("alpha", 7));
const r3: any = iter.next(mark("beta", 12));
const r4: any = iter.next(mark("gamma", "tail"));

console.log("steps:", r1.done, r1.value, r2.done, r2.value, r3.done, r3.value, r4.done, r4.value);
console.log("events:", events.join("|"));
