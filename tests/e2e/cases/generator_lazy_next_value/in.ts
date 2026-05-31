const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

function* dialog(label: string): Generator<string, string, string> {
    events.push(label + " start");
    const first = yield label + " question";
    events.push(label + " got " + first);
    let second = "";
    second = yield first + "?";
    events.push(label + " done " + second);
    return second + "!";
}

const typed = dialog("T");
const typedFirst: any = typed.next(mark("ignored first"));
const typedSecond: any = typed.next(mark("alpha"));
const typedDone: any = typed.next(mark("omega"), mark("typed extra"));
console.log("typed:", typedFirst.done, typedFirst.value, typedSecond.done, typedSecond.value, typedDone.done, typedDone.value);

console.log("events:", events.join("|"));
