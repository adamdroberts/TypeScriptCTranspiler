let events: string[] = [];

function* route(outer: string, inner: string): Generator<string, string, number> {
    events.push("start:" + outer + ":" + inner);
    let total = 1;

    switch (outer) {
        case "alpha":
            switch (inner) {
                case "one":
                    events.push("alpha-one-before");
                    const a = yield "yield-alpha-one";
                    total += a;
                    events.push("alpha-one-after:" + total);
                    break;
                case "two":
                    events.push("alpha-two-before");
                    const b = yield "yield-alpha-two";
                    total += b * 2;
                    events.push("alpha-two-after:" + total);
                    break;
            }
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

function run(outer: string, inner: string, value: number) {
    events = [];
    const iter = route(outer, inner);
    let step = iter.next();
    console.log(outer, inner, step.done, step.value);
    step = iter.next(value);
    console.log(outer, inner, step.done, step.value);
    console.log(events.join("|"));
}

run("alpha", "one", 4);
run("alpha", "two", 5);
run("beta", "one", 6);
