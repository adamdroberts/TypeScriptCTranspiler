let events: string[] = [];

function* route(kind: string): Generator<string, string, number> {
    events.push("start:" + kind);
    let total = 0;

    switch (kind) {
        case "alpha":
            events.push("alpha-before");
            const a = yield "yield-alpha";
            total += a;
            events.push("alpha-after:" + total);
        case "beta":
            events.push("beta-before");
            const b = yield "yield-beta";
            total += b * 2;
            events.push("beta-after:" + total);
            break;
        default:
            events.push("default-before");
            const c = yield "yield-default";
            total += c * 3;
            events.push("default-after:" + total);
            break;
    }

    events.push("done:" + total);
    return "total-" + total;
}

function run(kind: string, values: number[]) {
    events = [];
    const iter = route(kind);
    let step = iter.next();
    console.log(kind, step.done, step.value);
    for (const value of values) {
        step = iter.next(value);
        console.log(kind, step.done, step.value);
    }
    console.log(events.join("|"));
}

run("alpha", [3, 5]);
run("beta", [7]);
run("gamma", [11]);
