const events: string[] = [];

function mark(label: string): number {
    events.push(label);
    return 4;
}

function* numbers(start: number): Generator<number, string, undefined> {
    events.push("body start");
    let current = start;
    const step = mark("step init");
    yield current;
    current += step;
    events.push("after first " + current);
    yield current;
    current++;
    yield current + step;
    return "done " + current;
}

const iter = numbers(3);
console.log("created:", events.length === 0 ? "<empty>" : events.join("|"));

const first = iter.next();
console.log("first:", first.done, first.value, "events:", events.join("|"));

const mapped = (iter as any).map((value: number): number => value * 10);
console.log("mapped:", mapped.join(", "));
console.log("after map:", events.join("|"));

const second = iter.next();
const third = iter.next();
const done = iter.next();
console.log("rest:", second.done, second.value, third.done, third.value, done.done, done.value);
