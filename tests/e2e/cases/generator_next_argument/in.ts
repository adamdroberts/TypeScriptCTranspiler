const events: string[] = [];

function mark(label: string): undefined {
    events.push(label);
}

function* values(): Generator<number, string, undefined> {
    events.push("body");
    yield 1;
    yield 2;
    return "done";
}

const iter = values();
const first: any = iter.next(mark("first"));
const second: any = iter.next(mark("second"), mark("second-extra"));
const third: any = iter.next(mark("third"), mark("third-extra-a"), mark("third-extra-b"));

console.log("steps:", first.done, first.value, second.done, second.value, third.done, String(third.value));
console.log("events:", events.join("|"));
