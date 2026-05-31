let events: string[] = [];

function* route(kind: string): Generator<string, string, number> {
    events.push("start:" + kind);
    let total = 1;

    switch (kind) {
        case "alpha": {
            events.push("alpha-before");
            const a = yield "yield-alpha";
            total += a;
            events.push("alpha-after:" + total);
            break;
        }
        case "beta": {
            events.push("beta-before");
            const b = yield "yield-beta";
            total += b * 2;
            events.push("beta-after:" + total);
            break;
        }
        default: {
            events.push("default-before");
            const c = yield "yield-default";
            total += c * 3;
            events.push("default-after:" + total);
            break;
        }
    }

    events.push("done:" + total);
    return "total-" + total;
}

function run(kind: string, value: number) {
    events = [];
    const iter = route(kind);
    let step = iter.next();
    console.log(kind, step.done, step.value);
    step = iter.next(value);
    console.log(kind, step.done, step.value);
    console.log(events.join("|"));
}

run("alpha", 4);
run("beta", 5);
run("gamma", 6);
