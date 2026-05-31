let events: string[] = [];

function* countDo(limit: number): Generator<string, string, number> {
    events.push("start");
    let total = 0;
    let i = 0;

    do {
        events.push("before:" + i + ":" + total);
        const delta = yield "yield-" + i;
        total += delta;
        events.push("after:" + i + ":" + total);
        if (total > 5) {
            break;
        }
        i++;
    } while (i < limit);

    events.push("done:" + total + ":" + i);
    return "total-" + total;
}

function* runOnce(): Generator<string, string, number> {
    let seen = 0;
    do {
        seen++;
        yield "once-" + seen;
    } while (false);
    return "seen-" + seen;
}

const iter = countDo(4);
let step = iter.next();
console.log(step.done, step.value);
step = iter.next(2);
console.log(step.done, step.value);
step = iter.next(4);
console.log(step.done, step.value);
console.log(events.join("|"));

const once = runOnce();
step = once.next();
console.log(step.done, step.value);
step = once.next(0);
console.log(step.done, step.value);
