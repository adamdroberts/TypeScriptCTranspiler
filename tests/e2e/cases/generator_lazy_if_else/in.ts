let events: string[] = [];

function* choose(first: boolean, second: boolean): Generator<string, string, number> {
    events.push("start");
    let total = 10;

    if (first) {
        events.push("then-1");
        const a = yield "yield-then";
        total += a;
        events.push("after-then:" + total);

        if (second) {
            events.push("then-2");
            const b = yield "yield-nested-then";
            total += b;
        } else {
            events.push("else-2");
            const c = yield "yield-nested-else";
            total += c;
        }
    } else {
        events.push("else-1");
        const d = yield "yield-else";
        total += d;
    }

    events.push("end:" + total);
    return "done-" + total;
}

function run(label: string, first: boolean, second: boolean, values: number[]) {
    events = [];
    console.log("-- " + label + " --");
    const iter = choose(first, second);
    let step = iter.next();
    console.log(step.done, step.value);
    for (const value of values) {
        step = iter.next(value);
        console.log(step.done, step.value);
    }
    console.log(events.join("|"));
}

run("then/then", true, true, [5, 7]);
run("then/else", true, false, [20, 30]);
run("else", false, true, [100]);
