let events: string[] = [];

function* choose(): Generator<string, string, boolean> {
    events.push("start");
    if (yield "condition") {
        events.push("then");
        if (yield "nested") {
            events.push("nested-true");
        } else {
            events.push("nested-false");
        }
    } else {
        events.push("else");
    }
    events.push("done");
    return "complete";
}

function* fallthrough(): Generator<string, string, boolean> {
    events.push("fallthrough-start");
    if (yield "optional") {
        events.push("selected");
    }
    events.push("fallthrough-done");
    return "fallthrough-complete";
}

function runChoose(label: string, values: boolean[]): void {
    events = [];
    const iterator = choose();
    let step: any = iterator.next();
    console.log(label, "first", step.done, step.value, events.join("|"));
    for (const value of values) {
        step = iterator.next(value);
        console.log(label, "next", step.done, step.value, events.join("|"));
    }
}

function runFallthrough(value: boolean): void {
    events = [];
    const iterator = fallthrough();
    const first: any = iterator.next();
    const done: any = iterator.next(value);
    console.log("fallthrough", first.done, first.value, done.done, done.value, events.join("|"));
}

runChoose("true/true", [true, true]);
runChoose("false", [false]);
runChoose("true/false", [true, false]);
runFallthrough(false);
